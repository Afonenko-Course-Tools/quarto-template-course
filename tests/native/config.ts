const quarto = Deno.env.get("QUARTO") || "quarto";
async function inspect(root: string, profile: string) {
  const result = await new Deno.Command(quarto, {
    args: ["inspect", ".", "--profile", profile],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) throw Error(new TextDecoder().decode(result.stderr));
  return JSON.parse(new TextDecoder().decode(result.stdout)).config;
}
const config = await inspect(".", "student");
if (
  config.project["output-dir"] !== "_site-student" ||
  JSON.stringify(config.project.render) !== '["index.qmd"]'
) {
  throw Error(
    "Native root must render its sole index into selected _site-student",
  );
}
if (
  !Array.isArray(config["course-site"]?.projects) ||
  config["course-site"].projects.length !== 5
) throw Error("Native five-part composition missing");
for (
  const root of [
    ".",
    ...config["course-site"].projects.map((p: any) => p.path),
    "examples/cloud",
    "examples/prairielearn",
    "examples/exports",
  ]
) {
  const student = await inspect(root, "student"),
    full = await inspect(root, "full");
  if (
    student.course.view !== "student" || full.course.view !== "full" ||
    student.project["output-dir"] === full.project["output-dir"]
  ) throw Error(`Audience isolation missing: ${root}`);
  const before = student.project["pre-render"],
    after = student.project["post-render"];
  if (root === ".") {
    if (
      before.length !== 1 || !before[0].includes("course-site/") ||
      after.length !== 1 || !after[0].includes("course-site/")
    ) throw Error("Root site owns native capture hooks");
  } else {
    if (
      !before[0].includes("course-core/") || !after[0].includes("course-core/")
    ) throw Error(`Core must run first: ${root}`);
    if (
      !root.startsWith("examples/") &&
      !after.at(-1).includes("course-site/entrypoints/collect.ts")
    ) throw Error(`Collection must run last: ${root}`);
    if (student["project-download"]) {
      if (
        !before[1].includes("project-download/") ||
        !after[1].includes("project-download/")
      ) throw Error(`Download follows Core: ${root}`);
    }
  }
}
console.log(
  "PASS native inspected scope, five-part composition, profile output isolation and explicit hook order",
);
