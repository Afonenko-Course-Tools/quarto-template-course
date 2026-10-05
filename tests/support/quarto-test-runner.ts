/** Execute tests with the runtime and offline cache selected by `quarto run`. */
export async function runQuartoTests(
  files: URL[],
  args: string[] = Deno.args,
): Promise<number> {
  const share = Deno.env.get("QUARTO_SHARE_PATH");
  if (!share) {
    throw new Error(
      "Launch tests with quarto run to select its bundled runtime/cache",
    );
  }
  const child = new Deno.Command(Deno.execPath(), {
    args: [
      "test",
      "--allow-all",
      "--cached-only",
      "--no-config",
      `--import-map=${share}/deno_std/run_import_map.json`,
      ...args,
      ...files.map((file) => decodeURIComponent(file.pathname)),
    ],
    // Inherit Quarto's stock DENO_DIR and all diagnostic-output settings.
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  return (await child.status).code;
}
