import { copy } from "stdlib/fs";
import { fromFileUrl, join } from "stdlib/path";
import { check } from "../../support/contract-cases.ts";

const repo = fromFileUrl(new URL("../../../", import.meta.url));
const members = ["theory", "lectures", "practice", "handbook"];
const quarto = Deno.env.get("QUARTO") || "quarto";

async function render(root: string) {
  const result = await new Deno.Command(quarto, {
    args: ["render", "--profile", "full"],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    ...result,
    text: new TextDecoder().decode(result.stdout) +
      new TextDecoder().decode(result.stderr),
  };
}

for (const member of members) {
  Deno.test(`neutral ${member} runs Core before Presentation without a canonical owner`, async () => {
    const temporary = await Deno.makeTempDir({ prefix: `neutral-${member}-` });
    const root = join(temporary, member);
    try {
      // Each native project must discover its own complete Core installation.
      await copy(join(repo, member), root);
      const inspected = await new Deno.Command(quarto, {
        args: ["inspect", ".", "--profile", "full"],
        cwd: root,
        stdout: "piped",
        stderr: "piped",
      }).output();
      check(inspected.success, new TextDecoder().decode(inspected.stderr));
      const native = JSON.parse(new TextDecoder().decode(inspected.stdout));
      check(
        native.extensions.some((
          extension: { id?: { name?: string }; path: string },
        ) =>
          extension.id?.name === "course-core" && extension.path ===
            join(root, "_extensions/Afonenko-Course-Tools/course-core")
        ),
        "member must discover its installed Core before rendering",
      );
      const result = await render(root);
      check(result.success, result.text);
      const fragments = [];
      for await (
        const entry of Deno.readDir(join(root, "_generated/course-spec/core"))
      ) {
        if (entry.isFile && entry.name.endsWith(".json")) {
          fragments.push(JSON.parse(
            await Deno.readTextFile(
              join(root, "_generated/course-spec/core", entry.name),
            ),
          ));
        }
      }
      check(
        fragments.length === 1 &&
          fragments[0].course.id === `course-${member}` &&
          fragments[0].course.view === "full" &&
          fragments[0].source === "index.qmd" &&
          fragments[0].exercises.length === 0,
        `non-owner member must actually be processed by Core: ${
          JSON.stringify(fragments)
        }`,
      );
      const output = await Deno.readTextFile(
        join(root, "_output/full/index.html"),
      );
      check(
        output.includes(`id="sec-${member}"`),
        "native member output missing",
      );
      if (member === "theory") {
        check(
          output.includes('id="exm-observation"'),
          "ordinary display example lost",
        );
        const config = join(root, "_quarto.yml"),
          original = await Deno.readTextFile(config);
        await Deno.writeTextFile(
          config,
          original.replace(
            "filters: [course-core, course-presentation]",
            "filters: [course-presentation, course-core]",
          ),
        );
        const reversed = await render(root);
        check(
          !reversed.success &&
            reversed.text.includes(
              "Фильтр course-core должен предшествовать course-presentation",
            ),
          `reversed processing order must retain its refusal: ${reversed.text}`,
        );
        await Deno.writeTextFile(config, original);
        await Deno.writeTextFile(
          join(root, "index.qmd"),
          (await Deno.readTextFile(join(root, "index.qmd"))) +
            '\n## Unsupported declaration {#sec-unsupported}\n\n::: {#exr-unsupported course-role="discussion" difficulty="introductory" target="manual"}\n## Canonical exercise\n\nRequires its canonical owner.\n:::\n',
        );
        const canonical = await render(root);
        check(
          !canonical.success &&
            canonical.text.includes("SOURCE.OWNER_PREFLIGHT_REQUIRED"),
          `adding canonical pedagogy must still require an owner: ${canonical.text}`,
        );
      }
    } finally {
      await Deno.remove(temporary, { recursive: true });
    }
  });
}
