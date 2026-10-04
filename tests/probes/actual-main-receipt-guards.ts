// Compatibility entrypoint: execute the bundled test runner and propagate its exit.
import { runQuartoTests } from "../support/quarto-test-runner.ts";
export { expected, fixture } from "../support/actual-main-fixture.ts";
export async function runActualMainReceiptGuards() {
  return await runQuartoTests([
    new URL("../contracts/actual-main/receipt_test.ts", import.meta.url),
  ]);
}
if (import.meta.main) {
  Deno.exit(
    await runQuartoTests([
      new URL("../contracts/actual-main/receipt_test.ts", import.meta.url),
    ]),
  );
}
