import { copy } from "stdlib/fs";
import { fromFileUrl, join } from "stdlib/path";
import { check } from "../../support/contract-cases.ts";
import { fixture } from "../../../fixtures/probes/portal/fixture.ts";
import { hash, write } from "../../../fixtures/probes/portal/common.ts";
import { auditNavigation } from "../../../_extensions/Afonenko-Course-Tools/course-core/owner-preflight/navigation.ts";
import { evaluate } from "../../../_extensions/Afonenko-Course-Tools/course-core/owner-preflight/owner.ts";

const core = fromFileUrl(
  new URL(
    "../../../_extensions/Afonenko-Course-Tools/course-core/",
    import.meta.url,
  ),
);
const resourceFixtures = fromFileUrl(
  new URL(
    "../../../fixtures/probes/resources/",
    import.meta.url,
  ),
);
const extension = "_extensions/Afonenko-Course-Tools/course-core";

async function navigationFixture(temporary: string) {
  const root = join(temporary, "source");
  await copy(core, join(root, extension));
  await write(
    root,
    "_quarto.yml",
    `project:
  type: website
  output-dir: .project-publish/native
  render: []
  resources: ["!fixtures/**"]
  pre-render: ${extension}/entrypoints/owner-freeze.ts
format:
  html:
    theme: none
filters: [course-core]
course:
  id: fixture-discovery
`,
  );
  await write(root, "_quarto-student.yml", "course:\n  view: student\n");
  await write(
    root,
    "_quarto-publish-portal.yml",
    "project:\n  render: [index.qmd]\n",
  );
  await write(root, "index.qmd", "# Portal {#sec-portal}\n");
  const configHashes = Object.fromEntries(
    await Promise.all(
      ["_quarto.yml", "_quarto-student.yml", "_quarto-publish-portal.yml"].map(
        async (path) => [join(root, path), await hash(join(root, path))],
      ),
    ),
  );
  const control = join(root, "_quarto-publish-portal.yml");
  return {
    root,
    scope: {
      portal: {
        input: join(root, "index.qmd"),
        output: join(temporary, "output"),
        renderProfiles: ["student", "publish-portal"],
        control,
        controlHash: configHashes[control],
        configHashes,
      },
      members: [],
    },
  };
}

Deno.test("native owner discovery excludes shared projection data", async () => {
  const temporary = await Deno.makeTempDir({ prefix: "fixture-discovery-" });
  try {
    const { root, scope } = await navigationFixture(temporary);
    // Copy the actual directory: adding a QMD data fixture must break this test.
    await copy(resourceFixtures, join(root, "fixtures/probes/resources"));
    const audit = await auditNavigation(root, extension, "student", scope);
    check(
      JSON.stringify(Object.keys(audit.coverage)) === '["index.qmd"]' &&
        audit.navigation?.dormant.length === 0,
      "projection data must not become an authored input or dormant owner",
    );
  } finally {
    await Deno.remove(temporary, { recursive: true });
  }
});

Deno.test("native owner discovery still refuses an uncovered authored QMD", async () => {
  const temporary = await Deno.makeTempDir({ prefix: "fixture-uncovered-" });
  try {
    const { root, scope } = await navigationFixture(temporary);
    await write(
      root,
      "fixtures/uncovered.qmd",
      "# Unowned authored document\n",
    );
    let refusal: unknown;
    try {
      await auditNavigation(root, extension, "student", scope);
    } catch (error) {
      refusal = error;
    }
    check(
      refusal instanceof Error &&
        refusal.message === 'SOURCE.UNCOVERED_QMD: "fixtures/uncovered.qmd"',
      `unknown authored input must retain its exact refusal: ${refusal}`,
    );
  } finally {
    await Deno.remove(temporary, { recursive: true });
  }
});

// Native reader facts and the installed inventory policy, without a publication
// lifecycle claim. Running both readers preserves authored Header identity.
async function inventory(temporary: string, body: string) {
  const input = join(temporary, "input.md"),
    filter = join(temporary, "facts.lua");
  await Deno.writeTextFile(
    input,
    "---\ncourse:\n  id: supported-tasks-fixture\n---\n" + body,
  );
  await Deno.writeTextFile(
    filter,
    `local collector = dofile(${
      JSON.stringify(join(core, "owner-preflight/occurrences.lua"))
    })\n` +
      'function Pandoc(doc) io.write(pandoc.json.encode(collector.collect(doc,"index.qmd"))); return pandoc.Pandoc({}) end\n',
  );
  const facts = [];
  for (const reader of ["markdown", "markdown-auto_identifiers"]) {
    const result = await new Deno.Command(Deno.env.get("QUARTO") || "quarto", {
      args: [
        "pandoc",
        "--from",
        reader,
        "--to",
        "plain",
        "--lua-filter",
        filter,
        input,
      ],
      cwd: temporary,
      stdout: "piped",
      stderr: "piped",
    }).output();
    check(result.success, new TextDecoder().decode(result.stderr));
    facts.push(JSON.parse(new TextDecoder().decode(result.stdout)));
  }
  const raw = { ...facts[0], identity: facts[1] };
  const report = await evaluate(
    { mode: "inventory", before: [raw], after: [] },
    temporary,
  );
  return { raw, report };
}

Deno.test("native portal fixture satisfies Head and preserves inventory/root refusals", async () => {
  const temporary = await Deno.makeTempDir({ prefix: "portal-fixture-head-" });
  try {
    await fixture(join(temporary, "portal"), true);
    const body = await Deno.readTextFile(
      join(temporary, "portal/tasks/index.qmd"),
    );
    const { raw, report } = await inventory(temporary, body);
    check(report.diagnostics.length === 0, JSON.stringify(report));
    check(
      report.exercises.length === 1 && report.exercises[0].id === "exr-known" &&
        report.exercises[0].sourceTopic.id === "sec-fixture-questions",
      `fixture must retain its canonical exercise and topic: ${
        JSON.stringify(report)
      }`,
    );
    const broken = body.replace("## Supported fixture question\n", "");
    check(
      broken !== body,
      "missing Head mutation must change the native input",
    );
    const invalid = (await inventory(temporary, broken)).report;
    check(
      invalid.diagnostics.length === 1 &&
        invalid.diagnostics[0].code === "CORE.EXERCISE_INVALID" &&
        invalid.diagnostics[0].id === "exr-known" &&
        invalid.diagnostics[0].field === "head",
      `missing Head must retain the exact inventory refusal: ${
        JSON.stringify(invalid)
      }`,
    );
    const navigation = await evaluate(
      {
        assessment: false,
        pedagogy: false,
        rows: raw.occurrences.map((row: Record<string, unknown>) => ({
          kind: row.kind,
          id: row.id,
          classes: row.classes,
          attributes: row.attributes,
        })),
      },
      temporary,
      join(core, "owner-preflight/navigation.cue"),
    );
    check(
      navigation.diagnostics.length === 1 &&
        navigation.diagnostics[0].code ===
          "NAVIGATION.PEDAGOGICAL_OR_COMPUTED_BLOCK" &&
        navigation.diagnostics[0].id === "exr-known",
      `canonical exercise must remain forbidden at the navigation root: ${
        JSON.stringify(navigation)
      }`,
    );
  } finally {
    await Deno.remove(temporary, { recursive: true });
  }
});
