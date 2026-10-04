import { check } from "../../support/contract-cases.ts";
const assertEquals = (actual: unknown, expected: unknown) =>
  check(actual === expected, `${actual} !== ${expected}`);
const assertNotEquals = (actual: unknown, expected: unknown) =>
  check(
    actual !== expected,
    "changed Original bytes must change mounted bytes",
  );
import { originalCourseFiles } from "../../probes/original-course-source.ts";
Deno.test("Original uses authenticated relocated source and preserves whole-source bytes", () => {
  const files = {
    "_quarto.yml": "neutral-config",
    "index.qmd": "neutral-portal",
    "lectures/index.qmd": "neutral-lecture",
    "practice/index.qmd": "neutral-practice",
    "lectures/assets/neutral.txt": "neutral-resource",
    "lectures/_extensions/package/payload": "installed-slides",
    "fixtures/probes/original-course/_quarto.yml": "original-config",
    "fixtures/probes/original-course/index.qmd": "original-portal",
    "fixtures/probes/original-course/lectures/01/contracts.qmd":
      "original-lecture",
    "fixtures/probes/original-course/book/topics/contracts/_control.qmd":
      "closed-control",
    "book/_extensions/package/payload": "installed-package",
    "tests/probes/actual-main-consumer.ts": "runner",
  };
  const mapped = originalCourseFiles(files);
  assertEquals(mapped["_quarto.yml"], "original-config");
  assertEquals(mapped["index.qmd"], "original-portal");
  assertEquals(mapped["lectures/01/contracts.qmd"], "original-lecture");
  assertEquals(mapped["lectures/index.qmd"], undefined);
  assertEquals(mapped["practice/index.qmd"], undefined);
  assertEquals(mapped["lectures/assets/neutral.txt"], undefined);
  assertEquals(
    mapped["lectures/_extensions/package/payload"],
    "installed-slides",
  );
  assertEquals(files["lectures/index.qmd"], "neutral-lecture");
  assertEquals(files["practice/index.qmd"], "neutral-practice");
  assertEquals(mapped["book/topics/contracts/_control.qmd"], "closed-control");
  assertEquals(mapped["book/_extensions/package/payload"], "installed-package");
  assertEquals(mapped["tests/probes/actual-main-consumer.ts"], "runner");
  assertEquals(
    mapped["fixtures/probes/original-course/_quarto.yml"],
    "original-config",
  );
  assertEquals(files["_quarto.yml"], "neutral-config");
  const changed = {
    ...files,
    "fixtures/probes/original-course/index.qmd": "tampered",
  };
  assertNotEquals(
    originalCourseFiles(changed)["index.qmd"],
    mapped["index.qmd"],
  );
});
Deno.test("Original cannot fall back to neutral source when its origin is missing", () => {
  for (const missing of ["_quarto.yml", "index.qmd"]) {
    const files: Record<string, string> = {
      "_quarto.yml": "neutral",
      "index.qmd": "neutral",
      "fixtures/probes/original-course/_quarto.yml": "original",
      "fixtures/probes/original-course/index.qmd": "original",
    };
    delete files[`fixtures/probes/original-course/${missing}`];
    let rejected = false;
    try {
      originalCourseFiles(files);
    } catch (e) {
      rejected = String(e).includes("origin");
    }
    check(
      rejected,
      `missing Original origin ${missing} must not use neutral bytes`,
    );
  }
});
Deno.test("Original origin cannot carry a second installed extension tree", () => {
  let rejected = false;
  try {
    originalCourseFiles({
      "fixtures/probes/original-course/_quarto.yml": "original",
      "fixtures/probes/original-course/index.qmd": "original",
      "fixtures/probes/original-course/book/_extensions/payload":
        "hidden-package",
    });
  } catch (e) {
    rejected = String(e).includes("origin");
  }
  check(
    rejected,
    "installed package origins must stay the shared authenticated runtime",
  );
});

Deno.test("Original receipts refuse neutral hashes substituted at mounted authored paths", async () => {
  const { aggregateActualMain } = await import(
    "../../probes/actual-main-contract.ts"
  );
  const { expected, fixture } = await import(
    "../../support/actual-main-fixture.ts"
  );
  check(
    aggregateActualMain(fixture(), expected).totalNativeCases === 6,
    "unmodified Original evidence must remain valid before origin mutations",
  );
  for (const field of ["authorConfigs", "authorInputs"] as const) {
    const observations = fixture(),
      path = field === "authorConfigs" ? "_quarto.yml" : "index.qmd";
    const observation = observations[0].observations[0];
    observation[field].before[path] = expected.template.files[path];
    observation[field].after[path] = expected.template.files[path];
    let rejected = false;
    try {
      aggregateActualMain(observations, expected);
    } catch (e) {
      rejected = String(e).includes(
        field === "authorConfigs"
          ? "complete exact authored source"
          : "original full course checkout",
      );
    }
    check(rejected, `neutral bytes must not substitute Original ${field}`);
  }
});
Deno.test("Original full-source authentication rejects changed relocated private source", async () => {
  const { aggregateActualMain } = await import(
    "../../probes/actual-main-contract.ts"
  );
  const { expected, fixture, h } = await import(
    "../../support/actual-main-fixture.ts"
  );
  const observations = fixture();
  for (const item of observations) {
    item.manifest.templateSource
      .files[
        "fixtures/probes/original-course/book/topics/contracts/_control.qmd"
      ] = h(999, 64);
    item.receipt.templateSource = structuredClone(item.manifest.templateSource);
  }
  let rejected = false;
  try {
    aggregateActualMain(observations, expected);
  } catch (e) {
    rejected = String(e).includes(
      "Template bytes differ from exact aggregation checkout",
    );
  }
  check(
    rejected,
    "whole Source must authenticate relocated private author bytes too",
  );
});
