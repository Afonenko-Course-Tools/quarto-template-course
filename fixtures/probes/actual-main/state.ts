// Test-only payload copied into the existing authored consumer integration slots.
import { dirname, join, relative } from "stdlib/path";
export { dirname, join, relative };
export function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`ACTUAL_MAIN_NATIVE: ${message}`);
}
export async function hash(path: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", await Deno.readFile(path)),
    ),
  ].map((n) => n.toString(16).padStart(2, "0")).join("");
}
export async function observe(
  ctx: any,
  stage: string,
  fields: Record<string, unknown> = {},
) {
  const path = Deno.env.get("ACTUAL_MAIN_OBSERVER_PATH");
  assert(path, "observer output missing");
  await Deno.writeTextFile(
    path,
    JSON.stringify({ attemptId: ctx.attemptId, stage, ...fields }) + "\n",
    { append: true },
  );
}
const path = (ctx: any) =>
  join(
    ctx.root,
    ".project-publish/builds",
    ctx.attemptId,
    "actual-main-adapter.json",
  );
export async function load(ctx: any) {
  const state = JSON.parse(await Deno.readTextFile(path(ctx)));
  assert(
    state.attemptId === ctx.attemptId && state.sourceRoot === ctx.sourceRoot,
    "not the current actual source/attempt",
  );
  return state;
}
export async function save(ctx: any, value: unknown) {
  await Deno.writeTextFile(path(ctx), JSON.stringify(value));
}
export function nativeMembers(ctx: any, state: any) {
  return ctx.members.map((member: any) => {
    const current = state.nativeMembers[member.namespace];
    assert(
      current && current.format === member.format,
      `missing current native metadata ${member.namespace}`,
    );
    return {
      path: member.path,
      mount: member.mount,
      format: member.format,
      output: current.output,
      ...(state.owners[member.namespace]
        ? { owner: state.owners[member.namespace] }
        : {}),
    };
  });
}
