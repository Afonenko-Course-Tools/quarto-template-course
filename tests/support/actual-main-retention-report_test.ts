// Focused report-completion regressions; the child files are deliberately tiny.
import { completeRetentionReport } from "./actual-main-retention-report.ts";
import { runQuartoTests } from "./quarto-test-runner.ts";
import { check } from "./contract-cases.ts";
async function withReport(
  action: (root: string, report: string) => Promise<void>,
) {
  const root = await Deno.makeTempDir({ prefix: "retention-report-" });
  const previous = Deno.env.get("ACTUAL_MAIN_RETENTION_PURE_OUTPUT");
  const report = `${root}/retention-pure-result.json`;
  try {
    // This is the report helper's input, not a producer/native success claim.
    await Deno.writeTextFile(
      report,
      JSON.stringify({
        cases: Array.from(
          { length: 38 },
          (_, i) => ({ name: `diagnostic ${i}`, status: "pass" }),
        ),
        passed: 38,
        failed: 0,
        publicTransferChecks: 0,
      }),
    );
    Deno.env.set("ACTUAL_MAIN_RETENTION_PURE_OUTPUT", root);
    await action(root, report);
  } finally {
    if (previous === undefined) {
      Deno.env.delete("ACTUAL_MAIN_RETENTION_PURE_OUTPUT");
    } else Deno.env.set("ACTUAL_MAIN_RETENTION_PURE_OUTPUT", previous);
    await Deno.remove(root, { recursive: true });
  }
}
for (const form of ["equals", "separate"] as const) {
  Deno.test(`retention report: public exclusion ${form} cannot claim 16 checks`, async () => {
    await withReport(async (root, report) => {
      const publicFile = `${root}/public_test.ts`,
        diagnosticFile = `${root}/diagnostic_test.ts`;
      await Deno.writeTextFile(
        publicFile,
        'Deno.test("excluded public check",()=>{throw new Error("public must not execute");});',
      );
      await Deno.writeTextFile(
        diagnosticFile,
        'Deno.test("selected diagnostic check",()=>{});',
      );
      const args = form === "equals"
        ? [`--ignore=${publicFile}`]
        : ["--ignore", publicFile];
      const code = await runQuartoTests([
        new URL(`file://${publicFile}`),
        new URL(`file://${diagnosticFile}`),
      ], args);
      check(
        code === (form === "equals" ? 0 : 1),
        "stock child must exclude the equals form and refuse unsupported separate-token syntax",
      );
      await completeRetentionReport(code, args);
      // Both forms must remain incomplete even when a caller supplies exit 0.
      await completeRetentionReport(0, args);
      check(
        JSON.parse(await Deno.readTextFile(report)).publicTransferChecks === 0,
        "excluded public suite cannot become 16 verified checks",
      );
    });
  });
}
Deno.test("retention report: no-run cannot turn cached modules into verified checks", async () => {
  await withReport(async (root, report) => {
    const file = `${root}/not-executed_test.ts`;
    await Deno.writeTextFile(
      file,
      'Deno.test("not executed",()=>{throw new Error("must not run");});',
    );
    const code = await runQuartoTests([new URL(`file://${file}`)], [
      "--no-run",
    ]);
    check(code === 0, "no-run child must cache without executing its failure");
    await completeRetentionReport(code, ["--no-run"]);
    check(
      JSON.parse(await Deno.readTextFile(report)).publicTransferChecks === 0,
      "cached-only test selection cannot claim executed public checks",
    );
  });
});
Deno.test("retention report: selection and unrecognized execution options remain incomplete", async () => {
  await withReport(async (_root, report) => {
    const original = await Deno.readTextFile(report);
    for (
      const args of [
        ["--filter", "diagnostic"],
        ["--filter=diagnostic"],
        ["--ignore=public_test.ts"],
        ["--ignore", "public_test.ts"],
        ["--list"],
        ["--help"],
        ["--permit-no-files"],
        ["--doc"],
        ["--preload", "selection.ts"],
        ["--shard=1/2"],
        ["--parallel"],
        ["--shuffle=1"],
        ["--watch-exclude=public_test.ts"],
        ["--", "--selection"],
        ["selected_test.ts"],
      ]
    ) {
      await completeRetentionReport(0, args);
      check(
        await Deno.readTextFile(report) === original,
        `selection ${args.join(" ")} cannot promote completion`,
      );
    }
  });
});
