import { join } from "stdlib/path";
import {
  assert,
  capture,
  command,
  exists,
  parseXml,
  ROOT,
  sha256,
  text,
  workspaceArg,
} from "./helpers.ts";

interface Resource {
  target: string;
  sha256: string;
  data: string;
}
const decode = (value: string) =>
  Uint8Array.from(atob(value.replace(/\s/g, "")), (char) => char.charCodeAt(0));
const equalBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, index) => byte === b[index]);

export async function exportsAcceptance(workspace: string): Promise<void> {
  const root = join(workspace, "examples/exports");
  for (const profile of ["student", "full", "student"]) {
    await command(["render", ".", "--profile", profile], root);
    await command(
      ["run", join(ROOT, "tests/native/package.ts"), root, profile],
      root,
    );
    const publicPath = join(root, "_generated/public-package.json"),
      teacher = join(root, "_generated/teacher-package.json");
    const publicText = await Deno.readTextFile(publicPath);
    const payload: { questions: unknown[]; resources: Resource[] } = JSON.parse(
      publicText,
    );
    assert(
      !publicText.includes("EXPORT_PRIVATE"),
      "Private marker leaked into public package",
    );
    assert(
      payload.questions.length === 2 && payload.resources.length === 2,
      "Expected two questions and two resources",
    );
    assert(
      (await Deno.readTextFile(teacher)).includes("EXPORT_PRIVATE") ===
        (profile === "full"),
      "Teacher package audience mismatch",
    );
    const output = join(root, `_generated/print-${profile}`);
    await command([
      "run",
      join(
        ROOT,
        "_extensions/Afonenko-Course-Tools/course-print/entrypoints/export.ts",
      ),
      publicPath,
      "example-exports/sec-work",
      output,
    ], root);
    const pdf = await new Deno.Command("pdftotext", {
      args: [join(output, "handout.pdf"), "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(pdf.success, `PDF text extraction failed: ${text(pdf.stderr)}`);
    assert(
      text(pdf.stdout).includes("Observation") &&
        !text(pdf.stdout).includes("EXPORT_PRIVATE"),
      "Print PDF content/privacy mismatch",
    );
    for (const resource of payload.resources) {
      assert(
        await sha256(await Deno.readFile(join(output, resource.target))) ===
          resource.sha256,
        `Body resource integrity mismatch: ${resource.target}`,
      );
    }
    const binding = join(root, "_generated/binding.json");
    await Deno.writeTextFile(binding, '{"defaultGrade":1,"shuffle":false}');
    const xmlPath = join(root, `_generated/bank-${profile}.xml`);
    const moodle = [
      "run",
      join(
        ROOT,
        "_extensions/Afonenko-Course-Tools/course-moodle/entrypoints/export.ts",
      ),
      teacher,
      binding,
      xmlPath,
    ];
    if (profile === "student") {
      const refused = await capture(moodle, root);
      assert(
        !refused.success &&
          text(refused.stderr).includes("invalid single-choice mapping") &&
          !(await exists(xmlPath)),
        "Student Moodle export must refuse missing private answers and leave no XML",
      );
      continue;
    }
    await command(moodle, root);
    const xmlText = await Deno.readTextFile(xmlPath), tree = parseXml(xmlText);
    assert(tree.name === "quiz", "Moodle XML root must be quiz");
    const questions = tree.children.filter((element) =>
      element.name === "question"
    );
    assert(
      JSON.stringify(questions.map((question) => question.attributes.type)) ===
        '["essay","multichoice"]',
      "Moodle question types mismatch",
    );
    assert(
      JSON.stringify(
        questions[1].children.filter((element) => element.name === "answer")
          .map((answer) => answer.attributes.fraction),
      ) === '["100","0"]',
      "Moodle answer fractions mismatch",
    );
    assert(
      !xmlText.includes("EXPORT_PRIVATE"),
      "Private marker leaked into Moodle XML",
    );
    const attached = new Map<string, Uint8Array>();
    for (
      const questionText of questions[0].children.filter((element) =>
        element.name === "questiontext"
      )
    ) {
      for (
        const file of questionText.children.filter((element) =>
          element.name === "file"
        )
      ) {
        attached.set(
          file.attributes.path.replace(/^\/+/, "") + file.attributes.name,
          decode(file.text),
        );
      }
    }
    assert(
      attached.size === payload.resources.length,
      "Moodle attachment count mismatch",
    );
    for (const resource of payload.resources) {
      assert(
        attached.has(resource.target) &&
          equalBytes(attached.get(resource.target)!, decode(resource.data)),
        `Moodle attachment bytes mismatch: ${resource.target}`,
      );
    }
  }
  console.log(
    "PASS installed native Body -> public Print PDF/resources and teacher Moodle XML/attachments; student/full/student",
  );
}
if (import.meta.main) await exportsAcceptance(workspaceArg());
