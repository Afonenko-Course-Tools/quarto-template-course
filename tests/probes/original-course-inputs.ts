// Native inspect regression for the same fixed mount used by actual-main-consumer.
// No provider installation/render or frozen-publication acceptance is claimed here.
import { dirname, fromFileUrl, join, relative, resolve } from "stdlib/path";
import { originalCourseFiles } from "./original-course-source.ts";
import {
  assert,
  checkoutSource,
  command,
  exact,
  hash,
  treeHashes,
} from "./actual-main-evidence.ts";
const repo = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
assert(
  Deno.args.length === 2 && Deno.args[0] === "--output",
  "--output <fresh-evidence> required",
);
const output = resolve(Deno.args[1]);
await Deno.mkdir(output);
const checkout = await checkoutSource(repo),
  root = await Deno.makeTempDir({ prefix: "original-inputs-" });
const expectedMounted = originalCourseFiles(checkout.files);
const origins = originalCourseFiles(
  Object.fromEntries(Object.keys(checkout.files).map((path) => [path, path])),
);
// This is the current actual consumer's native construction, not an additive fixture copy.
for (const [target, source] of Object.entries(origins)) {
  await Deno.mkdir(dirname(join(root, target)), { recursive: true });
  await Deno.copyFile(join(repo, source), join(root, target));
  assert(
    await hash(join(root, target)) === expectedMounted[target],
    `copied bytes differ: ${target}`,
  );
}
exact(
  await treeHashes(root),
  expectedMounted,
  "native construction differs from mounted Source map",
);
const expected: Record<string, string[]> = {
  book: [
    "index.qmd",
    "topics/contracts/index.qmd",
    "topics/contracts/demonstration.qmd",
    "labs/01.qmd",
  ],
  essay: [
    "index.qmd",
    "text/index.qmd",
    "text/representation/index.qmd",
    "text/decoding/index.qmd",
    "text/immutability/index.qmd",
  ],
  lectures: ["01/contracts.qmd"],
  practice: ["01/clamp.qmd"],
  handouts: ["contracts.qmd"],
};
const quarto = Deno.env.get("QUARTO") || "quarto";
const version = (await command(quarto, ["--version"], repo)).trim();
assert(["1.10.18", "1.11.5"].includes(version), "stock channel required");
const observations = [];
for (const profile of ["student", "full"]) {
  for (const [member, wanted] of Object.entries(expected)) {
    const raw = await command(quarto, [
      "inspect",
      join(root, member),
      "--profile",
      profile,
    ], root);
    await Deno.writeTextFile(join(output, `${member}-${profile}.json`), raw);
    const inspected = JSON.parse(raw);
    const actual = inspected.files.input.map((path: string) =>
      relative(join(root, member), path)
    );
    observations.push({
      profile,
      member,
      expected: wanted,
      actual,
      matches: JSON.stringify(actual) === JSON.stringify(wanted),
    });
  }
}
await Deno.writeTextFile(
  join(output, "result.json"),
  JSON.stringify(
    {
      version,
      root,
      checkout: {
        commit: checkout.commit,
        tree: checkout.tree,
        dirty: checkout.dirty,
      },
      sourceFiles: Object.keys(checkout.files).length,
      mountedFiles: Object.keys(expectedMounted).length,
      mountedMapVerified: true,
      observations,
    },
    null,
    2,
  ),
);
const failed = observations.filter((item) => !item.matches);
assert(
  !failed.length,
  `Original selected inputs changed: ${JSON.stringify(failed)}`,
);
console.log(
  `PASS Original exact inputs: five members × student/full on ${version}; complete mounted byte map verified`,
);
