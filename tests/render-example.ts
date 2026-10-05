import { dirname, fromFileUrl, join, resolve } from "stdlib/path";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
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
  assert(["cloud", "prairielearn"].includes(example), "Unknown example");
  assert(["student", "full"].includes(profile), "Unknown profile");
  const source = join(root, "examples", example),
    quarto = Deno.env.get("QUARTO") || "quarto";
  for (
    const args of [["render", ".", "--profile", profile], [
      "run",
      "_extensions/Afonenko-Course-Tools/course-core/entrypoints/check.ts",
      ".",
      profile,
    ]]
  ) {
    const result = await new Deno.Command(quarto, {
      args,
      cwd: source,
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    assert(
      result.success,
      `${example}/${profile}: native command exit ${result.code}`,
    );
  }
  const model = JSON.parse(
    await Deno.readTextFile(join(source, "_generated/course-spec/course.json")),
  );
  checkOptionalModel(model, example, profile);
  const html = await Deno.readTextFile(
    join(source, "_output", profile, "index.html"),
  );
  const id = example === "cloud" ? "exr-service" : "exr-platform-check";
  assert(
    html.includes(`id="${id}"`) === (example === "cloud" || profile === "full"),
    "Native exercise visibility differs",
  );
  console.log(`PASS ${example}/${profile}: native HTML and current model`);
}
if (import.meta.main) {
  const arg = (name: string) => {
    const n = Deno.args.indexOf(name);
    return n < 0 ? undefined : Deno.args[n + 1];
  };
  await renderOptionalExample(
    resolve(arg("--root") || dirname(dirname(fromFileUrl(import.meta.url)))),
    arg("--example") || "",
    arg("--profile") || "student",
  );
}
