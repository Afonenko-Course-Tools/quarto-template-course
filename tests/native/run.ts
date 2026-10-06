/** Native acceptance. One persistent source tree per channel, never per render. */
import { join, resolve } from "stdlib/path";
import { assert, command, exists, ROOT } from "./helpers.ts";
export { command, ROOT } from "./helpers.ts";

export function ignored(name: string): boolean {
  return [
    ".git",
    ".quarto",
    "_freeze",
    "_generated",
    "_output",
    "_downloads",
    "__pycache__",
  ].includes(name) ||
    name.startsWith("_site") || name.endsWith("_files") ||
    name.endsWith("_cache");
}
async function copyTree(
  source: string,
  destination: string,
  exclude = false,
): Promise<void> {
  await Deno.mkdir(destination, { recursive: true });
  for await (const entry of Deno.readDir(source)) {
    if (exclude && ignored(entry.name)) continue;
    const input = join(source, entry.name),
      output = join(destination, entry.name);
    if (entry.isDirectory) await copyTree(input, output, exclude);
    else await Deno.copyFile(input, output);
  }
}
export async function fixture(
  kind: "neutral" | "original",
  base: string,
): Promise<string> {
  const destination = join(base, kind);
  if (await exists(destination)) return destination;
  const source = kind === "neutral"
    ? ROOT
    : join(ROOT, "fixtures/probes/original-course");
  await copyTree(source, destination, true);
  if (kind === "original") {
    for (const scope of [".", "book", "essay", "lectures", "practice"]) {
      await copyTree(
        join(ROOT, scope, "_extensions"),
        join(destination, scope, "_extensions"),
      );
    }
    await Deno.mkdir(join(destination, "fixtures"), { recursive: true });
    await Deno.copyFile(
      join(ROOT, "fixtures/external-reference.json"),
      join(destination, "fixtures/external-reference.json"),
    );
  }
  return destination;
}
export async function search(
  root: string,
  kind: string,
  profile: string,
): Promise<void> {
  const site = join(root, `_site-${profile}`);
  const rows: { href?: string }[] = JSON.parse(
    await Deno.readTextFile(join(site, "search.json")),
  );
  const hrefs = rows.map((row) => row.href || "");
  assert(
    hrefs.some((href) => href.split("#")[0] === "index.html"),
    `Root landing missing: ${JSON.stringify(hrefs)}`,
  );
  assert(
    hrefs.some((href) =>
      href.startsWith(kind === "neutral" ? "tasks/" : "book/")
    ),
    `Mounted search missing: ${JSON.stringify(hrefs)}`,
  );
  for (const href of hrefs) {
    assert(
      (await Deno.stat(join(site, href.split("#")[0]))).isFile,
      `Stale search row: ${href}`,
    );
  }
}
export async function profiles(
  root: string,
  kind: "neutral" | "original",
): Promise<void> {
  const cache = join(root, ".quarto/native-acceptance-sentinel"),
    freeze = join(root, "_freeze/native-acceptance-sentinel");
  await Deno.mkdir(join(root, ".quarto"), { recursive: true });
  await Deno.mkdir(join(root, "_freeze"), { recursive: true });
  await Deno.writeTextFile(cache, "KEEP NATIVE CACHE");
  await Deno.writeTextFile(freeze, "KEEP FREEZE");
  for (const profile of ["student", "full", "student"]) {
    await command(["render", ".", "--profile", profile], root);
    await search(root, kind, profile);
    assert(
      await Deno.readTextFile(cache) === "KEEP NATIVE CACHE" &&
        await Deno.readTextFile(freeze) === "KEEP FREEZE",
      "Native caches were removed",
    );
  }
  if (kind === "neutral") {
    await command(["run", join(ROOT, "tests/check.ts"), root], ROOT);
  } else {await command([
      "run",
      join(ROOT, "tests/check-original.ts"),
      "--root",
      root,
      "--skip-render",
    ], ROOT);}
  console.log(
    "PASS",
    kind,
    "student -> full -> student; native caches, landing/mounted current search",
  );
}
export async function optional(root: string): Promise<void> {
  for (const profile of ["student", "full", "student"]) {
    for (const example of ["cloud", "prairielearn"]) {
      await command([
        "run",
        join(ROOT, "tests/render-example.ts"),
        "--", // Keep script flags out of Quarto's global option parser.
        "--root",
        root,
        "--example",
        example,
        "--profile",
        profile,
      ], ROOT);
    }
  }
  console.log("PASS optional adapters persistent native student/full/student");
}
if (import.meta.main) {
  const [name, ...args] = Deno.args;
  assert(
    ["neutral", "original", "optional", "all"].includes(name) &&
      (args.length === 0 || (args.length === 2 && args[0] === "--workspace")),
    "Usage: quarto run tests/native/run.ts {neutral|original|optional|all} [--workspace PATH]",
  );
  const base = args.length
    ? resolve(args[1])
    : await Deno.makeTempDir({ prefix: "template-native-" });
  await Deno.mkdir(base, { recursive: true });
  console.log("WORKSPACE", base);
  if (["neutral", "all"].includes(name)) {
    await profiles(await fixture("neutral", base), "neutral");
  }
  if (["original", "all"].includes(name)) {
    await profiles(await fixture("original", base), "original");
  }
  if (["optional", "all"].includes(name)) {
    await optional(await fixture("neutral", base));
  }
}
