import { dirname, join, relative, resolve } from "stdlib/path";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`NEUTRAL_PUBLICATION: ${message}`);
}
async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = join(directory, entry.name);
    if (entry.isDirectory) result.push(...await files(path));
    else if (entry.isFile) result.push(path);
    else {throw new Error(
        `NEUTRAL_PUBLICATION: non-regular public entry ${path}`,
      );}
  }
  return result;
}
const members = ["theory", "tasks", "lectures", "practice", "handbook"];
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
/** Product assertions for the neutral authoring example, independent of Original. */
export async function checkNeutralPublication(root: string) {
  let links = 0;
  for (const profile of ["student", "full"]) {
    const output = join(root, `_site-${profile}`), paths = await files(output);
    const portal = await Deno.readTextFile(join(output, "index.html"));
    for (const member of members) {
      assert(portal.includes(`${member}/`), `portal does not link ${member}`);
      await Deno.stat(join(output, member, "index.html"));
    }
    const catalog = JSON.parse(
      await Deno.readTextFile(join(output, "reference-catalog.json")),
    );
    assert(
      catalog.schema === "quarto-reference-catalog",
      "current QRC schema required",
    );
    assert(
      JSON.stringify(Object.keys(catalog.targets).sort()) ===
        JSON.stringify(exports.slice().sort()),
      "explicit neutral exports differ",
    );
    const tasks = await Deno.readTextFile(join(output, "tasks/index.html"));
    for (const id of ["exr-compare", "exr-evidence"]) {
      assert(tasks.includes(`id="${id}"`), `canonical tasks missing ${id}`);
    }
    assert(
      tasks.includes("NEUTRAL_PRIVATE_GRADING") === (profile === "full"),
      "manual grading visibility differs",
    );
    const archives = paths.filter((path) => path.endsWith(".zip"));
    assert(
      archives.length === (profile === "full" ? 2 : 1),
      `wrong ${profile} manual resource archives`,
    );
    assert(
      archives.some((path) => path.endsWith("starter.zip")),
      "manual worksheet archive absent",
    );
    assert(
      archives.some((path) => path.endsWith("instructor.zip")) ===
        (profile === "full"),
      "instructor archive visibility differs",
    );
    for (const path of paths) {
      const publicPath = relative(output, path);
      assert(
        !/\.(qmd|java|gradle|ts|lua|cue|ya?ml)$/.test(path) &&
          !publicPath.split("/").some((part) =>
            [
              "_extensions",
              "_publication",
              ".course-owner",
              ".project-publish",
              ".quarto",
              "materials",
              "fixtures",
              "tests",
            ].includes(part)
          ),
        `source/private path published ${publicPath}`,
      );
      // Project-download uses ZIP; scan all bytes too so a stored closed payload is caught.
      const text = new TextDecoder().decode(await Deno.readFile(path));
      assert(
        !text.includes("NEUTRAL_UNPUBLISHED_REFERENCE"),
        `unselected reference resource published ${publicPath}`,
      );
      if (profile === "student") {
        assert(
          !text.includes("NEUTRAL_PRIVATE_"),
          `private instructor payload in student ${publicPath}`,
        );
      }
      if (!path.endsWith(".html")) continue;
      assert(
        publicPath.startsWith("tasks/") || !/\bid="exr-[^"]+"/.test(text),
        `canonical exercise outside tasks ${publicPath}`,
      );
      for (const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
        const raw = match[1];
        if (/^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/|#)/.test(raw)) continue;
        const url = decodeURIComponent(raw.split(/[?#]/)[0]);
        if (!url) continue;
        const target = url.startsWith("/")
          ? join(output, url.slice(1))
          : resolve(dirname(path), url);
        assert(
          !relative(output, target).startsWith(".."),
          `link escapes publication ${raw}`,
        );
        try {
          await Deno.stat(target);
        } catch {
          throw new Error(
            `NEUTRAL_PUBLICATION: broken local link ${raw}: ${publicPath}`,
          );
        }
        links++;
      }
    }
  }
  return links;
}
