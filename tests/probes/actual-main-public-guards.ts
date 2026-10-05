// Compatibility entrypoint: execute the bundled test runner and propagate its exit.
import { runQuartoTests } from "../support/quarto-test-runner.ts";
if (import.meta.main) {
  Deno.exit(
    await runQuartoTests([
      new URL("../contracts/actual-main/public_test.ts", import.meta.url),
    ]),
  );
}
