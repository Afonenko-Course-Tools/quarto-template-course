"""Finite public handoff for the sequential Pages CI jobs (Python stdlib only)."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile

FULL_TREES = ("_site-full", "examples/cloud/_output/full", "examples/prairielearn/_output/full")
STUDENT_TREES = ("_site-student", "examples/cloud/_output/student", "examples/prairielearn/_output/student")
VERSIONS = ("1.10.18", "1.11.5")
PRIVATE = {".git", ".quarto", ".qrc", ".course-owner", ".project-publish", "_freeze"}


class PagesCIError(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise PagesCIError(message)


def wire(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode()


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def valid_hash(value, length=64):
    return isinstance(value, str) and re.fullmatch("[0-9a-f]{%d}" % length, value) is not None


def safe_name(name, public=False):
    require(isinstance(name, str) and name and "\\" not in name and "\0" not in name, "Invalid entry path")
    path = PurePosixPath(name)
    require(not path.is_absolute() and str(path) == name and all(p not in (".", "..") for p in path.parts), "Noncanonical entry path")
    if public:
        require(not PRIVATE.intersection(path.parts), "Private state in public entry")
    return path


def no_links(path):
    """Check existing ancestors, including the final component, without following links."""
    path = Path(os.path.abspath(path))
    for ancestor in (*reversed(path.parents), path):
        if ancestor.exists() or ancestor.is_symlink():
            require(not ancestor.is_symlink(), "Linked path component")
            if ancestor != path:
                require(ancestor.is_dir(), "Non-directory path component")
    return path


def artifact_path(root, artifact, fresh=False):
    root = no_links(root)
    artifact = no_links(artifact)
    require(artifact != root and root not in artifact.parents and artifact not in root.parents,
            "Artifact must be outside Source and its ancestors")
    if fresh:
        require(not artifact.exists(), "Artifact destination already exists")
    return artifact


def validate_identity(identity):
    require(isinstance(identity, dict) and set(identity) == {"source", "version", "repository", "run_id", "run_attempt"}, "Invalid identity fields")
    require(identity["version"] in VERSIONS, "Unsupported Quarto version")
    require(isinstance(identity["repository"], str) and re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", identity["repository"]), "Invalid repository")
    require(isinstance(identity["run_id"], str) and re.fullmatch(r"[1-9][0-9]*", identity["run_id"]), "Invalid workflow run ID")
    require(type(identity["run_attempt"]) is int and identity["run_attempt"] > 0, "Invalid workflow run attempt")
    source = identity["source"]
    require(isinstance(source, dict) and set(source) == {"head", "tree", "files"}, "Invalid Source fields")
    require(valid_hash(source["head"], 40) and valid_hash(source["tree"], 40), "Invalid Source commit/tree")
    require(isinstance(source["files"], dict) and source["files"], "Empty Source map")
    for name, entry in source["files"].items():
        safe_name(name)
        require(isinstance(entry, dict) and set(entry) == {"sha256", "git_mode"} and valid_hash(entry["sha256"]) and entry["git_mode"] in ("100644", "100755"), "Invalid Source file map")


def source_identity(root):
    root = no_links(root)
    def git(*args):
        return subprocess.check_output(["git", *args], cwd=root)
    head = git("rev-parse", "HEAD").decode().strip()
    tree = git("rev-parse", "HEAD^{tree}").decode().strip()
    require(valid_hash(head, 40) and valid_hash(tree, 40), "Invalid checkout commit/tree")
    require(not git("status", "--porcelain", "-z", "--untracked-files=normal"), "Source has staged, modified or untracked files")
    listing = git("ls-tree", "-rz", "--full-tree", "HEAD")
    files = {}
    for record in listing.split(b"\0"):
        if not record:
            continue
        metadata, raw_name = record.split(b"\t", 1)
        mode, kind, blob = metadata.decode().split()
        name = raw_name.decode("utf-8")
        safe_name(name)
        require(mode in ("100644", "100755") and kind == "blob" and valid_hash(blob, 40), "Source contains a non-regular tracked entry")
        path = no_links(root / name)
        info = path.lstat()
        require(stat.S_ISREG(info.st_mode), "Source file is not regular")
        require(bool(info.st_mode & stat.S_IXUSR) == (mode == "100755") and
                (mode != "100644" or not info.st_mode & 0o111), "Source executable mode differs from commit")
        data = path.read_bytes()
        require(hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest() == blob, "Source bytes differ from commit")
        files[name] = {"sha256": hashlib.sha256(data).hexdigest(), "git_mode": mode}
    require(files, "Source map is empty")
    return {"head": head, "tree": tree, "files": files}


def run_profile(root, profile, quarto, run_command=None):
    run_command = run_command or subprocess.run
    require(profile in ("full", "student"), "Unknown Pages profile")
    for target in (None, "cloud", "prairielearn"):
        args = ([quarto, "run", "tests/render-example.ts", "--example", target, "--profile", profile]
                if target else [quarto, "render", "--profile", profile, "--fail-if-warnings"])
        result = run_command(args, cwd=root)
        require(result.returncode == 0, "Pages render failed for " + (target or "root"))


def verify_quarto(quarto, version, run_command=None):
    run_command = run_command or subprocess.run
    require(version in VERSIONS, "Unsupported Quarto version")
    result = run_command([quarto, "--version"], stdout=subprocess.PIPE, text=True)
    require(result.returncode == 0 and isinstance(result.stdout, str) and result.stdout.strip() == version,
            "Actual Quarto version differs from requested version")


def public_map(root, trees):
    root = no_links(root)
    entries = {}
    def visit(path, name):
        safe_name(name, public=True)
        info = path.lstat()
        mode = stat.S_IMODE(info.st_mode)
        require(mode <= 0o777, "Special permission bits in publication")
        if stat.S_ISDIR(info.st_mode):
            entries[name] = {"type": "directory", "mode": mode, "size": 0, "sha256": None}
            for child in sorted(path.iterdir(), key=lambda p: p.name):
                visit(child, name + "/" + child.name)
        else:
            require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, "Publication contains a link or special entry")
            entries[name] = {"type": "file", "mode": mode, "size": info.st_size, "sha256": digest(path)}
    for tree in trees:
        path = no_links(root / tree)
        require(path.is_dir(), "Public tree missing")
        visit(path, tree)
    return entries


def trees_for(phase):
    require(phase in ("full", "pair"), "Invalid artifact phase")
    return FULL_TREES if phase == "full" else FULL_TREES + STUDENT_TREES


def fresh_trees(root, trees):
    for tree in trees:
        path = no_links(Path(root) / tree)
        require(not path.exists(), "Public destination already exists")


def validate_entries(entries, trees):
    require(isinstance(entries, dict) and entries, "Empty publication map")
    for name, entry in entries.items():
        safe_name(name, public=True)
        require(any(name == tree or name.startswith(tree + "/") for tree in trees), "Extra publication path")
        require(isinstance(entry, dict) and set(entry) == {"type", "mode", "size", "sha256"}, "Invalid publication entry fields")
        require(type(entry["mode"]) is int and 0 <= entry["mode"] <= 0o777 and type(entry["size"]) is int and entry["size"] >= 0, "Invalid publication mode or size")
        require((entry["type"] == "directory" and entry["size"] == 0 and entry["sha256"] is None) or
                (entry["type"] == "file" and valid_hash(entry["sha256"])), "Invalid publication type or digest")
        if name not in trees:
            parent = str(PurePosixPath(name).parent)
            require(parent in entries and entries[parent]["type"] == "directory", "Missing publication ancestor")
    require(all(tree in entries and entries[tree]["type"] == "directory" for tree in trees), "Missing public tree")


def full_subset(entries):
    return {name: entry for name, entry in entries.items()
            if any(name == tree or name.startswith(tree + "/") for tree in FULL_TREES)}


def validate_manifest(manifest, identity, phase):
    validate_identity(identity)
    fields = {"protocol", "phase", "identity", "trees", "entries", "archive_sha256"}
    require(isinstance(manifest, dict) and set(manifest) == fields | ({"parent_full"} if phase == "pair" else set()), "Invalid manifest fields")
    require(type(manifest["protocol"]) is int and manifest["protocol"] == 1 and manifest["phase"] == phase, "Artifact phase mismatch")
    validate_identity(manifest["identity"])
    require(manifest["identity"] == identity, "Artifact Source/channel/run binding mismatch")
    require(manifest["trees"] == list(trees_for(phase)) and valid_hash(manifest["archive_sha256"]), "Invalid artifact trees or digest")
    validate_entries(manifest["entries"], trees_for(phase))
    if phase == "pair":
        parent = manifest["parent_full"]
        require(isinstance(parent, dict) and set(parent) == {"entries", "manifest_sha256", "archive_sha256"}, "Invalid full-parent fields")
        validate_entries(parent["entries"], FULL_TREES)
        require(valid_hash(parent["archive_sha256"]) and valid_hash(parent["manifest_sha256"]), "Invalid full-parent digests")
        require(full_subset(manifest["entries"]) == parent["entries"], "Student changed full publication")
        full = {"protocol": 1, "phase": "full", "identity": identity, "trees": list(FULL_TREES),
                "entries": parent["entries"], "archive_sha256": parent["archive_sha256"]}
        require(hashlib.sha256(wire(full)).hexdigest() == parent["manifest_sha256"], "Full-parent manifest digest differs")


def pack_publications(root, artifact, identity, phase, parent=None):
    validate_identity(identity)
    artifact = artifact_path(root, artifact, fresh=True)
    trees = trees_for(phase)
    entries = public_map(root, trees)
    manifest = {"protocol": 1, "phase": phase, "identity": identity, "trees": list(trees),
                "entries": entries, "archive_sha256": "0" * 64}
    if phase == "pair":
        validate_manifest(parent, identity, "full")
        require(full_subset(entries) == parent["entries"], "Student changed full publication")
        manifest["parent_full"] = {"entries": parent["entries"], "manifest_sha256": hashlib.sha256(wire(parent)).hexdigest(),
                                   "archive_sha256": parent["archive_sha256"]}
    else:
        require(parent is None, "Unexpected full-parent manifest")
    validate_manifest(manifest, identity, phase)
    artifact.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix="pages-artifact-", dir=artifact.parent))
    try:
        archive = temporary / "publications.tar.gz"
        with tarfile.open(archive, "w:gz", format=tarfile.PAX_FORMAT) as stream:
            for name, entry in sorted(entries.items()):
                member = tarfile.TarInfo(name)
                member.type = tarfile.DIRTYPE if entry["type"] == "directory" else tarfile.REGTYPE
                member.mode = entry["mode"]; member.size = entry["size"]
                if member.isfile():
                    with (Path(root) / name).open("rb") as source:
                        stream.addfile(member, source)
                else:
                    stream.addfile(member)
        require(public_map(root, trees) == entries, "Publications changed while packing")
        manifest["archive_sha256"] = digest(archive)
        (temporary / "manifest.json").write_bytes(wire(manifest))
        temporary.rename(artifact)
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)
    return manifest


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplicate JSON key")
        result[key] = value
    return result


@contextmanager
def read_artifact(root, artifact, identity, phase):
    artifact = artifact_path(root, artifact)
    require(artifact.is_dir() and {p.name for p in artifact.iterdir()} == {"manifest.json", "publications.tar.gz"}, "Artifact must contain exactly manifest and archive")
    for name in ("manifest.json", "publications.tar.gz"):
        info = (artifact / name).lstat()
        require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1, "Linked or non-regular artifact file")
    raw = (artifact / "manifest.json").read_bytes()
    manifest = json.loads(raw, object_pairs_hook=unique_object)
    validate_manifest(manifest, identity, phase)
    require(raw == wire(manifest), "Noncanonical manifest encoding")
    archive = artifact / "publications.tar.gz"
    # A private temporary file holds only the public archive. Validation and
    # materialization read the same snapshot, even if the download is replaced.
    with tempfile.TemporaryFile(dir=artifact.parent) as snapshot:
        archive_digest = hashlib.sha256()
        with archive.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                archive_digest.update(chunk); snapshot.write(chunk)
        require(archive_digest.hexdigest() == manifest["archive_sha256"], "Archive digest differs")
        snapshot.seek(0)
        found = set()
        with tarfile.open(fileobj=snapshot, mode="r:gz") as stream:
            for member in stream:
                name = member.name
                safe_name(name, public=True)
                require(name not in found and name in manifest["entries"], "Duplicate or extra archive member")
                found.add(name)
                entry = manifest["entries"][name]
                require((member.type == tarfile.DIRTYPE and entry["type"] == "directory") or
                        (member.type == tarfile.REGTYPE and entry["type"] == "file"), "Linked or special archive member")
                require(not member.linkname and not (set(member.pax_headers) - {"path"}), "Unsupported archive metadata")
                require(member.mode == entry["mode"] and member.size == entry["size"], "Archive member mode or size differs")
                if member.isreg():
                    content_digest = hashlib.sha256()
                    with stream.extractfile(member) as content:
                        for chunk in iter(lambda: content.read(1024 * 1024), b""):
                            content_digest.update(chunk)
                    require(content_digest.hexdigest() == entry["sha256"], "Archive member bytes differ")
            require(found == set(manifest["entries"]), "Missing archive member")
            yield manifest, stream


def restore_publications(root, artifact, identity, phase):
    root = no_links(root)
    trees = trees_for(phase)
    with read_artifact(root, artifact, identity, phase) as (manifest, stream):
        fresh_trees(root, trees)
        for name, entry in sorted(manifest["entries"].items(), key=lambda item: item[0].count("/")):
            if entry["type"] == "directory":
                (root / name).mkdir(parents=True, mode=0o700)
        for member in stream.getmembers():
            if member.isreg():
                path = root / member.name
                with path.open("xb") as destination, stream.extractfile(member) as source:
                    shutil.copyfileobj(source, destination)
                path.chmod(member.mode)
        for name, entry in sorted(manifest["entries"].items(), key=lambda item: item[0].count("/"), reverse=True):
            if entry["type"] == "directory":
                (root / name).chmod(entry["mode"])
        require(public_map(root, trees) == manifest["entries"], "Restored publication map differs")
    return manifest


def check_pair(root, baseline, identity, quarto, run_command=None, source_check=None):
    run_command = run_command or subprocess.run
    restore_publications(root, baseline, identity, "pair")
    if source_check is not None:
        source_check()
    result = run_command([quarto, "run", "tests/check.ts", "--skip-render"], cwd=root)
    require(result.returncode == 0, "Pages assertions failed")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("full", "student", "check"))
    parser.add_argument("--artifact", type=Path)
    parser.add_argument("--baseline", type=Path)
    parser.add_argument("--version", required=True, choices=VERSIONS)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--run-attempt", required=True, type=int)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--quarto", default=os.environ.get("QUARTO", "quarto"))
    args = parser.parse_args(argv)
    require((args.phase == "full" and args.artifact is not None and args.baseline is None) or
            (args.phase == "student" and args.artifact is not None and args.baseline is not None) or
            (args.phase == "check" and args.artifact is None and args.baseline is not None), "Invalid phase arguments")
    root = no_links(args.root)
    if args.artifact is not None:
        artifact_path(root, args.artifact, fresh=True)
    identity = {"source": source_identity(root), "version": args.version, "repository": args.repository,
                "run_id": args.run_id, "run_attempt": args.run_attempt}
    validate_identity(identity)
    verify_quarto(args.quarto, args.version)
    def unchanged():
        require(source_identity(root) == identity["source"], "Source changed during Pages phase")
    unchanged()
    if args.phase == "full":
        fresh_trees(root, FULL_TREES + STUDENT_TREES)
        run_profile(root, "full", args.quarto)
        unchanged()
        pack_publications(root, args.artifact, identity, "full")
    elif args.phase == "student":
        fresh_trees(root, STUDENT_TREES)
        parent = restore_publications(root, args.baseline, identity, "full")
        unchanged()
        run_profile(root, "student", args.quarto)
        unchanged()
        pack_publications(root, args.artifact, identity, "pair", parent)
    else:
        check_pair(root, args.baseline, identity, args.quarto, source_check=unchanged)
    unchanged()
    print("Pages " + args.phase + " phase verified")


if __name__ == "__main__":
    try:
        main()
    except (PagesCIError, OSError, ValueError, subprocess.SubprocessError, tarfile.TarError) as error:
        print("Pages CI refused: " + str(error), file=sys.stderr)
        sys.exit(1)
