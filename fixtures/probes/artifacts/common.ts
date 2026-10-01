// Только доверенный P0 fixture adapter; это не API учебной политики Core.
import { dirname, join, relative, resolve } from "stdlib/path";
export { dirname, join, relative, resolve };
export const serviceSegments = [
  "_extensions",
  ".project-publish",
  "_probe",
  "_artifact-evidence",
];
export function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`ARTIFACT_PROBE: ${message}`);
}
export async function exists(path: string) {
  try {
    await Deno.stat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}
export async function files(root: string): Promise<string[]> {
  assert(!(await Deno.lstat(root)).isSymlink, `symlink root ${root}`);
  const found: string[] = [];
  for await (const e of Deno.readDir(root)) {
    assert(!e.isSymlink, `symlink ${join(root, e.name)}`);
    const p = join(root, e.name);
    if (e.isDirectory) found.push(...await files(p));
    else if (e.isFile) found.push(p);
  }
  return found.sort();
}
export async function copyTree(source: string, target: string) {
  for (const p of await files(source)) {
    const out = join(target, relative(source, p));
    await Deno.mkdir(dirname(out), { recursive: true });
    await Deno.copyFile(p, out);
  }
}
export async function hash(path: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", await Deno.readFile(path)),
    ),
  ].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export async function command(
  cmd: string,
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
) {
  const r = await new Deno.Command(cmd, {
    args,
    cwd,
    env,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(r.stdout),
    stderr = new TextDecoder().decode(r.stderr);
  if (!r.success) {
    throw new Error(`${cmd} ${args.join(" ")}: ${stdout}\n${stderr}`);
  }
  return stdout;
}
export async function event(
  ctx: any,
  stage: string,
  extra: Record<string, unknown> = {},
) {
  const dir = join(ctx.root, "_artifact-evidence");
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    join(dir, "events.jsonl"),
    JSON.stringify({ attemptId: ctx.attemptId, stage, ...extra }) + "\n",
    { append: true },
  );
}
export async function policy(ctx: any) {
  const p = JSON.parse(
    await Deno.readTextFile(join(ctx.sourceRoot, "_probe/policy.json")),
  );
  assert(
    p.schema === "trusted-resource-policy-fixture-v1",
    "not a production resource index",
  );
  return p;
}
export function childOrEqual(parent: string, child: string) {
  const p = relative(parent, child);
  return p === "" || (p !== ".." && !p.startsWith("../") && !p.startsWith("/"));
}
