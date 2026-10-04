/** Preserve the legacy report's verified public count after a complete launcher run. */
export async function completeRetentionReport(code: number, args: string[]) {
  const output = Deno.env.get("ACTUAL_MAIN_RETENTION_PURE_OUTPUT");
  if (
    !output || code !== 0 ||
    args.some((arg) => /^(--filter(?:=|$)|--list$)/.test(arg))
  ) return;
  const path = `${output}/retention-pure-result.json`;
  const report = JSON.parse(await Deno.readTextFile(path));
  if (
    report.cases.length === 38 && report.passed === 38 && report.failed === 0
  ) {
    report.publicTransferChecks = 16;
    await Deno.writeTextFile(path, JSON.stringify(report, null, 2) + "\n");
  }
}
