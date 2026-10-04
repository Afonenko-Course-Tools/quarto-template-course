import { runQuartoTests } from "./support/quarto-test-runner.ts";
import { completeRetentionReport } from "./support/actual-main-retention-report.ts";
const suites = [
  "contracts/actual-main/receipt_test.ts",
  "contracts/actual-main/public_test.ts",
  "contracts/actual-main/split_test.ts",
  "transport/actual-main-public-transfer_test.ts",
  "diagnostics/actual-main-retention_test.ts",
];
if (import.meta.main) {
  // Explicit paths select a suite; a flags-only invocation runs all 163 checks.
  const hasPath = Deno.args.some((arg) =>
    /(?:_test\.ts|\/tests\/?$)$/.test(arg)
  );
  const code = await runQuartoTests(
    hasPath ? [] : suites.map((path) => new URL(path, import.meta.url)),
  );
  if (!hasPath) await completeRetentionReport(code, Deno.args);
  Deno.exit(code);
}
