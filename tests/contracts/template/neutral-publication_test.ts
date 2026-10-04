import { join } from "stdlib/path";
import { check } from "../../support/contract-cases.ts";
import { checkNeutralPublication } from "../../check-neutral.ts";
async function fixture(root: string) {
  const exports = [
    "portal:sec-portal",
    "theory:sec-theory",
    "tasks:sec-tasks",
    "tasks:sec-lab",
    "tasks:sec-plan",
    "tasks:exr-compare",
    "tasks:exr-evidence",
    "lectures:sec-lectures",
    "practice:sec-practice",
    "handbook:sec-handbook",
  ];
  for (const profile of ["student", "full"]) {
    const output = join(root, `_site-${profile}`);
    for (
      const part of ["theory", "tasks", "lectures", "practice", "handbook"]
    ) {
      await Deno.mkdir(join(output, part), { recursive: true });
      await Deno.writeTextFile(
        join(output, part, "index.html"),
        `<a href="../index.html">Курс</a>${
          part === "tasks"
            ? '<div id="exr-compare"></div><div id="exr-evidence"></div>'
            : ""
        }${
          profile === "full" && part === "tasks"
            ? "NEUTRAL_PRIVATE_GRADING"
            : ""
        }`,
      );
    }
    await Deno.writeTextFile(
      join(output, "index.html"),
      ["theory", "tasks", "lectures", "practice", "handbook"].map((p) =>
        `<a href="${p}/index.html">${p}</a>`
      ).join(""),
    );
    await Deno.writeTextFile(
      join(output, "reference-catalog.json"),
      JSON.stringify({
        schema: "quarto-reference-catalog",
        targets: Object.fromEntries(exports.map((key) => [key, {}])),
      }),
    );
    await Deno.mkdir(join(output, "tasks/_downloads"), { recursive: true });
    // Store-only ZIP is enough to test the consumer's byte/file checks.
    const zip = (value: string) => {
      const name = new TextEncoder().encode("README.txt"),
        data = new TextEncoder().encode(value);
      const bytes = new Uint8Array(30 + name.length + data.length),
        view = new DataView(bytes.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint32(18, data.length, true);
      view.setUint16(26, name.length, true);
      bytes.set(name, 30);
      bytes.set(data, 30 + name.length);
      return bytes;
    };
    await Deno.writeFile(
      join(output, "tasks/_downloads/starter.zip"),
      zip("Лист наблюдений"),
    );
    if (profile === "full") {
      await Deno.writeFile(
        join(output, "tasks/_downloads/instructor.zip"),
        zip("NEUTRAL_PRIVATE_RESOURCE"),
      );
    }
  }
}
Deno.test("neutral output rejects canonical task duplication in a slide member", async () => {
  const root = await Deno.makeTempDir();
  try {
    await fixture(root);
    check(
      await checkNeutralPublication(root) > 0,
      "valid public pair must verify local links",
    );
    const path = join(root, "_site-student/lectures/index.html");
    await Deno.writeTextFile(path, '<div id="exr-compare">Copied task</div>');
    let rejected = false;
    try {
      await checkNeutralPublication(root);
    } catch (e) {
      rejected = String(e).includes("canonical");
    }
    check(rejected, "copied canonical exercise in lectures must be refused");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
Deno.test("neutral student publication refuses closed instructor payload", async () => {
  const root = await Deno.makeTempDir();
  try {
    await fixture(root);
    await Deno.writeTextFile(
      join(root, "_site-student/tasks/notes.txt"),
      "NEUTRAL_PRIVATE_RESOURCE",
    );
    let rejected = false;
    try {
      await checkNeutralPublication(root);
    } catch (e) {
      rejected = String(e).includes("private");
    }
    check(rejected, "student private resource must be refused");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
