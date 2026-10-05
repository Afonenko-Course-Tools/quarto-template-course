// The optional adapters use Core's supported single-owner HTML lifecycle.
// Each profile has a fresh opaque Source copy; only checked public output returns.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join, resolve, toFileUrl } from "stdlib/path";
const extension = "_extensions/Afonenko-Course-Tools/course-core";
const omitted = new Set([
  ".git",
  ".quarto",
  ".course-owner",
  ".project-publish",
  "_freeze",
  "_generated",
  "_output",
  "site_libs",
]);
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`OPTIONAL_EXAMPLE: ${message}`);
}
async function stageSource(source: string, target: string) {
  await Deno.mkdir(target, { recursive: true });
  for await (const entry of Deno.readDir(source)) {
    if (omitted.has(entry.name)) continue;
    const from = join(source, entry.name), to = join(target, entry.name);
    assert(!entry.isSymlink, `linked Source entry ${from}`);
    if (entry.isDirectory && entry.name === "_extensions") {
      // Installed runtimes are complete opaque packages, including every vendor file.
      await copy(from, to);
    } else if (entry.isDirectory) await stageSource(from, to);
    else {
      assert(entry.isFile, `non-regular Source entry ${from}`);
      await Deno.copyFile(from, to);
      await Deno.chmod(to, (await Deno.stat(from)).mode! & 0o777);
    }
  }
}
export function checkOptionalModel(
  model: any,
  example: string,
  profile: string,
) {
  const cloud = example === "cloud",
    id = cloud ? "exr-service" : "exr-platform-check";
  assert(
    model.course.id === `example-${example}` && model.course.view === profile,
    "compiled course/profile identity differs",
  );
  const exercise = model.exercises.find((item: any) => item.id === id);
  if (!cloud && profile === "student") {
    assert(
      !exercise && model.exercises.length === 0,
      "closed control leaked into student model",
    );
    return;
  }
  assert(
    model.exercises.length === 1 && exercise,
    "compiled canonical exercise missing",
  );
  assert(
    exercise.purpose === (cloud ? "independent-study" : "control") &&
      exercise.difficulty === (cloud ? "introductory" : "intermediate") &&
      exercise.target === example && exercise.authoredTarget === example,
    "compiled purpose/difficulty/adapter differs",
  );
  assert(
    exercise.sourceTopic?.id ===
        (cloud ? "sec-cloud-lab" : "sec-prairielearn-control") &&
      exercise.sourceTopic.owner === `example-${example}` &&
      exercise.sourceTopic.rootQmd === "index.qmd",
    "compiled authored source topic differs",
  );
}
export async function renderOptionalExample(
  root: string,
  example: string,
  profile: string,
) {
  assert(
    ["cloud", "prairielearn"].includes(example),
    "unknown adapter example",
  );
  assert(profile === "student" || profile === "full", "unknown audience");
  const source = join(root, "examples", example);
  const stage = await Deno.makeTempDir({
    prefix: `template-${example}-${profile}-`,
  });
  await stageSource(source, stage);
  const quarto = Deno.env.get("QUARTO") || "quarto";
  const run = async (args: string[]) => {
    const result = await new Deno.Command(quarto, {
      args,
      cwd: stage,
      env: { QUARTO_PROFILE: profile },
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    assert(
      result.success,
      `${example}/${profile}: command failed (${result.code}); Source ${stage}`,
    );
  };
  await run(["run", `${extension}/entrypoints/pre.ts`]);
  const owner = await import(
    toFileUrl(join(stage, extension, "owner-preflight/owner.ts")).href
  );
  const prepared = await owner.prepareOwner(stage, {
    attemptId: `template-${example}-${profile}`,
    profile,
    extension,
  });
  const metadata = join(stage, ".course-owner/render-metadata.json");
  await Deno.writeTextFile(
    metadata,
    JSON.stringify(await owner.activateOwner(prepared)),
  );
  await run([
    "render",
    ".",
    "--profile",
    profile,
    "--to",
    "html",
    "--execute",
    "--no-cache",
    "--no-execute-daemon",
    "--metadata-file",
    metadata,
    "--fail-if-warnings",
  ]);
  const { check } = await import(
    toFileUrl(join(stage, extension, "application/check.ts")).href
  );
  const { runtime } = await import(
    toFileUrl(join(stage, extension, "infrastructure/runtime.ts")).href
  );
  const previous = Deno.env.get("QUARTO_PROFILE");
  try {
    Deno.env.set("QUARTO_PROFILE", profile);
    const { model } = await check(runtime(stage, [], false));
    checkOptionalModel(model, example, profile);
  } finally {
    if (previous === undefined) Deno.env.delete("QUARTO_PROFILE");
    else Deno.env.set("QUARTO_PROFILE", previous);
  }
  const html = await Deno.readTextFile(
    join(stage, "_output", profile, "index.html"),
  );
  const id = example === "cloud" ? "exr-service" : "exr-platform-check";
  assert(
    html.includes(`id="${id}"`) === (example === "cloud" || profile === "full"),
    "native exercise visibility differs from the checked model",
  );
  // The assembled model belongs to the private service set sealed by finish.
  const finished = await owner.finishOwner(prepared);
  assert(
    finished.exitCode === 0,
    `${example}/${profile}: owner completion failed: ${
      JSON.stringify(finished)
    }`,
  );
  await owner.validateOwnerResources(prepared);
  const output = join(source, "_output", profile);
  try {
    await Deno.remove(output, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  await copy(join(stage, "_output", profile), output);
  console.log(
    `Проверен ${example}/${profile}: native HTML, модель, owner finish, ресурсы; ${stage}`,
  );
}
if (import.meta.main) {
  const arg = (name: string) => {
    const at = Deno.args.indexOf(name);
    return at < 0 ? undefined : Deno.args[at + 1];
  };
  await renderOptionalExample(
    resolve(arg("--root") || dirname(dirname(fromFileUrl(import.meta.url)))),
    arg("--example") || "",
    arg("--profile") || Deno.env.get("QUARTO_PROFILE") || "",
  );
}
