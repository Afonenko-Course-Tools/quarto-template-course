/** Only presentation options preserve the launcher's complete-suite guarantee. */
function presentationOnly(args: string[]): boolean {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (["--quiet", "-q", "--hide-stacktraces"].includes(arg)) continue;
    const equals = arg.indexOf("=");
    const option = equals < 0 ? arg : arg.slice(0, equals);
    if (!["--junit-path", "--reporter"].includes(option)) return false;
    const value = equals < 0 ? args[++i] : arg.slice(equals + 1);
    if (!value || value.startsWith("--")) return false;
    if (
      option === "--reporter" &&
      !["pretty", "dot", "junit", "tap"].includes(value)
    ) return false;
  }
  return true;
}
/** Preserve the legacy report's verified public count after a complete launcher run. */
export async function completeRetentionReport(code: number, args: string[]) {
  const output = Deno.env.get("ACTUAL_MAIN_RETENTION_PURE_OUTPUT");
  // Forward other flags to Deno, but never infer complete execution from them.
  // In particular, ignore/filter/no-run and future selection/sharding options
  // can omit public tests while leaving successful diagnostic rows behind.
  if (!output || code !== 0 || !presentationOnly(args)) return;
  const path = `${output}/retention-pure-result.json`;
  const report = JSON.parse(await Deno.readTextFile(path));
  if (
    report.cases.length === 38 && report.passed === 38 && report.failed === 0
  ) {
    report.publicTransferChecks = 16;
    await Deno.writeTextFile(path, JSON.stringify(report, null, 2) + "\n");
  }
}
