// Actual installed Print outputs/ZIP; independent receipt still wins over a replaced archive map.
import {
  dirname,
  fromFileUrl,
  join,
  relative,
  resolve,
  toFileUrl,
} from "stdlib/path";
const at = Deno.args.indexOf("--consumer");
if (at < 0) throw Error("--consumer required");
const root = resolve(Deno.args[at + 1]);
const {
  assert,
  assertPrintArchive,
  assertPrintTargetAvailable,
  command,
  files,
  hash,
} = await import(
  toFileUrl(join(root, "_probe/resources/common.ts")).href
);
const repo = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
const output = join(root, "_site-student"),
  temporary = await Deno.makeTempDir({ prefix: "print-integrity-" });
try {
  const printFiles = Object.fromEntries(
    await Promise.all(
      (await files(join(output, "tasks/handouts"))).map(async (
        p: string,
      ) => [relative(output, p), await hash(p)]),
    ),
  );
  const pdfHash = await hash(join(output, "tasks/handouts/current.pdf"));
  const resourcePath = Object.keys(printFiles).find((p) =>
    p !== "tasks/handouts/current.pdf"
  )!;
  assert(resourcePath, "actual Print resource missing");
  // Call the same production guard with actual current Print receipt inputs.
  assertPrintTargetAvailable("current.pdf", printFiles);
  for (
    const target of ["handout.pdf", relative("tasks/handouts", resourcePath)]
  ) {
    let refused = false;
    try {
      assertPrintTargetAvailable(target, printFiles);
    } catch (e) {
      refused = String(e).includes("PRINT_TARGET_COLLISION");
    }
    assert(refused, "reserved Print ZIP target allowed: " + target);
  }

  const original = join(output, "tasks/_downloads/starter.zip");
  const check = async (target?: string) => {
    const archive = join(temporary, "starter.zip");
    await command("python3", [
      "-c",
      "import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as a,zipfile.ZipFile(sys.argv[2],'w') as b:\n for i in a.infolist(): b.writestr(i,b'PUBLIC_TARGET_REPLACEMENT\\n' if i.filename==sys.argv[3] else a.read(i))",
      original,
      archive,
      target ?? "",
    ], root);
    const rows = JSON.parse(
      await command("python3", [
        join(repo, "fixtures/probes/resources/audit.py"),
        temporary,
      ], root),
    )[0].entries;
    // A mutable generic archive mapping could accept every row after being replaced.
    const replaced = Object.fromEntries(
      rows.map((e: any) => [e.path, e.sha256]),
    );
    assert(
      rows.every((e: any) => replaced[e.path] === e.sha256),
      "replacement setup",
    );
    try {
      assertPrintArchive(rows, printFiles, pdfHash);
    } catch (e) {
      if (target && String(e).includes("CURRENT_PRINT_ZIP_RESOURCE_CHANGED")) {
        return;
      }
      throw e;
    }
    assert(
      !target,
      "independent Print receipt accepted replaced ZIP target " + target,
    );
  };
  await check();
  await check("handout.pdf");
  const resource = Object.keys(printFiles).find((p) =>
    p !== "tasks/handouts/current.pdf"
  )!;
  assert(resource, "actual Print resource missing");
  await check(relative("tasks/handouts", resource));
  console.log(
    "PASS actual Print ZIP receipt: current bytes and PDF/resource replacement rejection",
  );
} finally {
  await Deno.remove(temporary, { recursive: true });
}
