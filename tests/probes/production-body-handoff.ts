// Installed consumer authority: the current native owner body, never a fixture exporter.
import { dirname, join, relative, resolve, toFileUrl } from "stdlib/path";
import {
  assert,
  command,
  exists,
  files,
  hash,
} from "../../fixtures/probes/artifacts/common.ts";
const arg = (name: string) => {
  const at = Deno.args.indexOf(name);
  return at < 0 ? undefined : Deno.args[at + 1];
};
const quarto = Deno.env.get("QUARTO") || "quarto";
const output = resolve(
  arg("--output") ||
    await Deno.makeTempDir({ prefix: "body-handoff-evidence-" }),
);
const owner = await Deno.makeTempDir({ prefix: "body-handoff-owner-" });
await Deno.mkdir(output, { recursive: true });
const packages: unknown[] = [];
for (
  const [name, paths] of [["core", ["course-core", "course-presentation"]], [
    "print",
    ["course-print"],
  ]] as const
) {
  const repository = arg(`--${name}`);
  assert(repository, `--${name} required`);
  const revision = arg(`--${name}-ref`) || "HEAD";
  const commit =
    (await command("git", ["rev-parse", `${revision}^{commit}`], repository))
      .trim();
  const tree =
    (await command("git", ["rev-parse", `${commit}^{tree}`], repository))
      .trim();
  const archive = join(output, `${name}.tar.gz`);
  await command("git", [
    "archive",
    "--format=tar.gz",
    `--output=${archive}`,
    commit,
    ...paths.map((p) => `_extensions/${p}`),
  ], repository);
  const snapshot = await Deno.makeTempDir({ prefix: `body-handoff-${name}-` });
  await command("tar", ["-xzf", archive, "-C", snapshot], output);
  await command(quarto, ["add", archive, "--no-prompt"], owner);
  const installed: unknown[] = [];
  for (const extension of paths) {
    const source = join(snapshot, "_extensions", extension),
      target = join(owner, "_extensions", extension);
    const expected = (await files(source)).map((path) => relative(source, path))
      .sort();
    assert(
      JSON.stringify(expected) ===
        JSON.stringify(
          (await files(target)).map((path) => relative(target, path)).sort(),
        ),
      `installed ${extension} file set`,
    );
    const entries = [];
    for (const path of expected) {
      const sha256 = await hash(join(source, path));
      assert(
        sha256 === await hash(join(target, path)),
        `installed ${extension}/${path} bytes`,
      );
      entries.push({ path, sha256 });
    }
    installed.push({ extension, files: entries });
  }
  packages.push({
    name,
    commit,
    tree,
    archiveSha256: await hash(archive),
    installed,
  });
}
await Deno.writeTextFile(
  join(output, "install-manifest.json"),
  JSON.stringify({ owner, packages }, null, 2),
);
const write = (path: string, text: string) =>
  Deno.writeTextFile(join(owner, path), text);
