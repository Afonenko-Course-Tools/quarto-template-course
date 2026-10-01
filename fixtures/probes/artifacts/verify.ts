import {
  assert,
  command,
  event,
  files,
  hash,
  join,
  policy,
  relative,
  serviceSegments,
} from "./common.ts";
export default {
  async finalize(ctx: any) {
    const p = await policy(ctx);
    const denied = p.resources.filter((r: any) =>
      r.deniedProfiles.some((v: string) => ctx.profiles.includes(v))
    );
    const privateBundle = await hash(
      join(ctx.sourceRoot, "_probe/package.json"),
    );
    for (const file of await files(ctx.stage)) {
      assert(
        !relative(ctx.stage, file).split("/").some((part) =>
          serviceSegments.includes(part)
        ),
        `SERVICE_FINAL_RESOURCE ${file}`,
      );
      const digest = await hash(file);
      assert(digest !== privateBundle, `PRIVATE_FIXTURE_INPUT ${file}`);
      for (const r of denied) {
        assert(
          digest !== r.sha256,
          `DENIED_FINAL_RESOURCE ${r.source} -> ${file}`,
        );
      }
      if (file.endsWith(".zip")) {
        // Mature stdlib ZIP reader; no bespoke ZIP parser or private download API.
        const entries = JSON.parse(
          await command("python3", [
            "-c",
            "import hashlib,json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n print(json.dumps({n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist()}))",
            file,
          ], ctx.root),
        );
        for (const digest of Object.values(entries)) {
          assert(digest !== privateBundle, `PRIVATE_FIXTURE_INPUT ${file}`);
          for (const r of denied) {
            assert(digest !== r.sha256, `DENIED_ZIP_RESOURCE ${r.source}`);
          }
        }
      }
    }
    await event(ctx, "verified");
  },
};
