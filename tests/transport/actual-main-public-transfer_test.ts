// Real archive transport; only public regular-file trees may cross this boundary.
import { join } from "stdlib/path";
import {
  assert,
  command,
  hash,
  publicArchive,
} from "../probes/actual-main-evidence.ts";
import { authenticatePublicBaseline } from "../probes/actual-main-public-evidence.ts";
import { expected } from "../support/actual-main-fixture.ts";
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
interface ArchiveCase {
  name: string;
  goal: string;
  mutation: string;
  expectedRefusal?: RegExp;
  preExtraction: boolean;
}
const archiveCases: ArchiveCase[] = [
  {
    name: "valid",
    goal: "accept both complete genuine public trees",
    mutation: "valid",
    preExtraction: false,
  },
  {
    name: "symlink",
    goal: "refuse symlink before accepting public transport",
    mutation: "symlink",
    expectedRefusal:
      /^PORTAL_CONSUMER: python3 [\s\S]*File "<string>", line 14, in <module>[\s\S]*AssertionError/,
    preExtraction: true,
  },
  {
    name: "hardlink",
    goal: "refuse hardlink before accepting public transport",
    mutation: "hardlink",
    expectedRefusal:
      /^PORTAL_CONSUMER: python3 [\s\S]*File "<string>", line 14, in <module>[\s\S]*AssertionError/,
    preExtraction: true,
  },
  {
    name: "traversal",
    goal: "refuse traversal before accepting public transport",
    mutation: "traversal",
    expectedRefusal:
      /^PORTAL_CONSUMER: python3 [\s\S]*File "<string>", line 13, in <module>[\s\S]*AssertionError/,
    preExtraction: true,
  },
  {
    name: "private",
    goal: "refuse private before accepting public transport",
    mutation: "private",
    expectedRefusal:
      /^PORTAL_CONSUMER: python3 [\s\S]*File "<string>", line 13, in <module>[\s\S]*AssertionError/,
    preExtraction: true,
  },
  {
    name: "extra",
    goal: "refuse extra before accepting public transport",
    mutation: "extra",
    expectedRefusal:
      /^PORTAL_CONSUMER: python3 [\s\S]*File "<string>", line 14, in <module>[\s\S]*AssertionError/,
    preExtraction: true,
  },
  {
    name: "missing",
    goal: "refuse missing before accepting public transport",
    mutation: "missing",
    expectedRefusal:
      /^PORTAL_CONSUMER: python3 [\s\S]*File "<string>", line 28, in <module>[\s\S]*AssertionError/,
    preExtraction: false,
  },
  {
    name: "duplicate",
    goal: "refuse duplicate before accepting public transport",
    mutation: "duplicate",
    expectedRefusal:
      /^PORTAL_CONSUMER: python3 [\s\S]*File "<string>", line 15, in <module>[\s\S]*AssertionError/,
    preExtraction: true,
  },
  {
    name: "alias",
    goal: "refuse alias before accepting public transport",
    mutation: "alias",
    expectedRefusal:
      /^PORTAL_CONSUMER: python3 [\s\S]*File "<string>", line 13, in <module>[\s\S]*AssertionError/,
    preExtraction: true,
  },
  {
    name: "map-drift",
    goal: "refuse map-drift before accepting public transport",
    mutation: "map-drift",
    expectedRefusal:
      /^PORTAL_CONSUMER: ACTUAL_MAIN: extracted complete public file-set\/SHA differs from genuine baseline$/,
    preExtraction: false,
  },
  {
    name: "archive-drift",
    goal: "refuse archive-drift before accepting public transport",
    mutation: "archive-drift",
    expectedRefusal:
      /^PORTAL_CONSUMER: ACTUAL_MAIN: public archive byte lineage mismatch$/,
    preExtraction: true,
  },
  {
    name: "stale-destination",
    goal: "refuse stale-destination before accepting public transport",
    mutation: "stale-destination",
    expectedRefusal:
      /^PORTAL_CONSUMER: ACTUAL_MAIN: public extraction destination must be fresh$/,
    preExtraction: false,
  },
];
for (const scenario of archiveCases) {
  Deno.test(`actual-main public archive: ${scenario.name}`, async () => {
    const root = await Deno.makeTempDir({
      prefix: "actual-main-transfer-guards-",
    });
    try {
      const mode = scenario.mutation,
        archive = join(root, `${mode}.tar.gz`),
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
      } catch (caught) {
        error = caught;
      }
      assert(
        scenario.expectedRefusal
          ? error instanceof Error &&
            scenario.expectedRefusal.test(error.message)
          : error === undefined,
        `${scenario.goal}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (scenario.preExtraction) {
        let exists = true;
        try {
          await Deno.lstat(destination);
        } catch (error) {
          if (error instanceof Deno.errors.NotFound) exists = false;
          else throw error;
        }
        assert(
          !exists,
          "unverified archive cannot create a partial destination",
        );
      }
      let escaped = true;
      try {
        await Deno.lstat(join(root, "escape"));
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) escaped = false;
        else throw error;
      }
      assert(!escaped, "archive cannot write outside its destination");
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });
}
const artifactCases = [
  {
    name: "native-log",
    goal: "exclude native proof from downstream transport",
    expectedRefusal:
      "PORTAL_CONSUMER: ACTUAL_MAIN: downstream artifact contains native/private proof or misses public bytes",
  },
  {
    name: "private-index",
    goal: "exclude private owner indexes from downstream transport",
    expectedRefusal:
      "PORTAL_CONSUMER: ACTUAL_MAIN: downstream artifact contains native/private proof or misses public bytes",
  },
  {
    name: "missing-public-receipt",
    goal: "require the public receipt before metadata import",
    expectedRefusal:
      "PORTAL_CONSUMER: ACTUAL_MAIN: downstream artifact contains native/private proof or misses public bytes",
  },
  {
    name: "symlink-receipt",
    goal: "require a regular public receipt before metadata import",
    expectedRefusal:
      "PORTAL_CONSUMER: ACTUAL_MAIN: public baseline artifact must contain regular files only",
  },
];
for (const scenario of artifactCases) {
  Deno.test(`actual-main public artifact: ${scenario.name}`, async () => {
    const root = await Deno.makeTempDir({
      prefix: "actual-main-transfer-guards-",
    });
    try {
      const mode = scenario.name, artifact = join(root, `artifact-${mode}`);
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
        await Deno.writeTextFile(
          join(artifact, "public-baseline.json"),
          "{}\n",
        );
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
      } catch (caught) {
        error = caught;
      }
      assert(
        error instanceof Error && error.message === scenario.expectedRefusal,
        `${scenario.goal}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });
}
