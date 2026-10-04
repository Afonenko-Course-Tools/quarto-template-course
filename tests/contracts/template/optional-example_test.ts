import { check } from "../../support/contract-cases.ts";
import { checkOptionalModel } from "../../render-example.ts";
function model(example = "cloud", profile = "full") {
  const cloud = example === "cloud";
  return {
    course: { id: `example-${example}`, view: profile },
    exercises: !cloud && profile === "student" ? [] : [{
      id: cloud ? "exr-service" : "exr-platform-check",
      purpose: cloud ? "independent-study" : "control",
      difficulty: cloud ? "introductory" : "intermediate",
      target: example,
      authoredTarget: example,
      sourceTopic: {
        id: cloud ? "sec-cloud-lab" : "sec-prairielearn-control",
        owner: `example-${example}`,
        rootQmd: "index.qmd",
      },
    }],
  };
}
function refuses(value: unknown, example: string, profile: string) {
  let refused = false;
  try {
    checkOptionalModel(value, example, profile);
  } catch {
    refused = true;
  }
  check(refused, "changed compiled model must be refused");
}
Deno.test("optional examples require actual purpose, explicit difficulty and source topic", () => {
  checkOptionalModel(model(), "cloud", "full");
  for (
    const field of [
      "purpose",
      "difficulty",
      "authoredTarget",
      "sourceTopic",
    ] as const
  ) {
    const changed = model();
    delete (changed.exercises[0] as Record<string, unknown>)[field];
    refuses(changed, "cloud", "full");
  }
  const changed = model();
  changed.exercises[0].sourceTopic.owner = "foreign-course";
  refuses(changed, "cloud", "full");
});
Deno.test("optional control is compiled only in full with the selected profile identity", () => {
  checkOptionalModel(
    model("prairielearn", "student"),
    "prairielearn",
    "student",
  );
  checkOptionalModel(model("prairielearn", "full"), "prairielearn", "full");
  const leaked = model("prairielearn", "full");
  leaked.course.view = "student";
  refuses(leaked, "prairielearn", "student");
  refuses(model("cloud", "full"), "cloud", "student");
});
