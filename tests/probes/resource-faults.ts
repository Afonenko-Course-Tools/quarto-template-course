// Нативные negative probes: отдельные test-only finalizers, без изменения consumer predicates.
import { assert, command, files, join, load } from "./resources/common.ts";
export const ownerFault = {
  async finalize(ctx: any) {
    const attempt = await load(ctx);
    const options = JSON.parse(
      await Deno.readTextFile(join(ctx.sourceRoot, "_probe/selection.json")),
    );
    if (options.fail === "source-mutation") {
      await Deno.writeTextFile(
        join(attempt.handle.root, "assets/public.txt"),
        "changed after render\n",
      );
    }
    if (options.fail === "config-mutation") {
      await Deno.writeTextFile(
        join(attempt.handle.root, "_quarto-student.yml"),
        "course:\n  view: full\n",
      );
    }
    if (options.fail === "session-mutation") {
      await Deno.writeTextFile(attempt.handle.sessionPath, "{}\n");
    }
    if (options.fail === "missing-observation") {
      const observations =
        (await files(join(attempt.handle.root, ".course-owner"))).filter((p) =>
          p.split("/").at(-1)?.startsWith("result-") && p.endsWith(".json")
        );
      assert(observations.length > 0, "TEST_OBSERVATION_NOT_FOUND");
      await Deno.remove(observations.at(-1)!);
    }
  },
};
export const zipFault = {
  async finalize(ctx: any) {
    const attempt = await load(ctx),
      options = JSON.parse(
        await Deno.readTextFile(join(ctx.sourceRoot, "_probe/selection.json")),
      );
    if (
      ["renamed-private-zip", "renamed-service-zip", "renamed-runtime-zip"]
        .includes(options.fail)
    ) {
      const source = options.fail === "renamed-private-zip"
        ? join(attempt.handle.root, "materials/instructor/README.txt")
        : options.fail === "renamed-runtime-zip"
        ? join(
          attempt.handle.root,
          "_extensions/Afonenko-Course-Tools/course-presentation/disclosure.js",
        )
        : attempt.packagePath;
      await command("python3", [
        "-c",
        "import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],'w') as z: z.write(sys.argv[2],'renamed/public.txt')",
        join(ctx.stage, "renamed-carrier.bin"),
        source,
      ], ctx.root);
    }
    if (options.fail === "renamed-runtime-plain") {
      await Deno.copyFile(
        join(
          attempt.handle.root,
          "_extensions/Afonenko-Course-Tools/course-presentation/disclosure.js",
        ),
        join(ctx.stage, "renamed-runtime.js"),
      );
    }
  },
};
