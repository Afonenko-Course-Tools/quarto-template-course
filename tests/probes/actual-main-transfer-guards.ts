// Compatibility entrypoint: execute the bundled test runner and propagate its exit.
import { runQuartoTests } from "../support/quarto-test-runner.ts";
import { completeRetentionReport } from "../support/actual-main-retention-report.ts";
if (import.meta.main) {
  const code = await runQuartoTests([
    new URL(
      "../transport/actual-main-public-transfer_test.ts",
      import.meta.url,
    ),
    new URL("../diagnostics/actual-main-retention_test.ts", import.meta.url),
  ]);
  await completeRetentionReport(code, Deno.args);
  Deno.exit(code);
}
