// Concrete installation-review regressions for the fixture's private input area.
import owner from "../../fixtures/probes/artifacts/owner.ts";
import verify from "../../fixtures/probes/artifacts/verify.ts";
import { assert, join } from "../../fixtures/probes/artifacts/common.ts";
const root = await Deno.makeTempDir({ prefix: "artifact-guard-regression-" });
const sourceRoot = join(root, "source"), stage = join(root, "stage");
const ctx = {
  root: sourceRoot,
  sourceRoot,
  stage,
  attemptId: "guard-review",
  profiles: ["student"],
  members: [],
};
const privateInput = '{"fixture":"PRIVATE_KEY_AND_SOLUTION"}\n';
async function rejects(
  label: string,
  action: () => Promise<void>,
  expected: string,
) {
  try {
    await action();
  } catch (e) {
    assert(String(e).includes(expected), `${label}: wrong error ${e}`);
    console.log(`PASS ${label}`);
    return;
  }
  throw new Error(`${label}: accepted private fixture input`);
}
try {
  await Deno.mkdir(join(sourceRoot, "_probe"), { recursive: true });
  await Deno.mkdir(stage);
  await Deno.writeTextFile(
    join(sourceRoot, "_probe/package.json"),
    privateInput,
  );
  await Deno.writeTextFile(
    join(sourceRoot, "_probe/policy.json"),
    JSON.stringify({
      schema: "trusted-resource-policy-fixture-v1",
      resources: [],
    }),
  );
  await Deno.writeTextFile(join(sourceRoot, "index.qmd"), "# Public fixture\n");
  await Deno.writeTextFile(join(stage, "renamed.json"), privateInput);
  await rejects(
    "renamed private bundle before commit",
    () => verify.finalize(ctx),
    "PRIVATE_FIXTURE_INPUT",
  );
  await Deno.remove(join(stage, "renamed.json"));
  await Deno.mkdir(join(stage, "_probe"));
  await Deno.writeTextFile(join(stage, "_probe/unlisted.txt"), "service input");
  await rejects(
    "private service area before commit",
    () => verify.finalize(ctx),
    "SERVICE_FINAL_RESOURCE",
  );
  for (const selected of ["_probe/package.json", "_probe"]) {
    await Deno.writeTextFile(
      join(sourceRoot, "_quarto.yml"),
      JSON.stringify({
        project: {
          type: "default",
          "output-dir": "_site",
          render: ["index.qmd"],
          resources: [selected],
        },
        format: "html",
      }),
    );
    await rejects(
      `native private selection ${selected}`,
      () => owner.beforeRender(ctx),
      "SERVICE_RESOURCE_SELECTION",
    );
  }
} finally {
  await Deno.remove(root, { recursive: true });
}
