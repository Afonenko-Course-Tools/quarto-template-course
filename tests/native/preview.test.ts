import { assert, exists, remove } from "./helpers.ts";
import { preview } from "./preview.ts";

const root = await Deno.makeTempDir({ prefix: "native-preview-test-" });
const previousQuarto = Deno.env.get("QUARTO"),
  previousMode = Deno.env.get("NATIVE_PREVIEW_TEST_MODE");
try {
  const launcher = `${root}/quarto-test.sh`;
  await Deno.writeTextFile(
    launcher,
    `#!/bin/sh
sleep 60 &
echo $! > child.pid
if [ "$NATIVE_PREVIEW_TEST_MODE" = timeout ]; then wait; fi
if [ "$NATIVE_PREVIEW_TEST_MODE" = exit ]; then exit 0; fi
if [ "$NATIVE_PREVIEW_TEST_MODE" = clean ]; then
  i=0
  while [ "$i" -lt 5 ]; do printf '{"kind":"render"}\\n' >> "$COURSE_BUILD_TRACE"; i=$((i+1)); done
fi
echo 'Listening on http://127.0.0.1'
if [ "$NATIVE_PREVIEW_TEST_MODE" = watch ]; then
  while ! grep -q 'No-watch native preview edit' index.qmd; do sleep 0.01; done
  printf '{"kind":"render"}\\n' >> "$COURSE_BUILD_TRACE"
fi
wait
`,
  );
  await Deno.chmod(launcher, 0o755);
  Deno.env.set("QUARTO", launcher);
  const original = "# Native author source\n";
  await Deno.writeTextFile(`${root}/index.qmd`, original);
  for (const mode of ["existing", "clean", "timeout", "exit", "watch"]) {
    Deno.env.set("NATIVE_PREVIEW_TEST_MODE", mode);
    await remove(`${root}/preview-trace.jsonl`);
    await Deno.mkdir(`${root}/_site-student`, { recursive: true });
    let failure = "";
    try {
      await preview(root, root, mode === "clean", {
        // The test launcher never opens a server. A supplied port isolates
        // process supervision from local socket permissions in the sandbox.
        port: 1,
        startupMs: 1000,
        editMs: 200,
        shutdownMs: 150,
      });
    } catch (error) {
      failure = error instanceof Error
        ? error.stack || String(error)
        : String(error);
    }
    if (mode === "timeout") assert(failure.includes("within timeout"), failure);
    else if (mode === "exit") {
      assert(failure.includes("exited before listening"), failure);
    } else if (mode === "watch") {
      assert(failure.includes("composed 1 children; expected 0"), failure);
    } else assert(!failure, failure);
    assert(
      await Deno.readTextFile(`${root}/index.qmd`) === original,
      `${mode}: source not restored`,
    );
    const pid = (await Deno.readTextFile(`${root}/child.pid`)).trim();
    const stat = `/proc/${pid}/stat`;
    if (await exists(stat)) {
      const state =
        (await Deno.readTextFile(stat)).replace(/^.*\) /, "").split(" ")[0];
      assert(
        state === "Z",
        `${mode}: preview descendant ${pid} remains active (${state})`,
      );
    }
    console.log(`PASS preview ${mode}: source restored, process group cleaned`);
  }
} finally {
  if (previousQuarto === undefined) Deno.env.delete("QUARTO");
  else Deno.env.set("QUARTO", previousQuarto);
  if (previousMode === undefined) Deno.env.delete("NATIVE_PREVIEW_TEST_MODE");
  else Deno.env.set("NATIVE_PREVIEW_TEST_MODE", previousMode);
  await Deno.remove(root, { recursive: true });
}
