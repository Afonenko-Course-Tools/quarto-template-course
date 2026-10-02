// Real archive transport checks only. No native render or ownership receipt reuse.
import { join } from "stdlib/path";
import {
  assert,
  command,
  hash,
  publicArchive,
} from "./actual-main-evidence.ts";
import { authenticatePublicBaseline } from "./actual-main-public-evidence.ts";
import { expected } from "./actual-main-receipt-guards.ts";
const root = await Deno.makeTempDir({ prefix: "actual-main-transfer-guards-" });
const bytes = new TextEncoder().encode("completed public bytes\n");
const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
  .map((n) => n.toString(16).padStart(2, "0")).join("");
const maps = {
  student: { "index.html": sha, "deep/a.txt": sha },
  full: { "index.html": sha, "deep/a.txt": sha },
};
const pack = `import io,sys,tarfile
path,mode=sys.argv[1:]
entries=[('student/index.html','file'),('student/deep/a.txt','file'),('full/index.html','file'),('full/deep/a.txt','file')]
if mode=='symlink': entries += [('student/link','symlink')]
if mode=='hardlink': entries += [('student/link','hardlink')]
if mode=='traversal': entries += [('student/../escape','file')]
if mode=='private': entries += [('student/.project-publish/session.json','file')]
if mode=='extra': entries += [('owner-session.json','file')]
if mode=='missing': entries = entries[:2]
if mode=='duplicate': entries += [entries[0]]
if mode=='alias': entries += [('student//alias','file')]
with tarfile.open(path,'w:gz') as tf:
 for name,kind in entries:
  info=tarfile.TarInfo(name)
  if kind=='file':
   data=b'completed public bytes\\n'; info.size=len(data); tf.addfile(info,io.BytesIO(data))
  else:
   info.type=tarfile.SYMTYPE if kind=='symlink' else tarfile.LNKTYPE
   info.linkname='../full/index.html'; tf.addfile(info)
`;
let count = 0;
for (
  const mode of [
    "valid",
    "symlink",
    "hardlink",
    "traversal",
    "private",
    "extra",
    "missing",
    "duplicate",
    "alias",
    "map-drift",
    "archive-drift",
    "stale-destination",
  ]
) {
  const archive = join(root, `${mode}.tar.gz`),
    destination = join(root, `${mode}-public`);
  await command("python3", ["-c", pack, archive, mode], root);
  if (mode === "stale-destination") await Deno.mkdir(destination);
  const expected = {
    archiveSha256: mode === "archive-drift"
      ? "0".repeat(64)
      : await hash(archive),
    files: mode === "map-drift"
      ? { ...maps, full: { ...maps.full, "index.html": "1".repeat(64) } }
      : maps,
  };
  let error: unknown;
  try {
    await publicArchive(archive, destination, expected);
  } catch (e) {
    error = e;
  }
  assert(
    mode === "valid" ? error === undefined : error instanceof Error,
    `ACTUAL_MAIN_TRANSFER: ${mode} unexpected acceptance/refusal`,
  );
  count++;
}
for (
  const mode of [
    "native-log",
    "private-index",
    "missing-public-receipt",
    "symlink-receipt",
  ]
) {
  const artifact = join(root, `artifact-${mode}`);
  await Deno.mkdir(artifact);
  await Deno.writeTextFile(
    join(artifact, "publications.tar.gz"),
    "unused public archive\n",
  );
  if (mode === "symlink-receipt") {
    await Deno.symlink(
      join(artifact, "publications.tar.gz"),
      join(artifact, "public-baseline.json"),
    );
  } else if (mode !== "missing-public-receipt") {
    await Deno.writeTextFile(join(artifact, "public-baseline.json"), "{}\n");
  }
  if (mode === "native-log") {
    await Deno.writeTextFile(
      join(artifact, "actual-main-student.log"),
      "native proof must stay in aggregate evidence\n",
    );
  }
  if (mode === "private-index") {
    await Deno.writeTextFile(join(artifact, "owner-index.json"), "{}\n");
  }
  let error: unknown;
  try {
    await authenticatePublicBaseline(
      artifact,
      "student-release",
      "1.10.18",
      expected,
      {},
    );
  } catch (e) {
    error = e;
  }
  assert(
    error instanceof Error && /artifact|downstream/.test(error.message),
    `ACTUAL_MAIN_TRANSFER: ${mode} did not refuse before metadata/import`,
  );
  count++;
}
await Deno.remove(root, { recursive: true });
console.log(
  `PASS actual-main public archive transfer guards: ${count} checks; no private permission transport or native render`,
);
