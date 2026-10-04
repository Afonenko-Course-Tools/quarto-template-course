/** Fixed Source-origin overlay, never a second source manifest or provider model.
 * Receipts authenticate every tracked checkout byte; this derives native Original
 * destinations from those authenticated bytes, including its private resources.
 */
export const ORIGINAL_COURSE = "fixtures/probes/original-course/";
export function originalCourseFiles<T>(
  files: Record<string, T>,
): Record<string, T> {
  for (const required of ["_quarto.yml", "index.qmd"]) {
    if (!Object.hasOwn(files, ORIGINAL_COURSE + required)) {
      throw new Error(`ACTUAL_MAIN: missing fixed Original origin ${required}`);
    }
  }
  // Complete checkout authentication stays in files. Active Original directories
  // contain only their frozen authored origins and shared installed runtimes;
  // neutral-only files must not enter historical wildcard render selections.
  const nativeDirectory =
    /^(?:book|essay|lectures|practice|handouts|_publication)\//;
  const installedRuntime =
    /^(?:book|essay|lectures|practice|handouts)\/_extensions\//;
  const mounted = Object.fromEntries(
    Object.entries(files).filter(([path]) =>
      !nativeDirectory.test(path) || installedRuntime.test(path)
    ),
  );
  for (const [source, value] of Object.entries(files)) {
    if (!source.startsWith(ORIGINAL_COURSE)) continue;
    const target = source.slice(ORIGINAL_COURSE.length);
    if (
      /^(?:_quarto(?:-[^/]*)?\.yml|index\.qmd)$/.test(target) ||
      nativeDirectory.test(target)
    ) {
      if (
        target.split("/").some((p) =>
          ["", ".", "..", "_extensions"].includes(p)
        )
      ) {
        throw new Error(
          `ACTUAL_MAIN: invalid Original authored origin ${source}`,
        );
      }
      mounted[target] = value;
    }
  }
  return mounted;
}
