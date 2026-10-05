import { join } from "stdlib/path";
import { check } from "../../support/contract-cases.ts";
import { checkNeutralPublication } from "../../check-neutral.ts";
import { isNeutralPublicDescriptor } from "../../neutral-public-assets.ts";
for (const part of ["theory", "tasks", "lectures", "practice", "handbook"]) {
  Deno.test(`neutral ${part} authors Quarto startup ignores before owner freeze`, async () => {
    let text: string | undefined;
    try {
      text = await Deno.readTextFile(
        new URL(`../../../${part}/.gitignore`, import.meta.url),
      );
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    check(
      text !== undefined,
      `${part}: authored .gitignore missing before owner freeze`,
    );
    for (const entry of ["/.quarto/", "**/*.quarto_ipynb"]) {
      check(
        text.split(/\r?\n/).includes(entry),
        `${part}: native startup entry missing ${entry}`,
      );
    }
  });
}
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
            ? '<div id="exr-observation"><p>Приведите одно наблюдение</p></div><div id="exr-compare"></div><div id="exr-evidence"></div>'
            : part === "theory"
            ? '<div id="exm-observation">две группы</div>'
            : ""
        }${
          profile === "full" && part === "tasks"
            ? 'NEUTRAL_PRIVATE_GRADING<div id="sol-compare">Private explanation</div>'
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

// These are public Reveal plugin descriptors, not authored course configuration.
// SDK files are consumed as opaque bytes from the selected stock runtime.
const navigationDescriptor = new TextEncoder().encode(
  '{"name":"CourseNavigation","script":["model.js","ui.js","plugin.js"],"stylesheet":["navigation.css"],"config":{"scrollActivationWidth":0,"courseNav":{"sidebar":true}}}\n',
);
const plugins = [
  ["course-navigation", undefined],
  ["pdf-export", "pdfexport"],
  ["quarto-line-highlight", "line-highlight"],
  ["quarto-support", "support"],
  ["reveal-menu", "menu"],
] as const;
async function descriptor(directory: string | undefined) {
  if (!directory) return navigationDescriptor;
  const share = Deno.env.get("QUARTO_SHARE_PATH");
  check(share, "stock Quarto share required for public descriptor bytes");
  return await Deno.readFile(
    join(share, "formats/revealjs/plugins", directory, "plugin.yml"),
  );
}
async function writeAsset(
  root: string,
  profile: string,
  path: string,
  bytes: Uint8Array,
) {
  const target = join(root, `_site-${profile}`, path);
  await Deno.mkdir(target.slice(0, target.lastIndexOf("/")), {
    recursive: true,
  });
  await Deno.writeFile(target, bytes);
}
async function refuses(root: string, reason: string) {
  let message = "";
  try {
    await checkNeutralPublication(root);
  } catch (error) {
    message = String(error);
  }
  check(message.includes(reason), `expected ${reason}; received ${message}`);
}
for (const [plugin, directory] of plugins) {
  Deno.test(`neutral public assets admit exact stock ${plugin} descriptor`, async () => {
    const root = await Deno.makeTempDir();
    try {
      await fixture(root);
      for (const profile of ["student", "full"]) {
        for (const member of ["lectures", "practice"]) {
          await writeAsset(
            root,
            profile,
            `${member}/index_files/libs/revealjs/plugin/${plugin}/plugin.yml`,
            await descriptor(directory),
          );
        }
      }
      check(
        await checkNeutralPublication(root) > 0,
        "public pair remains valid",
      );
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });
  Deno.test(`neutral public assets refuse changed ${plugin} descriptor bytes`, async () => {
    for (const profile of ["student", "full"]) {
      const root = await Deno.makeTempDir();
      try {
        await fixture(root);
        const bytes = await descriptor(directory);
        const changed = new Uint8Array(bytes.length + 1);
        changed.set(bytes);
        changed[bytes.length] = 10;
        await writeAsset(
          root,
          profile,
          `lectures/index_files/libs/revealjs/plugin/${plugin}/plugin.yml`,
          changed,
        );
        await refuses(root, "source/private path published");
      } finally {
        await Deno.remove(root, { recursive: true });
      }
    }
  });
}
Deno.test("neutral public assets refuse arbitrary YAML and descriptor relocation", async () => {
  check(
    !await isNeutralPublicDescriptor(
      "lectures/index_files/libs/revealjs/plugin/course-navigation/plugin.yml\n",
      navigationDescriptor,
    ),
    "descriptor permission requires an exact filename",
  );
  for (
    const path of [
      "settings.yaml",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/plugin.yaml",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/private.yml",
      "lectures/index_files/libs/revealjs/plugin/unselected/plugin.yml",
      "theory/index_files/libs/revealjs/plugin/course-navigation/plugin.yml",
      "lectures/other_files/libs/revealjs/plugin/course-navigation/plugin.yml",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/nested/plugin.yml",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/source.qmd",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/source.java",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/source.gradle",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/source.ts",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/source.lua",
      "lectures/index_files/libs/revealjs/plugin/course-navigation/source.cue",
      "_extensions/course-navigation/plugin.yml",
      "_publication/config.yml",
    ]
  ) {
    const root = await Deno.makeTempDir();
    try {
      await fixture(root);
      await writeAsset(root, "full", path, navigationDescriptor);
      await refuses(root, "source/private path published");
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  }
});
Deno.test("neutral public assets keep private directories and all-byte scans closed", async () => {
  for (
    const [profile, path, content, reason] of [
      [
        "full",
        "tests/data.bin",
        "public-looking",
        "source/private path published",
      ],
      [
        "full",
        "materials/data.bin",
        "public-looking",
        "source/private path published",
      ],
      [
        "student",
        "lectures/data.js",
        "NEUTRAL_PRIVATE_RESOURCE",
        "private instructor payload",
      ],
      [
        "student",
        "tasks/_downloads/starter.zip",
        "NEUTRAL_PRIVATE_RESOURCE",
        "private instructor payload",
      ],
      [
        "full",
        "lectures/data.js",
        "NEUTRAL_UNPUBLISHED_REFERENCE",
        "unselected reference resource",
      ],
      [
        "student",
        "lectures/data.js",
        "NEUTRAL_UNPUBLISHED_REFERENCE",
        "unselected reference resource",
      ],
    ]
  ) {
    const root = await Deno.makeTempDir();
    try {
      await fixture(root);
      await writeAsset(root, profile, path, new TextEncoder().encode(content));
      await refuses(root, reason);
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  }
});
