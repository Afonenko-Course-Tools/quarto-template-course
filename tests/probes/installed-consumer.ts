// P0 proof driver; does not modify the production template or extension packages.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join, relative, resolve } from "stdlib/path";

const repo = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
const quarto = Deno.env.get("QUARTO") || "quarto";
const index = Deno.args.indexOf("--output");
const evidence = index >= 0
  ? resolve(Deno.args[index + 1])
  : await Deno.makeTempDir({ prefix: "installed-consumer-evidence-" });
const consumer = await Deno.makeTempDir({ prefix: "installed-five-parts-" });
const decoder = new TextDecoder();
const members = ["theory", "tasks", "practice", "lectures", "handbook"];
const packages = [
  ["course-core", "book"],
  ["course-presentation", "book"],
  ["course-navigation", "practice"],
  ["project-download", "book"],
  ["reference-catalog", ""],
  ["project-publish", ""],
];
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function exists(path: string) {
  try {
    await Deno.stat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}
async function files(path: string): Promise<string[]> {
  const result: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    assert(
      !entry.isSymlink,
      `Package/fixture must not depend on symlinks: ${join(path, entry.name)}`,
    );
    const p = join(path, entry.name);
    if (entry.isDirectory) result.push(...await files(p));
    else if (entry.isFile) result.push(p);
  }
  return result.sort();
}
async function hash(path: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", await Deno.readFile(path)),
    ),
  ].map((v) => v.toString(16).padStart(2, "0")).join("");
}
async function command(
  cmd: string,
  args: string[],
  cwd = consumer,
  env: Record<string, string> = {},
) {
  const r = await new Deno.Command(cmd, {
    args,
    cwd,
    env,
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    success: r.success,
    code: r.code,
    text: decoder.decode(r.stdout) + decoder.decode(r.stderr),
  };
}
const results: Record<string, unknown>[] = [];
async function render(
  profile: string,
  label: string,
  success = true,
  extra: string[] = [],
) {
  // A new XDG/Deno cache for every render: only Quarto's shipped stdlib can seed it.
  const cache = join(evidence, `cache-${label}`);
  assert(!await exists(cache), `Cache already exists: ${cache}`);
  await Deno.mkdir(cache, { recursive: true });
  const r = await command(
    quarto,
    ["render", ...(profile ? ["--profile", profile] : []), ...extra],
    consumer,
    {
      XDG_CACHE_HOME: cache,
      DENO_DIR: join(cache, "deno"),
    },
  );
  await Deno.writeTextFile(join(evidence, `${label}.log`), r.text);
  assert(
    r.success === success,
    `${label}: unexpected exit ${r.code}\n${r.text.slice(-7000)}`,
  );
  results.push({
    label,
    profile,
    exit: r.code,
    expectedSuccess: success,
    freshCache: true,
    packageImportsLocal: true,
    syscallTracingAvailable: false,
  });
  console.log(
    `PASS ${label}: exit=${r.code}, fresh cache, local package imports`,
  );
  return r.text;
}
function zipNames(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    names: string[] = [];
  let offset = 0;
  while (
    offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50
  ) {
    const n = view.getUint16(offset + 26, true),
      extra = view.getUint16(offset + 28, true),
      size = view.getUint32(offset + 18, true);
    names.push(decoder.decode(bytes.subarray(offset + 30, offset + 30 + n)));
    offset += 30 + n + extra + size;
  }
  return names;
}
await Deno.mkdir(evidence, { recursive: true });
try {
  await copy(join(repo, "fixtures/probes/five-parts"), consumer, {
    overwrite: true,
  });
  const manifest = [];
  for (const [name, owner] of packages) {
    const source = join(repo, owner, "_extensions/Afonenko-Course-Tools", name);
    const paths = await files(source);
    const contents = await Promise.all(
      paths.map(async (p) => ({
        path: relative(source, p),
        sha256: await hash(p),
      })),
    );
    manifest.push({
      name,
      version: (await Deno.readTextFile(join(source, "_extension.yml"))).match(
        /^version:\s*(.+)$/m,
      )?.[1],
      source: relative(repo, source),
      files: contents,
      bundledLicenses: contents.filter((p) => /LICENSE|COPYING/i.test(p.path))
        .map((p) => p.path),
    });
    for (const path of paths.filter((p) => /\.(ts|lua)$/.test(p))) {
      const module = await Deno.readTextFile(path);
      assert(
        !module.includes(repo),
        `${name}: developer path embedded in ${path}`,
      );
      assert(
        !/(?:from\s*|import\s*\(?\s*)["'](?:https?:|npm:|jsr:)/.test(module),
        `${name}: remote module dependency in ${path}`,
      );
    }
    await copy(
      source,
      join(consumer, "_extensions/Afonenko-Course-Tools", name),
    );
  }
  for (const member of members) {
    await copy(
      join(consumer, "_extensions"),
      join(consumer, member, "_extensions"),
    );
  }
  const versions = {} as Record<string, string>;
  for (
    const [cmd, args] of [[quarto, ["--version"]], ["cue", ["version"]], [
      "deno",
      ["--version"],
    ]] as [string, string[]][]
  ) {
    const r = await command(cmd, args);
    assert(r.success, `${cmd} missing`);
    versions[cmd] = r.text.trim();
  }
  await Deno.writeTextFile(
    join(evidence, "install-manifest.json"),
    JSON.stringify(
      {
        method: "copies of currently installed packages",
        upstream: await Deno.readTextFile(join(repo, "UPSTREAM.md")),
        versions,
        packages: manifest,
      },
      null,
      2,
    ),
  );
  assert(
    !(await files(consumer)).some((p) =>
      /\/(?:node_modules|\.git|\.quarto|_freeze)\//.test(p)
    ),
    "Consumer was accidentally seeded with developer/cache data",
  );
  for (const profile of ["student", "full"]) {
    await render(profile, profile);
    const output = join(consumer, `_site-${profile}`),
      published = await files(output);
    const listing = published.map((p) => relative(output, p));
    await Deno.writeTextFile(
      join(evidence, `${profile}-files.json`),
      JSON.stringify(listing, null, 2),
    );
    const pagePaths = [
      "index.html",
      ...members.map((m) => `${m}/index.html`),
      "tasks/labs/01.html",
      "tasks/plans/01.html",
    ];
    for (const path of pagePaths) {
      assert(await exists(join(output, path)), `${profile}: missing ${path}`);
    }
    for (
      const path of published.filter((p) => /\.(?:html|json|txt)$/.test(p))
    ) {
      const html = await Deno.readTextFile(path);
      assert(
        profile === "full" || !html.includes("FULL_ONLY_"),
        `${profile}: full content leaked in ${path}`,
      );
      assert(
        !html.includes(".project-publish/") && !html.includes(consumer),
        `${profile}: staging path leaked in ${path}`,
      );
      for (
        const match of html.matchAll(
          /\bdata-qrc-ref="([^"]+)"[^>]*href="([^"]+)"/g,
        )
      ) {
        const page = new URL(
          relative(output, path),
          "https://example.edu/courses/p0/",
        );
        const target = new URL(match[2], page);
        assert(
          target.pathname.startsWith("/courses/p0/"),
          `QRC link escaped deployment prefix: ${match[2]}`,
        );
        const linked = join(
          output,
          decodeURIComponent(target.pathname.slice("/courses/p0/".length)),
        );
        const targetHtml = await Deno.readTextFile(linked);
        const anchor = decodeURIComponent(
          target.hash.slice(1).replace(/^\//, ""),
        );
        assert(
          targetHtml.includes(`id="${anchor}"`),
          `QRC anchor missing: ${match[1]}`,
        );
      }
    }
    for (const member of members) {
      const html = await Deno.readTextFile(join(output, member, "index.html"));
      assert(
        html.includes(`FULL_ONLY_${member}`) === (profile === "full"),
        `${member}: profile output is wrong`,
      );
      const source =
        `https://github.com/example/five-parts/blob/feat/p0-consumer-proof/${member}/index.qmd`;
      assert(
        html.includes(`href="${source}"`),
        `${member}: source action/footer altered after QRC`,
      );
      assert(
        html.includes(
          'href="https://github.com/example/five-parts/issues/new"',
        ),
        `${member}: issue action/footer altered after QRC`,
      );
    }
    const theory = await Deno.readTextFile(join(output, "theory/index.html"));
    const lecture = await Deno.readTextFile(
      join(output, "lectures/index.html"),
    );
    assert(
      theory.includes("../lectures/index.html#/sec-lectures"),
      "Book to slides QRC href missing",
    );
    assert(
      lecture.includes("../theory/index.html#sec-theory"),
      "Slides to book QRC href missing",
    );
    assert(
      lecture.includes("PUBLIC_SPEAKER_NOTE"),
      "Public notes removed by show-notes:false",
    );
    assert(
      await exists(join(output, "assets/public.txt")) &&
        await exists(join(output, "tasks/assets/public.txt")),
      "Ordinary resources lost",
    );
    const archives = published.filter((p) => p.endsWith(".zip"));
    assert(
      archives.length === (profile === "full" ? 2 : 1),
      "Download profile selection failed",
    );
    for (const archive of archives) {
      assert(
        profile === "full" ||
          !decoder.decode(await Deno.readFile(archive)).includes("FULL_ONLY_"),
        "Full-only ZIP contents leaked to student",
      );
      assert(
        JSON.stringify(zipNames(await Deno.readFile(archive))) ===
          '["README.txt"]',
        `ZIP includes unselected sibling: ${archive}`,
      );
    }
    assert(
      !listing.some((p) =>
        /\.(qmd|ts|lua|cue)$/.test(p) || p.includes("/_extensions/")
      ),
      "Published source/package files",
    );
    const catalog = JSON.parse(
      await Deno.readTextFile(join(output, "reference-catalog.json")),
    );
    assert(
      JSON.stringify(Object.keys(catalog.targets).sort()) ===
        JSON.stringify(
          [
            "theory:sec-theory",
            "tasks:sec-tasks",
            "tasks:sec-lab",
            "tasks:sec-plan",
            "practice:sec-practice",
            "lectures:sec-lectures",
            "handbook:sec-handbook",
          ].sort(),
        ),
      "Unexpected QRC export set",
    );
    await copy(output, join(evidence, `site-${profile}`));
  }
  await render("studnet", "unknown-profile", false);
  await render("student,full", "conflicting-profiles", false);
  const childProfile = join(consumer, "handbook/_quarto-student.yml");
  const profileText = await Deno.readTextFile(childProfile);
  await Deno.remove(childProfile);
  const missing = await render("student", "missing-member-profile", false);
  assert(
    missing.includes("handbook") && missing.includes("student"),
    "Missing profile diagnostic lacks context",
  );
  await Deno.writeTextFile(childProfile, profileText);
  // A failed late member must not publish the members that already succeeded.
  const cfg = join(consumer, "handbook/_quarto.yml"),
    original = await Deno.readTextFile(cfg);
  await Deno.writeTextFile(
    cfg,
    original.replace("pre-render:", "pre-render:\n    - fail.ts"),
  );
  await Deno.writeTextFile(
    join(consumer, "handbook/fail.ts"),
    'throw new Error("P0_LATE_MEMBER_FAILURE");\n',
  );
  const failure = await render("student", "failed-member", false);
  assert(
    failure.includes("P0_LATE_MEMBER_FAILURE") &&
      failure.includes("сборка lectures"),
    "Failure did not occur after earlier successful members",
  );
  assert(
    !await exists(join(consumer, "_site-student/index.html")),
    "Partial portal published after member failure",
  );
  assert(
    await exists(join(consumer, "_site-full/index.html")),
    "Failure modified another profile",
  );
  await Deno.writeTextFile(cfg, original);
  await Deno.remove(join(consumer, "handbook/fail.ts"));
  await Deno.mkdir(join(consumer, "_site-student"), { recursive: true });
  await Deno.writeTextFile(
    join(consumer, "_site-student/obsolete.txt"),
    "OLD_RELEASE",
  );
  await render("", "default-student-recovery");
  assert(
    await exists(join(consumer, "_site-student/index.html")),
    "Default profile did not publish student output",
  );
  assert(
    !await exists(join(consumer, "_site-student/obsolete.txt")),
    "Old release resource survived recovery",
  );
  // Negative resource-boundary evidence: ordinary Quarto globs have no course visibility policy.
  const tasksConfig = join(consumer, "tasks/_quarto.yml");
  const tasksOriginal = await Deno.readTextFile(tasksConfig);
  await Deno.writeTextFile(
    tasksConfig,
    tasksOriginal.replace('"!materials/**"', "materials/**"),
  );
  await render("student", "closed-resource-glob");
  const leaked = await Deno.readTextFile(
    join(consumer, "_site-student/tasks/materials/instructor/README.txt"),
  );
  assert(
    leaked.includes("FULL_ONLY_DOWNLOAD"),
    "Baseline resource bypass changed; reevaluate the P0 gate",
  );
  results.push({
    label: "closed-resource-glob-policy",
    gatePassed: false,
    observed:
      "student output copied full-only resource by ordinary Quarto resources glob",
  });
  await Deno.writeTextFile(tasksConfig, tasksOriginal);
  await Deno.writeTextFile(
    join(evidence, "results.json"),
    JSON.stringify(
      {
        consumer,
        results,
        status: "baseline-assertions-passed",
        productionVisibilityGate:
          "blocked: ordinary resources bypass audience policy",
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS installed consumer: five sibling projects + portal, QRC, profiles, native repo actions, resources/ZIP, staged failure/recovery; resource-policy gap reproduced. Evidence: ${evidence}`,
  );
} finally {
  if (Deno.args.includes("--keep")) {
    console.log(`Consumer retained: ${consumer}`);
  } else await Deno.remove(consumer, { recursive: true });
}
