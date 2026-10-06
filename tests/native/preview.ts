/** Preview delegates initial rendering and watches to native Quarto. */
import { join } from "stdlib/path";
import { assert, exists, quarto, remove, workspaceArg } from "./helpers.ts";

export async function renders(trace: string): Promise<number> {
  if (!(await exists(trace))) return 0;
  return (await Deno.readTextFile(trace)).split(/\r?\n/).filter(Boolean)
    .filter((line) => JSON.parse(line).kind === "render").length;
}
async function signalGroup(
  pid: number,
  signal: "TERM" | "KILL",
): Promise<void> {
  // setsid makes this PID the group leader. Kill the group even when the
  // wrapper has exited, since Pandoc/Quarto descendants may still be alive.
  await new Deno.Command("kill", {
    args: [`-${signal}`, "--", `-${pid}`],
    stdout: "null",
    stderr: "null",
  }).output();
}
export interface PreviewTiming {
  port?: number;
  startupMs?: number;
  editMs?: number;
  shutdownMs?: number;
}
export async function preview(
  cwd: string,
  root: string,
  clean = false,
  timing: PreviewTiming = {},
): Promise<void> {
  assert(
    Deno.build.os === "linux",
    "Native preview acceptance requires Linux setsid/kill process groups",
  );
  if (clean) await remove(join(cwd, "_site-student"));
  let port = timing.port;
  if (port === undefined) {
    const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
    port = (listener.addr as Deno.NetAddr).port;
    listener.close();
  }
  const trace = join(root, "preview-trace.jsonl"),
    before = await renders(trace);
  const source = join(cwd, "index.qmd"), original = await Deno.readFile(source);
  const child = new Deno.Command("setsid", {
    args: [
      quarto(),
      "preview",
      "--profile",
      "student",
      "--no-browser",
      "--no-watch-inputs",
      "--port",
      String(port),
    ],
    cwd,
    env: { COURSE_BUILD_TRACE: trace },
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const status = child.status;
  let listening = false;
  let ready!: () => void;
  const started = new Promise<void>((resolve) => {
    ready = resolve;
  });
  async function drain(stream: ReadableStream<Uint8Array>): Promise<void> {
    let pending = "";
    for await (const chunk of stream.pipeThrough(new TextDecoderStream())) {
      pending += chunk;
      // Recognize readiness even if Quarto does not terminate the line.
      if (
        !listening &&
        (pending.includes("Listening on") || pending.includes("Browse at"))
      ) {
        listening = true;
        ready();
      }
      const lines = pending.split("\n");
      pending = lines.pop()!;
      for (const line of lines) console.log(line);
    }
    if (pending) console.log(pending);
  }
  const drains = Promise.all([drain(child.stdout), drain(child.stderr)]);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const id = setTimeout(() => {
        timers.delete(id);
        resolve();
      }, ms);
      timers.add(id);
    });
  }
  let interrupted!: (error: Error) => void;
  const interruption = new Promise<never>((_, reject) => {
    interrupted = reject;
  });
  const signals: Deno.Signal[] = ["SIGINT", "SIGTERM"];
  const stop = () => interrupted(Error("Native preview interrupted"));
  for (const signal of signals) Deno.addSignalListener(signal, stop);
  try {
    await Promise.race([
      started,
      status.then((result) => {
        if (!listening) {
          throw Error(
            `Native preview exited before listening (${result.code})`,
          );
        }
      }),
      delay(timing.startupMs ?? 240_000).then(() => {
        throw Error("Native preview did not start within timeout");
      }),
      interruption,
    ]);
    assert(listening, "Native preview did not start");
    const edit = new TextEncoder().encode("\nNo-watch native preview edit.\n");
    const edited = new Uint8Array(original.length + edit.length);
    edited.set(original);
    edited.set(edit, original.length);
    await Deno.writeFile(source, edited);
    await Promise.race([delay(timing.editMs ?? 3000), status, interruption]);
  } finally {
    // Restore the author file before stopping all descendants, including on
    // readiness timeout, signal interruption, or assertion failure.
    await Deno.writeFile(source, original);
    await signalGroup(child.pid, "TERM");
    await Promise.race([status, delay(timing.shutdownMs ?? 4000)]);
    await signalGroup(child.pid, "KILL");
    await status;
    await drains;
    for (const timer of timers) clearTimeout(timer);
    for (const signal of signals) Deno.removeSignalListener(signal, stop);
  }
  const actual = await renders(trace) - before,
    expected = clean && cwd === root ? 5 : 0;
  assert(
    actual === expected,
    `Preview composed ${actual} children; expected ${expected}`,
  );
}
if (import.meta.main) {
  const root = workspaceArg();
  await preview(root, root);
  await preview(root, root, true);
  await preview(join(root, "theory"), root);
  console.log(
    "PASS root existing/clean and component native preview; no-watch edit does not trigger children",
  );
}
