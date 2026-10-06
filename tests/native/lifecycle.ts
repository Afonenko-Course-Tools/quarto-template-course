/** Current outputs, selected renders, author generated inputs and failed-build retry. */
import { join } from "stdlib/path";
import {
  assert,
  capture,
  command,
  exists,
  remove,
  ROOT,
  text,
  workspaceArg,
} from "./helpers.ts";
import { search } from "./run.ts";

async function lines(path: string): Promise<string[]> {
  return await exists(path)
    ? (await Deno.readTextFile(path)).split(/\r?\n/).filter(Boolean)
    : [];
}
export async function lifecycle(root: string): Promise<void> {
  const part = join(root, "handbook"), config = join(part, "_quarto.yml");
  const original = await Deno.readTextFile(join(ROOT, "handbook/_quarto.yml"));
  const previousTrace = Deno.env.get("COURSE_BUILD_TRACE");
  const trace = join(root, "lifecycle-trace.jsonl");
  await Deno.writeTextFile(config, original);
  await remove(join(part, "generate.ts"));
  await remove(join(part, "generated.qmd"));
  Deno.env.set("COURSE_BUILD_TRACE", trace);
  try {
    // Native selected file remains local and does not compose siblings.
    const before = (await lines(trace)).length;
    await command(["render", "index.qmd", "--profile", "student"], part);
    assert(
      !(await lines(trace)).slice(before).some((line) =>
        JSON.parse(line).kind === "render"
      ),
      "Selected render unexpectedly composed siblings",
    );
    // Fail after native capture: only process success authorizes collection.
    await Deno.writeTextFile(
      join(part, "fail.ts"),
      'throw Error("TEMPLATE_LATE_FAILURE");\n',
    );
    await Deno.writeTextFile(
      config,
      original.replace(
        "  - ../_extensions/Afonenko-Course-Tools/course-site/entrypoints/collect.ts",
        "  - fail.ts\n  - ../_extensions/Afonenko-Course-Tools/course-site/entrypoints/collect.ts",
      ),
    );
    const failed = await capture(["render", ".", "--profile", "student"], root);
    assert(
      !failed.success && text(failed.stderr).includes("TEMPLATE_LATE_FAILURE"),
      "Expected late native build failure",
    );
    await Deno.writeTextFile(config, original);
    await remove(join(part, "fail.ts"));
    // Retry must exclude poisoned retained output and deleted document files.
    await Deno.writeTextFile(
      join(part, "_output/student/stale.html"),
      "STALE_PRIVATE_OUTPUT",
    );
    await Deno.writeTextFile(
      join(part, "_generated/course-spec/stale-document.json"),
      '{"source":"deleted.qmd","private":"STALE_PRIVATE_OUTPUT"}',
    );
    await command(["render", ".", "--profile", "student"], root);
    assert(
      !(await exists(join(root, "_site-student/handbook/stale.html"))),
      "Retry retained stale private output",
    );
    await search(root, "neutral", "student");
    // An ordinary author hook generates an extra native input.
    await Deno.writeTextFile(
      join(part, "generate.ts"),
      "await Deno.writeTextFile('generated.qmd', '# Generated handbook {#sec-generated-handbook}\\n\\nFRESH_GENERATED_HANDBOOK\\n');\n",
    );
    await Deno.writeTextFile(
      config,
      original.replace(
        "  type: book\n",
        "  type: default\n  render: ['*.qmd']\n",
      ).replace("  pre-render:\n", "  pre-render:\n  - generate.ts\n"),
    );
    await command(["render", ".", "--profile", "student"], root);
    assert(
      (await Deno.readTextFile(
        join(root, "_site-student/handbook/generated.html"),
      )).includes("FRESH_GENERATED_HANDBOOK"),
      "Generated author input missing",
    );
    await Deno.writeTextFile(config, original);
    await remove(join(part, "generate.ts"));
    await remove(join(part, "generated.qmd"));
    await command(["render", ".", "--profile", "student"], root);
    assert(
      !(await exists(join(root, "_site-student/handbook/generated.html"))),
      "Removed author input still published",
    );
    const rows: { href: string }[] = JSON.parse(
      await Deno.readTextFile(join(root, "_site-student/search.json")),
    );
    assert(
      !rows.some((row) => row.href.includes("generated.html")),
      "Removed author input remains in search",
    );
    await command(["run", join(ROOT, "tests/check.ts"), root], ROOT);
    console.log(
      "PASS selected native render, late failure/retry, stale exclusion, generated and removed input, current search",
    );
  } finally {
    await Deno.writeTextFile(config, original);
    for (const file of ["fail.ts", "generate.ts", "generated.qmd"]) {
      await remove(join(part, file));
    }
    if (previousTrace === undefined) Deno.env.delete("COURSE_BUILD_TRACE");
    else Deno.env.set("COURSE_BUILD_TRACE", previousTrace);
  }
}
if (import.meta.main) await lifecycle(workspaceArg());