await write(
  "_quarto.yml",
  `project:
  type: book
  output-dir: _site
  execute-dir: project
  pre-render:
    - _extensions/course-core/entrypoints/pre.ts
    - _extensions/course-core/entrypoints/owner-freeze.ts
  post-render:
    - _extensions/course-core/entrypoints/post.ts
format:
  html:
    theme: none
book:
  title: Current owner body
  chapters: [index.qmd, corpus.qmd, work-one.qmd, work-two.qmd]
execute:
  cache: false
  freeze: false
course:
  id: body-consumer
  validate: true
filters: [course-core, course-presentation]
`,
);
await write("index.qmd", "# Current owner {#sec-body-index}\n");
for (const profile of ["student", "full"]) {
  await write(`_quarto-${profile}.yml`, `course:\n  view: ${profile}\n`);
}
await write(
  "corpus.qmd",
  `---
title: Canonical question chapter
engine: knitr
---

## Canonical questions {#sec-body-bank}

:::: {#exr-body target="manual"}
## Explain the result

Explain $x^2+1$ and the [ordinary course reference](https://example.org/course).

\`\`\`{r body-condition}
#| echo: false
#| results: asis
write("executed", file=".course-owner/engine-count", append=TRUE)
cat("COMPUTED_CURRENT_OWNER_BODY 42.\\n\\n")
cat("| Input | Result |\\n|---|---|\\n| 6 | 42 |\\n\\n")
\`\`\`

\`\`\`{r body-plot}
#| echo: false
plot(1:3, c(1,4,9), type="b")
\`\`\`

::: {.grading-notes}
GRADING_PRIVATE_BODY_KEY
:::
::::

::: {#sol-body .when-full}
TEACHER_PRIVATE_BODY_SOLUTION
:::
`,
);
for (
  const [name, id, kind] of [["work-one", "sec-body-one", "lab"], [
    "work-two",
    "sec-body-two",
    "test",
  ]]
) {
  await write(
    `${name}.qmd`,
    `---\ntitle: Current ${name} chapter\nassessment:\n  kind: ${kind}\n---\n\n## Current ${name} {#${id}}\n\n::: {.assessment-items}\n1. @exr-body\n:::\n`,
  );
}
const api = await import(
  toFileUrl(join(owner, "_extensions/course-core/owner-preflight/owner.ts"))
    .href
);
const prepared = await api.prepareOwner(owner, {
  attemptId: "body-consumer-native",
  profile: "student",
  body: { sources: ["corpus.qmd", "work-one.qmd", "work-two.qmd"] },
});
const overlay = await api.activateOwner(prepared);
const metadata = join(owner, ".course-owner/render-metadata.json");
await Deno.writeTextFile(metadata, JSON.stringify(overlay));
const native = await new Deno.Command(quarto, {
  args: ["render", "--profile", "student", "--metadata-file", metadata],
  cwd: owner,
  stdout: "piped",
  stderr: "piped",
}).output();
const nativeLog = new TextDecoder().decode(native.stdout) +
  new TextDecoder().decode(native.stderr);
await Deno.writeTextFile(join(output, "native.log"), nativeLog);
assert(
  native.code === 0,
  `native owner must exit zero before body authority check: ${
    nativeLog.slice(-6000)
  }`,
);
const finished = await api.finishOwner(prepared);
await Deno.writeTextFile(
  join(output, "finish.json"),
  JSON.stringify(finished, null, 2),
);
assert(
  finished.exitCode === 0,
  `native owner finish must succeed: ${JSON.stringify(finished)}`,
);
assert(
  await Deno.readTextFile(join(owner, ".course-owner/engine-count")) ===
    "executed\n",
  "native owner engine must execute exactly once",
);
const html = await Deno.readTextFile(join(owner, "_site/corpus.html"));
assert(
  html.includes("COMPUTED_CURRENT_OWNER_BODY") && html.includes("<table") &&
    html.includes("figure-html"),
  "actual computed body must exist before handoff check",
);
console.log(
  `Native zero, finish zero, one real R pass, actual paragraph/table/plot: ${owner}`,
);
const body = finished.report.body;
assert(
  body?.schema === "course-body-handle-v1",
  "MISSING_CURRENT_OWNER_BODY_HANDLE after successful native zero + finish + one engine pass",
);
assert(
  typeof api.validateOwnerBodies === "function",
  "installed current body validator required",
);
const checked = await api.validateOwnerBodies(prepared, body);
assert(
  checked.publicPackage.schema === "course-body-package-v1",
  "truthful production body schema required",
);
assert(
  JSON.stringify(checked.publicPackage).includes("COMPUTED_CURRENT_OWNER_BODY"),
  "Print handoff omitted actual computed condition",
);
assert(
  !/GRADING_PRIVATE_BODY_KEY|TEACHER_PRIVATE_BODY_SOLUTION/.test(
    JSON.stringify(checked.publicPackage),
  ),
  "private body entered public Print handoff",
);
assert(
  checked.publicPackage.resources.some((r: any) =>
    r.source.includes("figure-html")
  ),
  "actual owner plot resource missing",
);
await Deno.writeTextFile(
  join(output, "public-package.json"),
  JSON.stringify(checked.publicPackage),
);
const resources = await import(
  toFileUrl(join(owner, "_extensions/course-core/owner-preflight/resources.ts"))
    .href
);
const index = await resources.validateOwnerResources(prepared);
assert(
  checked.receipt.resources.every((r: any) =>
    index.files.some((f: any) => f.path === r.source && f.sha256 === r.sha256)
  ),
  "body resources must retain the checked current owner index binding",
);
console.log(
  "PASS current native owner body handoff; checked public package only",
);
