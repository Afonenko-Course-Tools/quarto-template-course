// Installed P0 seam proof. Trusted fixtures are intentionally outside the template API.
import { copy } from "stdlib/fs";
import {
  dirname,
  fromFileUrl,
  join,
  relative,
  resolve,
  toFileUrl,
} from "stdlib/path";
import {
  assert,
  command,
  exists,
  files,
  hash,
} from "../../fixtures/probes/artifacts/common.ts";
const repo = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
const arg = (key: string) => {
  const i = Deno.args.indexOf(key);
  return i < 0 ? undefined : Deno.args[i + 1];
};
const publisher = resolve(
  arg("--publisher") || Deno.env.get("ARTIFACT_PUBLISHER_SOURCE") || "",
);
const print = resolve(
  arg("--print") || Deno.env.get("ARTIFACT_PRINT_SOURCE") || "",
);
const core = resolve(
  arg("--core-export") || Deno.env.get("ARTIFACT_CORE_SOURCE") || "",
);
for (
  const [key, path] of [["--publisher", publisher], ["--print", print], [
    "--core-export",
    core,
  ]]
) assert(path !== Deno.cwd(), `${key} source required`);
const evidence = resolve(
  arg("--output") || await Deno.makeTempDir({ prefix: "artifact-evidence-" }),
);
const consumer = await Deno.makeTempDir({ prefix: "artifact-consumer-" });
const preparation = await Deno.makeTempDir({ prefix: "artifact-install-" });
const quarto = Deno.env.get("QUARTO") || "quarto";
const results: any[] = [], manifest: any[] = [];
await Deno.mkdir(evidence, { recursive: true });
const packages = [
  // The historical P0 producer and its native runtime come from the same source.
  ["course-core", join(core, "_extensions/course-core")],
  [
    "course-presentation",
    join(repo, "book/_extensions/Afonenko-Course-Tools/course-presentation"),
  ],
  [
    "course-navigation",
    join(repo, "practice/_extensions/Afonenko-Course-Tools/course-navigation"),
  ],
  [
    "project-download",
    join(repo, "book/_extensions/Afonenko-Course-Tools/project-download"),
  ],
  [
    "reference-catalog",
    join(repo, "_extensions/Afonenko-Course-Tools/reference-catalog"),
  ],
  ["project-publish", join(publisher, "_extensions/project-publish")],
  ["course-print", join(print, "_extensions/course-print")],
];
async function install(name: string, source: string) {
  const tarRoot = join(preparation, name);
  await copy(source, join(tarRoot, "_extensions", name));
  const archive = join(preparation, `${name}.tar.gz`);
  await command("tar", ["-czf", archive, "-C", tarRoot, "."], preparation);
  await command(quarto, ["add", archive, "--no-prompt"], consumer);
  const installed = join(consumer, "_extensions", name);
  for (let path = installed; path !== consumer; path = dirname(path)) {
    assert(
      !(await Deno.lstat(path)).isSymlink,
      `${name}: installed path alias ${path}`,
    );
  }
  const expected = (await files(source)).map((p) => relative(source, p));
  assert(
    JSON.stringify(expected) ===
      JSON.stringify(
        (await files(installed)).map((p) => relative(installed, p)),
      ),
    `${name}: installed file set`,
  );
  const entries = [];
  for (const p of expected) {
    const digest = await hash(join(source, p));
    assert(
      digest === await hash(join(installed, p)),
      `${name}: installed byte mismatch ${p}`,
    );
    entries.push({ path: p, sha256: digest });
  }
  manifest.push({ name, archiveSha256: await hash(archive), files: entries });
  if (name !== "course-print") {
    await Deno.mkdir(join(consumer, "_extensions/Afonenko-Course-Tools"), {
      recursive: true,
    });
    await Deno.rename(
      installed,
      join(consumer, "_extensions/Afonenko-Course-Tools", name),
    );
  }
}
async function render(label: string, profile = "student", failure?: string) {
  const cache = join(evidence, `cache-${label}`);
  assert(!await exists(cache), `fresh cache already exists: ${cache}`);
  const start = performance.now();
  const r = await new Deno.Command(quarto, {
    args: ["render", "--profile", profile],
    cwd: consumer,
    env: {
      XDG_CACHE_HOME: cache,
      DENO_DIR: join(cache, "deno"),
      QUARTO_RUN_NO_NETWORK: "true",
    },
    stdout: "piped",
    stderr: "piped",
  }).output();
  const text = new TextDecoder().decode(r.stdout) +
    new TextDecoder().decode(r.stderr);
  await Deno.writeTextFile(join(evidence, `${label}.log`), text);
  assert(
    r.success === !failure,
    `${label}: unexpected exit ${r.code}\n${text.slice(-7000)}`,
  );
  if (failure) {
    assert(
      text.includes(failure),
      `${label}: missing failure ${failure}\n${text.slice(-5000)}`,
    );
    assert(
      !await exists(join(consumer, `_site-${profile}`)),
      `${label}: current preliminary output remains`,
    );
  }
  results.push({
    label,
    profile,
    expectedFailure: failure ?? null,
    exit: r.code,
    milliseconds: Math.round(performance.now() - start),
  });
  console.log(`PASS ${label} (${r.code})`);
  return text;
}
const input = join(preparation, "input");
async function makePackage() {
  const generator = join(preparation, "generate.ts");
  await Deno.writeTextFile(
    generator,
    `import {buildPackage} from ${
      JSON.stringify(
        toFileUrl(join(core, "tests/probes/export-boundary/package.ts")).href,
      )
    };\nconst p=await buildPackage(${
      JSON.stringify(
        ["corpus.qmd", "work-one.qmd", "work-two.qmd"].map((n) =>
          toFileUrl(join(input, n)).href
        ),
      )
    }.map(v=>new URL(v)), "artifact-course");\nawait Deno.writeTextFile(${
      JSON.stringify(join(consumer, "_probe/package.json"))
    },JSON.stringify(p));\n`,
  );
  await command(quarto, ["run", generator], preparation);
}
async function selection(value: any) {
  await Deno.writeTextFile(
    join(consumer, "_probe/selection.json"),
    JSON.stringify(value),
  );
}
async function zip(profile: string) {
  return JSON.parse(
    await command("python3", [
      "-c",
      "import base64,json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n print(json.dumps({n:base64.b64encode(z.read(n)).decode() for n in z.namelist()}))",
      join(consumer, `_site-${profile}/tasks/_downloads/starter.zip`),
    ], consumer),
  );
}
async function verifyRelease(profile: string, withPrint = true) {
  const output = join(consumer, `_site-${profile}`);
  for (
    const member of ["theory", "tasks", "practice", "lectures", "handbook"]
  ) {
    const html = await Deno.readTextFile(join(output, member, "index.html"));
    assert(
      html.includes("github.com/example/five-parts") &&
        html.includes("issues/new"),
      `${member}: native source/issue regression`,
    );
  }
  assert(
    (await Deno.readTextFile(join(output, "lectures/index.html"))).includes(
      "PUBLIC_SPEAKER_NOTE",
    ),
    "public notes lost",
  );
  assert(
    await exists(join(output, "tasks/assets/public.txt")),
    "ordinary permitted resource lost",
  );
  assert(
    await hash(join(output, "tasks/assets/shared.png")) ===
      await hash(join(consumer, "tasks/assets/shared.png")),
    "shared public image was dropped because of closed notes",
  );
  for (const file of await files(output)) {
    assert(
      !/\.(?:qmd|ts|lua|cue)$/.test(file) && !file.includes("/_extensions/") &&
        !file.endsWith("/public.json") && !file.endsWith("/.course-print.json"),
      "service/source file published",
    );
    if (/\.(?:html|json|txt)$/.test(file)) {
      assert(
        !/TEACHER_SECRET|GRADING_SECRET/.test(await Deno.readTextFile(file)),
        "trusted package leaked in publication",
      );
    }
  }
  const archive = await zip(profile);
  const expected = [
    "README.txt",
    "build.sh",
    "dependency.lock",
    "src/main.txt",
    ...(withPrint
      ? [
        "handout.pdf",
        ...JSON.parse(
          await Deno.readTextFile(join(consumer, "_probe/package.json")),
        ).resources.map((r: any) => r.target),
      ]
      : []),
  ].sort();
  assert(
    JSON.stringify(Object.keys(archive).sort()) === JSON.stringify(expected),
    `starter exact file set: ${Object.keys(archive)}`,
  );
  for (
    const path of ["README.txt", "build.sh", "dependency.lock", "src/main.txt"]
  ) {
    const bytes = await Deno.readFile(
      join(consumer, "tasks/materials/student", path),
    );
    assert(
      archive[path] === btoa(String.fromCharCode(...bytes)),
      `starter bytes changed: ${path}`,
    );
  }
  if (withPrint) {
    const packageValue = JSON.parse(
      await Deno.readTextFile(join(consumer, "_probe/package.json")),
    );
    for (const resource of packageValue.resources) {
      assert(
        archive[resource.target] === resource.data,
        `linked resource bytes changed: ${resource.target}`,
      );
      assert(
        await hash(join(output, "tasks/handouts", resource.target)) ===
          resource.sha256,
        `published resource missing/stale: ${resource.target}`,
      );
    }
    const pdf = await Deno.readFile(join(output, "tasks/handouts/current.pdf"));
    assert(
      archive["handout.pdf"] === btoa(String.fromCharCode(...pdf)),
      "ZIP PDF is not the current exact PDF bytes",
    );
    const txt = await command("pdftotext", [
      join(output, "tasks/handouts/current.pdf"),
      "-",
    ], consumer);
    assert(
      txt.includes("Practice") && txt.includes("TLS") &&
        !/TEACHER_SECRET|GRADING_SECRET/.test(txt),
      "paper public projection",
    );
    assert(
      /Date:\s*_{4}/.test(txt) && /Group:\s*_{4}/.test(txt),
      "manual catalogue fields missing",
    );
    const links = await command("pdfinfo", [
      "-url",
      join(output, "tasks/handouts/current.pdf"),
    ], consumer);
    assert(
      links.includes(
        "https://example.edu/courses/p0/theory/index.html#sec-theory",
      ),
      "PDF lacks current QRC hyperlink",
    );
  } else {assert(
      !await exists(join(output, "tasks/handouts")),
      "removed target retained PDF/resources",
    );}
  const log =
    (await Deno.readTextFile(join(consumer, "_artifact-evidence/events.jsonl")))
      .trim().split("\n").map((s) => JSON.parse(s));
  const last = log.filter((e) => e.attemptId === log.at(-1).attemptId);
  assert(
    JSON.stringify(last.map((e) => e.stage)) ===
      JSON.stringify([
        "owner-check",
        "owner-checked",
        "qrc-observed",
        ...(withPrint ? ["print-ready"] : []),
        "package-start",
        "package-ready",
        "verified",
      ]),
    "ordered QRC/PDF/ZIP verification failed",
  );
  await Deno.writeTextFile(
    join(evidence, `${profile}-events.json`),
    JSON.stringify(last, null, 2),
  );
  return last;
}
try {
  await copy(join(repo, "fixtures/probes/five-parts"), consumer, {
    overwrite: true,
  });
  await copy(join(repo, "fixtures/probes/artifacts"), join(consumer, "_probe"));
  for (const [name, source] of packages) await install(name, source);
  for (
    const member of ["theory", "tasks", "practice", "lectures", "handbook"]
  ) {
    await copy(
      join(consumer, "_extensions"),
      join(consumer, member, "_extensions"),
    );
  }
  // quarto add creates its own project cache; discard it before the render proof.
  for (
    const root of [
      consumer,
      ...["theory", "tasks", "practice", "lectures", "handbook"].map((m) =>
        join(consumer, m)
      ),
    ]
  ) {
    if (await exists(join(root, ".quarto"))) {
      await Deno.remove(join(root, ".quarto"), { recursive: true });
    }
  }
  assert(
    !(await files(consumer)).some((p) =>
      /\/(?:node_modules|\.git|\.quarto)\//.test(p)
    ),
    "developer/cache data seeded installed consumer",
  );
  await copy(join(core, "tests/probes/export-boundary/fixtures"), input);
  await makePackage();
  await Deno.copyFile(
    join(input, "dot.png"),
    join(consumer, "tasks/assets/shared.png"),
  );
  const denied = "tasks/materials/instructor/README.txt";
  await Deno.writeTextFile(
    join(consumer, "_probe/policy.json"),
    JSON.stringify({
      schema: "trusted-resource-policy-fixture-v1",
      resources: [{
        source: denied,
        target: denied,
        sha256: await hash(join(consumer, denied)),
        deniedProfiles: ["student"],
      }, {
        source: "tasks/assets/shared.png",
        target: "tasks/assets/shared.png",
        sha256: await hash(join(consumer, "tasks/assets/shared.png")),
        deniedProfiles: [],
      }],
    }),
  );
  await selection({ print: true });
  const rootConfig = join(consumer, "_quarto.yml");
  await Deno.writeTextFile(
    rootConfig,
    (await Deno.readTextFile(rootConfig)).replace(
      "  integrations:\n",
      "  integrations:\n    - _probe/owner.ts\n",
    ) + "    - _probe/delivery.ts\n    - _probe/verify.ts\n",
  );
  const tasksConfig = join(consumer, "tasks/_quarto.yml");
  const baseTasks = (await Deno.readTextFile(tasksConfig)).replace(
    "    - _extensions/Afonenko-Course-Tools/project-download/entrypoints/post.ts\n",
    "",
  );
  await Deno.writeTextFile(tasksConfig, baseTasks);
  await Deno.mkdir(join(consumer, "tasks/materials/student/src"), {
    recursive: true,
  });
  for (
    const [path, content] of [["build.sh", "#!/bin/sh\ncat src/main.txt\n"], [
      "dependency.lock",
      "locked fixture dependency=1\n",
    ], ["src/main.txt", "PUBLIC_UNLINKED_SOURCE\n"]]
  ) {
    await Deno.writeTextFile(
      join(consumer, "tasks/materials/student", path),
      content,
    );
  }
  // Equal basenames from distinct resource bases remain distinct. Public shared
  // resource is also referenced in closed notes, without acquiring closed policy.
  await Deno.writeTextFile(
    join(consumer, "tasks/assets/README.txt"),
    "PUBLIC_SHARED_RESOURCE\n",
  );
  const taskInput = join(consumer, "tasks/index.qmd"),
    originalTask = await Deno.readTextFile(taskInput);
  const permittedTask = originalTask +
    "\n[Public shared](assets/README.txt).\n\n![Public image](assets/shared.png)\n\n::: {.when-full}\n![Same public image in closed notes](assets/shared.png)\n:::\n";
  await Deno.writeTextFile(taskInput, permittedTask);
  await Deno.writeTextFile(
    join(evidence, "install-manifest.json"),
    JSON.stringify(
      {
        method: "local archives -> quarto add -> complete file-byte equality",
        versions: {
          quarto: (await command(quarto, ["--version"], consumer)).trim(),
          pandoc:
            (await command(quarto, ["pandoc", "--version"], consumer)).split(
              "\n",
            )[0],
          typst: (await command(quarto, ["typst", "--version"], consumer))
            .trim(),
          cue: (await command("cue", ["version"], consumer)).split("\n")[0],
        },
        companionSources: await Promise.all(
          [["publisher", publisher], ["print", print], ["core-export", core]]
            .map(async ([name, path]) => ({
              name,
              commit: (await command("git", ["rev-parse", "HEAD"], path))
                .trim(),
              dirty: !!(await command("git", ["status", "--porcelain"], path))
                .trim(),
            })),
        ),
        packages: manifest,
      },
      null,
      2,
    ),
  );
  await render("student-current");
  const first = await verifyRelease("student");
  await copy(
    join(consumer, "_site-student/tasks/handouts/current.pdf"),
    join(evidence, "current.pdf"),
  );
  await render("full-current", "full");
  await verifyRelease("full");
  assert(
    await exists(join(consumer, "_site-full/tasks/_downloads/instructor.zip")),
    "full permitted selection missing",
  );
  const rootOriginal = await Deno.readTextFile(rootConfig);
  await Deno.writeTextFile(
    rootConfig,
    rootOriginal.replace("./assets/**", "assets/**"),
  );
  const serviceGlob = await render(
    "unanchored-service-assets",
    "student",
    "SERVICE_RESOURCE_SELECTION",
  );
  assert(
    !serviceGlob.includes("Публикация: сборка"),
    "service glob reached member render",
  );
  await Deno.writeTextFile(rootConfig, rootOriginal);
  // Inspect-produced overlapping directory selection must reject its denied descendant.
  await Deno.writeTextFile(
    tasksConfig,
    baseTasks.replace('"!materials/**"', "materials/**"),
  );
  const badGlob = await render(
    "denied-glob",
    "student",
    "DENIED_RESOURCE_SELECTION",
  );
  assert(
    !badGlob.includes("Публикация: сборка"),
    "denied glob reached member render",
  );
  await Deno.writeTextFile(
    tasksConfig,
    baseTasks.replace('"!materials/**"', "materials"),
  );
  await render(
    "denied-parent-directory",
    "student",
    "DENIED_RESOURCE_SELECTION",
  );
  await Deno.writeTextFile(tasksConfig, baseTasks);
  await Deno.writeTextFile(
    taskInput,
    permittedTask + "\n[Forbidden](materials/instructor/README.txt).\n",
  );
  await render("denied-authored-link", "student", "DENIED_AUTHORED_LINK");
  await Deno.writeTextFile(taskInput, permittedTask);
  assert(
    await exists(join(consumer, "_site-full/index.html")),
    "student failure changed other profile",
  );
  await selection({ print: true, fail: "late-resource" });
  await render("denied-late-resource", "student", "DENIED_FINAL_RESOURCE");
  await selection({ print: true, fail: "print" });
  await render("failed-print", "student", "closed question");
  await selection({ print: true, fail: "pack" });
  await render("failed-package", "student", "prepared/missing");
  await selection({ print: false });
  await render("removed-print-target");
  await verifyRelease("student", false);
  await selection({ print: true });
  // Fresh native Core collection after an authored condition change.
  const corpus = join(input, "corpus.qmd");
  await Deno.writeTextFile(
    corpus,
    (await Deno.readTextFile(corpus)).replace(
      "Explain $x^2 + 1$",
      "Explain UPDATED $x^2 + 2$",
    ),
  );
  await makePackage();
  await render("updated-condition");
  const changed = await verifyRelease("student");
  const changedText = await command("pdftotext", [
    join(consumer, "_site-student/tasks/handouts/current.pdf"),
    "-",
  ], consumer);
  assert(
    changedText.includes("UPDATED"),
    "updated condition did not reach PDF text",
  );
  assert(
    first.find((e) => e.stage === "print-ready").result.fingerprint !==
      changed.find((e) => e.stage === "print-ready").result.fingerprint,
    "condition change kept stale fingerprint",
  );
  // Authored image edit, recollected through the same native producer.
  await command("python3", [
    "-c",
    "import struct,zlib,sys\ndef chunk(k,v): return struct.pack('>I',len(v))+k+v+struct.pack('>I',zlib.crc32(k+v))\nopen(sys.argv[1],'wb').write(bytes([137,80,78,71,13,10,26,10])+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes([0,255,0,0])))+chunk(b'IEND',b''))",
    join(input, "dot.png"),
  ], preparation);
  await makePackage();
  await render("updated-image");
  const imageChanged = await verifyRelease("student");
  assert(
    changed.find((e) => e.stage === "print-ready").result.fingerprint !==
      imageChanged.find((e) => e.stage === "print-ready").result.fingerprint,
    "image change kept stale fingerprint",
  );
  await Deno.remove(join(consumer, "_site-student/tasks/handouts/current.pdf"));
  await render("deleted-current-pdf");
  await verifyRelease("student");
  await Deno.writeTextFile(
    join(evidence, "results.json"),
    JSON.stringify(
      {
        consumer,
        results,
        status: "installed-artifact-seams-passed",
        boundaries: [
          "trusted policy fixture, not production Core resource derivation",
          "authored native Pandoc links only; no complete include/late AST closure",
          "native root portal may exist temporarily before post-render cleanup",
          "upstream validated fixture bundle; no general QRC body bridge",
          "no OS isolation claim for child processes",
        ],
      },
      null,
      2,
    ),
  );
  console.log(`PASS installed artifact seams: ${evidence}`);
} finally {
  await Deno.remove(preparation, { recursive: true });
  if (Deno.args.includes("--keep")) {
    console.log(`Consumer retained: ${consumer}`);
  } else await Deno.remove(consumer, { recursive: true });
}
