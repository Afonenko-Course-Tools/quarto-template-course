"""Finite Pages runner/transport tests; native Quarto is never invoked here."""
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True

RUNNER = Path(__file__).with_name("pages-ci.py")
FULL = ("_site-full", "examples/cloud/_output/full", "examples/prairielearn/_output/full")
STUDENT = ("_site-student", "examples/cloud/_output/student", "examples/prairielearn/_output/student")


def load_runner():
    spec = importlib.util.spec_from_file_location("pages_ci", RUNNER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def wire(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


class PagesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ci = load_runner()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "source"
        self.root.mkdir()
        self.identity = {
            "source": {"head": "a" * 40, "tree": "b" * 40,
                       "files": {"README.md": {"sha256": hashlib.sha256(b"source").hexdigest(),
                                                "git_mode": "100644"}}},
            "version": "1.10.18", "repository": "owner/course", "run_id": "123", "run_attempt": 1,
        }

    def publications(self, root, trees):
        for tree in trees:
            directory = root / tree
            directory.mkdir(parents=True)
            (directory / "index.html").write_bytes(b"<html>current publication</html>")
            (directory / ".nojekyll").write_bytes(b"")
            (directory / "empty").mkdir(mode=0o700)
            (directory / "index.html").chmod(0o640)

    def full_artifact(self):
        # Each mutation subtest gets an independent fixture, even after RED.
        shutil.rmtree(self.root); self.root.mkdir()
        self.publications(self.root, FULL)
        artifact = self.base / "full-artifact"
        if artifact.exists(): shutil.rmtree(artifact)
        manifest = self.ci.pack_publications(self.root, artifact, self.identity, "full")
        return artifact, manifest

    def mutate_archive(self, artifact, mutate):
        archive = artifact / "publications.tar.gz"
        with tarfile.open(archive, "r:gz") as stream:
            members = [(copy.copy(m), stream.extractfile(m).read() if m.isfile() else None)
                       for m in stream]
        members = mutate(members)
        with tarfile.open(archive, "w:gz", format=tarfile.PAX_FORMAT) as stream:
            for member, data in members:
                stream.addfile(member, io.BytesIO(data) if data is not None else None)
        manifest_path = artifact / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["archive_sha256"] = hashlib.sha256(archive.read_bytes()).hexdigest()
        manifest_path.write_bytes(wire(manifest))

    def rejected_restore(self, artifact, identity=None, phase="full"):
        destination = Path(tempfile.mkdtemp(prefix="restore-", dir=self.base))
        before = sorted(str(p.relative_to(destination)) for p in destination.rglob("*"))
        with self.assertRaises(self.ci.PagesCIError):
            self.ci.restore_publications(destination, artifact, identity or self.identity, phase)
        self.assertEqual(before, sorted(str(p.relative_to(destination)) for p in destination.rglob("*")))

    def test_profile_keeps_authored_commands_and_inherited_output(self):
        calls = []
        def execute(args, cwd):
            calls.append((args, cwd))
            return subprocess.CompletedProcess(args, 0)
        self.ci.run_profile(self.root, "student", "stock-quarto", execute)
        self.assertEqual([c[0] for c in calls], [
            ["stock-quarto", "render", "--profile", "student", "--fail-if-warnings"],
            ["stock-quarto", "render", "examples/cloud", "--profile", "student", "--fail-if-warnings"],
            ["stock-quarto", "render", "examples/prairielearn", "--profile", "student", "--fail-if-warnings"],
        ])
        self.assertTrue(all(cwd == self.root for _, cwd in calls))

    def test_failed_root_or_optional_stops_downstream(self):
        for failed in range(3):
            with self.subTest(command=failed):
                calls = []
                def execute(args, cwd):
                    calls.append(args)
                    return subprocess.CompletedProcess(args, 7 if len(calls) == failed + 1 else 0)
                with self.assertRaises(self.ci.PagesCIError):
                    self.ci.run_profile(self.root, "full", "quarto", execute)
                self.assertEqual(len(calls), failed + 1)

    def test_unknown_profile_never_executes(self):
        calls = []
        with self.assertRaises(self.ci.PagesCIError):
            self.ci.run_profile(self.root, "teacher", "quarto", lambda *args: calls.append(args))
        self.assertEqual(calls, [])

    def test_version_binding_checks_actual_binary(self):
        for stdout, code in [("1.11.5\n", 0), ("1.10.18\n", 3), ("1.10.18\nextra\n", 0)]:
            with self.subTest(stdout=stdout, code=code):
                with self.assertRaises(self.ci.PagesCIError):
                    self.ci.verify_quarto("quarto", "1.10.18", lambda *a, **k: subprocess.CompletedProcess(a[0], code, stdout))
        self.ci.verify_quarto("quarto", "1.10.18", lambda *a, **k: subprocess.CompletedProcess(a[0], 0, "1.10.18\n"))

    def test_roundtrip_both_versions_keeps_hidden_empty_dirs_modes_bytes(self):
        artifact, manifest = self.full_artifact()
        self.assertIn("_site-full/.nojekyll", manifest["entries"])
        self.assertEqual(manifest["entries"]["_site-full/empty"],
                         {"type": "directory", "mode": 0o700, "size": 0, "sha256": None})
        for version in ("1.10.18", "1.11.5"):
            with self.subTest(version=version):
                identity = copy.deepcopy(self.identity)
                identity["version"] = version
                version_artifact = self.base / ("artifact-" + version)
                self.ci.pack_publications(self.root, version_artifact, identity, "full")
                destination = self.base / ("restore-" + version)
                destination.mkdir()
                self.ci.restore_publications(destination, version_artifact, identity, "full")
                self.assertEqual((destination / "_site-full/index.html").read_bytes(), b"<html>current publication</html>")
                self.assertEqual(stat.S_IMODE((destination / "_site-full/index.html").stat().st_mode), 0o640)
                self.assertTrue((destination / "_site-full/empty").is_dir())

    def test_identity_each_field_refuses_before_materialization(self):
        artifact, _ = self.full_artifact()
        for field, value in [("version", "1.11.5"), ("repository", "other/course"),
                             ("run_id", "456"), ("run_attempt", 2)]:
            expected = copy.deepcopy(self.identity); expected[field] = value
            with self.subTest(field=field):
                self.rejected_restore(artifact, expected)
        for field in ("head", "tree", "files"):
            expected = copy.deepcopy(self.identity)
            expected["source"][field] = {"other": {"sha256": "e" * 64, "git_mode": "100644"}} if field == "files" else "c" * 40
            with self.subTest(field=field):
                self.rejected_restore(artifact, expected)
        self.rejected_restore(artifact, phase="pair")

    def test_archive_bytes_digest_refuses_before_materialization(self):
        artifact, _ = self.full_artifact()
        with (artifact / "publications.tar.gz").open("ab") as stream:
            stream.write(b"tamper")
        self.rejected_restore(artifact)

    def test_changed_member_bytes_or_mode_refuses(self):
        for change in ("bytes", "mode"):
            with self.subTest(change=change):
                artifact, _ = self.full_artifact()
                def mutate(members):
                    for member, data in members:
                        if member.name == "_site-full/index.html":
                            if change == "bytes": data = b"x" * len(data)
                            else: member.mode ^= 0o100
                        yield member, data
                self.mutate_archive(artifact, mutate)
                self.rejected_restore(artifact)
                shutil.rmtree(artifact); shutil.rmtree(self.root); self.root.mkdir()

    def test_missing_hidden_file_directory_extra_and_duplicate_refuse(self):
        for change in ("hidden", "empty", "extra", "duplicate"):
            with self.subTest(change=change):
                artifact, _ = self.full_artifact()
                def mutate(members):
                    if change == "hidden": return [(m, d) for m, d in members if m.name != "_site-full/.nojekyll"]
                    if change == "empty": return [(m, d) for m, d in members if m.name != "_site-full/empty"]
                    if change == "duplicate": return members + [members[0]]
                    member = tarfile.TarInfo("_site-full/extra.txt"); member.size = 1
                    return members + [(member, b"x")]
                self.mutate_archive(artifact, mutate)
                self.rejected_restore(artifact)
                shutil.rmtree(artifact); shutil.rmtree(self.root); self.root.mkdir()

    def test_unsafe_archive_members_refuse_without_escape(self):
        for name, kind in [("../escape", tarfile.REGTYPE), ("/escape", tarfile.REGTYPE),
                           ("_site-full/.quarto/secret", tarfile.REGTYPE),
                           ("_site-full/link", tarfile.SYMTYPE), ("_site-full/hard", tarfile.LNKTYPE),
                           ("_site-full/fifo", tarfile.FIFOTYPE), ("_site-full/device", tarfile.CHRTYPE)]:
            with self.subTest(name=name, kind=kind):
                artifact, _ = self.full_artifact()
                def mutate(members):
                    member = tarfile.TarInfo(name); member.type = kind; member.linkname = "../outside"
                    return members + [(member, b"")]
                self.mutate_archive(artifact, mutate)
                self.rejected_restore(artifact)
                self.assertFalse((self.base / "escape").exists())
                shutil.rmtree(artifact); shutil.rmtree(self.root); self.root.mkdir()

    def test_existing_file_retyped_as_link_or_special_refuses(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.FIFOTYPE, tarfile.CHRTYPE, tarfile.CONTTYPE):
            with self.subTest(kind=kind):
                artifact, _ = self.full_artifact()
                def mutate(members):
                    for member, data in members:
                        if member.name == "_site-full/index.html":
                            member.type = kind
                            if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE): member.linkname = "../outside"
                        yield member, data
                self.mutate_archive(artifact, mutate)
                self.rejected_restore(artifact)

    def test_public_source_links_private_paths_and_hardlinks_refuse(self):
        for kind in ("symlink", "hardlink", "private"):
            with self.subTest(kind=kind):
                self.publications(self.root, FULL)
                if kind == "symlink": (self.root / "_site-full/link").symlink_to("index.html")
                elif kind == "hardlink": os.link(self.root / "_site-full/index.html", self.root / "_site-full/hard")
                else: (self.root / "_site-full/.course-owner").mkdir()
                with self.assertRaises(self.ci.PagesCIError):
                    self.ci.pack_publications(self.root, self.base / "artifact", self.identity, "full")
                self.assertFalse((self.base / "artifact").exists())
                shutil.rmtree(self.root); self.root.mkdir()

    def test_existing_public_destination_is_never_overwritten(self):
        artifact, _ = self.full_artifact()
        target = self.base / "restore"; target.mkdir(); (target / "_site-full").mkdir()
        sentinel = target / "_site-full/sentinel"; sentinel.write_bytes(b"keep")
        with self.assertRaises(self.ci.PagesCIError):
            self.ci.restore_publications(target, artifact, self.identity, "full")
        self.assertEqual(sentinel.read_bytes(), b"keep")

    def test_pair_retains_full_parent_and_check_restores_without_external(self):
        artifact, full = self.full_artifact()
        student = self.base / "student"; student.mkdir()
        parent = self.ci.restore_publications(student, artifact, self.identity, "full")
        self.publications(student, STUDENT)
        pair = self.base / "pair"
        manifest = self.ci.pack_publications(student, pair, self.identity, "pair", parent)
        self.assertEqual(manifest["parent_full"]["entries"], full["entries"])
        check = self.base / "check"; check.mkdir(); calls = []
        def execute(args, cwd):
            self.assertTrue((cwd / "_site-full/index.html").exists())
            self.assertTrue((cwd / "_site-student/index.html").exists())
            calls.append(args); return subprocess.CompletedProcess(args, 0)
        self.ci.check_pair(check, pair, self.identity, "quarto", execute)
        self.assertEqual(calls, [["quarto", "run", "tests/check.ts", "--skip-render"]])

    def test_student_deleting_or_mutating_full_or_optional_cannot_pack_pair(self):
        for change in ("delete-full", "mutate-full", "mutate-cloud", "mutate-prairie"):
            with self.subTest(change=change):
                artifact, _ = self.full_artifact()
                student = self.base / "student"; student.mkdir()
                parent = self.ci.restore_publications(student, artifact, self.identity, "full")
                self.publications(student, STUDENT)
                if change == "delete-full": shutil.rmtree(student / "_site-full")
                else:
                    path = FULL[{"mutate-full": 0, "mutate-cloud": 1, "mutate-prairie": 2}[change]]
                    (student / path / "index.html").write_bytes(b"changed after student")
                with self.assertRaises(self.ci.PagesCIError):
                    self.ci.pack_publications(student, self.base / "pair", self.identity, "pair", parent)
                self.assertFalse((self.base / "pair").exists())
                shutil.rmtree(artifact); shutil.rmtree(student); shutil.rmtree(self.root); self.root.mkdir()

    def test_artifact_must_be_outside_source(self):
        self.publications(self.root, FULL)
        with self.assertRaises(self.ci.PagesCIError):
            self.ci.pack_publications(self.root, self.root / ".pages-ci", self.identity, "full")
        self.assertFalse((self.root / ".pages-ci").exists())

    def test_source_identity_uses_git_objects_and_physical_executable_bit(self):
        path = self.root / "README.md"; path.write_bytes(b"source"); path.chmod(0o644)
        blob = hashlib.sha1(b"blob 6\0source").hexdigest()
        responses = [b"a" * 40 + b"\n", b"b" * 40 + b"\n", b"", b"100644 blob " + blob.encode() + b"\tREADME.md\0"]
        with patch.object(self.ci.subprocess, "check_output", side_effect=responses):
            self.assertEqual(self.ci.source_identity(self.root), self.identity["source"])
        for mutation in ("bytes", "mode", "symlink"):
            with self.subTest(mutation=mutation):
                path.unlink(); path.write_bytes(b"wrong" if mutation == "bytes" else b"source")
                path.chmod(0o755 if mutation == "mode" else 0o644)
                if mutation == "symlink": path.unlink(); path.symlink_to("missing")
                with patch.object(self.ci.subprocess, "check_output", side_effect=responses):
                    with self.assertRaises(self.ci.PagesCIError): self.ci.source_identity(self.root)

    def test_source_rejects_staged_unstaged_and_untracked_before_reading_files(self):
        for status in (b"M  README.md\0", b" M README.md\0", b"?? surprise\0"):
            with self.subTest(status=status):
                with patch.object(self.ci.subprocess, "check_output", side_effect=[b"a" * 40 + b"\n", b"b" * 40 + b"\n", status]) as git:
                    with self.assertRaises(self.ci.PagesCIError): self.ci.source_identity(self.root)
                    self.assertEqual(git.call_count, 3)

    def test_source_executable_commit_requires_owner_execute_bit(self):
        path = self.root / "README.md"; path.write_bytes(b"source")
        blob = hashlib.sha1(b"blob 6\0source").hexdigest()
        responses = [b"a" * 40 + b"\n", b"b" * 40 + b"\n", b"", b"100755 blob " + blob.encode() + b"\tREADME.md\0"]
        for mode in (0o644, 0o645, 0o654):
            path.chmod(mode)
            with self.subTest(mode=mode), patch.object(self.ci.subprocess, "check_output", side_effect=responses):
                with self.assertRaises(self.ci.PagesCIError): self.ci.source_identity(self.root)
        path.chmod(0o755)
        with patch.object(self.ci.subprocess, "check_output", side_effect=responses):
            self.assertEqual(self.ci.source_identity(self.root)["files"]["README.md"]["git_mode"], "100755")

    def test_parent_map_and_manifest_archive_digests_are_required(self):
        artifact, full = self.full_artifact()
        student = self.base / "student"; student.mkdir()
        parent = self.ci.restore_publications(student, artifact, self.identity, "full")
        self.publications(student, STUDENT)
        pair = self.base / "pair"
        original = self.ci.pack_publications(student, pair, self.identity, "pair", parent)
        for field in ("entries", "manifest_sha256", "archive_sha256"):
            changed = copy.deepcopy(original)
            if field == "entries": changed["parent_full"][field]["_site-full/index.html"]["sha256"] = "c" * 64
            else: changed["parent_full"][field] = "c" * 64
            (pair / "manifest.json").write_bytes(wire(changed))
            with self.subTest(field=field): self.rejected_restore(pair, phase="pair")
        (pair / "manifest.json").write_bytes(wire(original))

    def test_noncanonical_manifest_and_extra_artifact_file_refuse(self):
        artifact, manifest = self.full_artifact()
        for raw in (json.dumps(manifest).encode(), wire(manifest).replace(b'"protocol":1', b'"protocol":1,"protocol":1')):
            (artifact / "manifest.json").write_bytes(raw)
            self.rejected_restore(artifact)
        (artifact / "manifest.json").write_bytes(wire(manifest))
        (artifact / "extra").write_bytes(b"not part of finite transport")
        self.rejected_restore(artifact)

    def cli(self, phase, root, *flags):
        return [phase, "--root", str(root), "--version", self.identity["version"],
                "--repository", self.identity["repository"], "--run-id", self.identity["run_id"],
                "--run-attempt", str(self.identity["run_attempt"]), "--quarto", "stock-quarto", *flags]

    def test_cli_source_change_during_full_refuses_artifact(self):
        source = self.identity["source"]
        changed = copy.deepcopy(source); changed["files"]["README.md"]["sha256"] = "c" * 64
        calls = []
        def execute(args, **kwargs):
            calls.append(args)
            if args[1] == "--version": return subprocess.CompletedProcess(args, 0, "1.10.18\n")
            if len(calls) == 2: self.publications(self.root, FULL)
            return subprocess.CompletedProcess(args, 0)
        artifact = self.base / "full"
        with patch.object(self.ci, "source_identity", side_effect=[source, source, changed]), patch.object(self.ci.subprocess, "run", side_effect=execute):
            with self.assertRaises(self.ci.PagesCIError): self.ci.main(self.cli("full", self.root, "--artifact", str(artifact)))
        self.assertFalse(artifact.exists())
        self.assertEqual(len(calls), 4)

    def test_cli_checks_source_after_extraction_before_student_render(self):
        artifact, _ = self.full_artifact()
        root = self.base / "student"; root.mkdir()
        source = self.identity["source"]
        changed = copy.deepcopy(source); changed["tree"] = "c" * 40
        with patch.object(self.ci, "source_identity", side_effect=[source, source, changed]), patch.object(self.ci.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "1.10.18\n")) as execute:
            with self.assertRaises(self.ci.PagesCIError): self.ci.main(self.cli("student", root, "--baseline", str(artifact), "--artifact", str(self.base / "pair")))
        self.assertEqual(execute.call_count, 1)  # only binary version, never native render
        self.assertFalse((self.base / "pair").exists())

    def test_cli_check_requires_validator_zero_and_source_unchanged_afterward(self):
        artifact, _ = self.full_artifact()
        student = self.base / "student"; student.mkdir()
        full = self.ci.restore_publications(student, artifact, self.identity, "full")
        self.publications(student, STUDENT)
        pair = self.base / "pair"; self.ci.pack_publications(student, pair, self.identity, "pair", full)
        source = self.identity["source"]
        changed = copy.deepcopy(source); changed["head"] = "c" * 40
        for nonzero in (True, False):
            check = self.base / ("check-" + str(nonzero)); check.mkdir(); calls = []
            def execute(args, **kwargs):
                calls.append(args)
                return subprocess.CompletedProcess(args, 0 if args[1] == "--version" else (7 if nonzero else 0), "1.10.18\n")
            bindings = [source, source, source] + ([] if nonzero else [changed])
            with patch.object(self.ci, "source_identity", side_effect=bindings), patch.object(self.ci.subprocess, "run", side_effect=execute):
                with self.assertRaises(self.ci.PagesCIError): self.ci.main(self.cli("check", check, "--baseline", str(pair)))
            self.assertEqual(calls, [["stock-quarto", "--version"], ["stock-quarto", "run", "tests/check.ts", "--skip-render"]])

    def test_cli_rejects_stale_ignored_publications_before_render(self):
        artifact, _ = self.full_artifact()
        for phase in ("full", "student"):
            root = self.base / ("stale-" + phase); root.mkdir()
            self.publications(root, (STUDENT[0],))
            flags = ["--artifact", str(self.base / ("out-" + phase))]
            if phase == "student": flags += ["--baseline", str(artifact)]
            with patch.object(self.ci, "source_identity", return_value=self.identity["source"]), patch.object(self.ci.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "1.10.18\n")) as execute:
                with self.assertRaises(self.ci.PagesCIError): self.ci.main(self.cli(phase, root, *flags))
                self.assertEqual(execute.call_count, 1)

    def test_cli_complete_chain_both_stock_versions_without_native_execution(self):
        for version in ("1.10.18", "1.11.5"):
            self.identity["version"] = version
            calls = []
            def execute(args, **kwargs):
                calls.append(args)
                if args[1] == "--version": return subprocess.CompletedProcess(args, 0, version + "\n")
                root = kwargs["cwd"]
                if args[1] == "render":
                    profile = args[args.index("--profile") + 1]
                    index = 0 if args[2] == "--profile" else (1 if args[2] == "examples/cloud" else 2)
                    self.publications(root, ((FULL if profile == "full" else STUDENT)[index],))
                else:
                    self.assertTrue(all((root / tree / "index.html").is_file() for tree in FULL + STUDENT))
                return subprocess.CompletedProcess(args, 0)
            full = self.base / ("full-" + version); pair = self.base / ("pair-" + version)
            with patch.object(self.ci, "source_identity", return_value=self.identity["source"]), patch.object(self.ci.subprocess, "run", side_effect=execute), patch("builtins.print"):
                for phase, flags in [("full", ["--artifact", str(full)]), ("student", ["--baseline", str(full), "--artifact", str(pair)]), ("check", ["--baseline", str(pair)])]:
                    root = self.base / (phase + "-source-" + version); root.mkdir()
                    self.ci.main(self.cli(phase, root, *flags))
            self.assertEqual(len(calls), 10)  # three version queries, six renders, one assertion run
            self.assertEqual(calls[-1], ["stock-quarto", "run", "tests/check.ts", "--skip-render"])


if __name__ == "__main__":
    unittest.main()
