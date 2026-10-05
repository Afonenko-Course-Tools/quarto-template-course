import { check } from "../../support/contract-cases.ts";
import { fromFileUrl, join } from "stdlib/path";

const fixture = new URL(
  "../../../fixtures/probes/resources/solution-visibility.txt",
  import.meta.url,
);
const installedCore = fromFileUrl(
  new URL(
    "../../../_extensions/Afonenko-Course-Tools/course-core/",
    import.meta.url,
  ),
);
const cases = [
  {
    name: "demonstration solution remains public",
    profile: "student",
    marker: "PUBLIC_DEMONSTRATION_SOL",
    visible: true,
  },
  {
    name: "demonstration solution remains public",
    profile: "full",
    marker: "PUBLIC_DEMONSTRATION_SOL",
    visible: true,
  },
  {
    name: "ordinary discussion solution stays closed",
    profile: "student",
    marker: "FULL_ONLY_DISCUSSION_SOL",
    visible: false,
  },
  {
    name: "ordinary discussion solution appears in full",
    profile: "full",
    marker: "FULL_ONLY_DISCUSSION_SOL",
    visible: true,
  },
];

for (const test of cases) {
  Deno.test(`native solution projection: ${test.name} (${test.profile})`, async () => {
    const temporary = await Deno.makeTempDir({
      prefix: "resource-solution-visibility-",
    });
    try {
      const input = join(temporary, "input.qmd"),
        filter = join(temporary, "projection.lua");
      await Deno.writeTextFile(
        input,
        `---\ncourse:\n  view: ${test.profile}\n---\n\n${await Deno
          .readTextFile(fixture)}`,
      );
      await Deno.writeTextFile(
        filter,
        `package.path = ${
          JSON.stringify(installedCore.replaceAll("\\", "/") + "?.lua;")
        } .. package.path\n` +
          'local visibility = require("visibility")\nfunction Pandoc(doc) return visibility.prepare(doc) end\n',
      );
      // The stock native reader executes the installed public projection. This
      // narrow test does not claim owner lifecycle or publication acceptance.
      const result = await new Deno.Command(
        Deno.env.get("QUARTO") || "quarto",
        {
          args: [
            "pandoc",
            "--from",
            "markdown",
            "--to",
            "html",
            "--lua-filter",
            filter,
            input,
          ],
          cwd: temporary,
          env: { QUARTO_PROFILE: test.profile },
          stdout: "piped",
          stderr: "piped",
        },
      ).output();
      check(result.success, new TextDecoder().decode(result.stderr));
      const html = new TextDecoder().decode(result.stdout);
      check(
        html.includes(test.marker) === test.visible,
        `${test.name}: ${test.marker} visibility must be ${test.visible}\n${html}`,
      );
    } finally {
      await Deno.remove(temporary, { recursive: true });
    }
  });
}
