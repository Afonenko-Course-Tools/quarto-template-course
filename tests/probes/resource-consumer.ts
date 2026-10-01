// Текущая installed попытка: production Core resources + экспериментальный Print body.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join, relative, resolve } from "stdlib/path";
import {
  assert,
  command,
  exists,
  files,
  hash,
} from "../../fixtures/probes/artifacts/common.ts";
const repo = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
const arg = (name: string) => {
  const i = Deno.args.indexOf(name);
  return i < 0 ? undefined : Deno.args[i + 1];
};
const providers = Object.fromEntries(
  ["core", "core-export", "publisher", "download", "print"].map((name) => {
    const path = arg(`--${name}`);
    assert(path, `--${name} required`);
    return [name, resolve(path)];
  }),
);
const quarto = Deno.env.get("QUARTO") || "quarto";
const evidence = resolve(
  arg("--output") || await Deno.makeTempDir({ prefix: "resource-evidence-" }),
);
const resume = arg("--resume");
const reviewOnly = Deno.args.includes("--review-fixes");
assert(!reviewOnly || !!resume, "--review-fixes requires --resume");
const consumer = resume
  ? resolve(resume)
  : await Deno.makeTempDir({ prefix: "resource-consumer-" });
const preparation = await Deno.makeTempDir({ prefix: "resource-install-" });
await Deno.mkdir(evidence, { recursive: true });
const manifest: unknown[] = [], results: Record<string, unknown>[] = [];
async function install(name: string, source: string) {
  const tarRoot = join(preparation, name),
    archive = join(preparation, `${name}.tar.gz`);
  await copy(source, join(tarRoot, "_extensions", name));
  await command("tar", ["-czf", archive, "-C", tarRoot, "."], preparation);
  await command(quarto, ["add", archive, "--no-prompt"], consumer);
  const installed = join(consumer, "_extensions", name);
  const expected = (await files(source)).map((p) => relative(source, p));
  assert(
    JSON.stringify(expected) ===
      JSON.stringify(
        (await files(installed)).map((p) => relative(installed, p)),
      ),
    `${name}: installed file set`,
  );
  const entries = [];
  for (const path of expected) {
    const sha256 = await hash(join(source, path));
    assert(
      sha256 === await hash(join(installed, path)),
      `${name}: bytes ${path}`,
    );
    entries.push({ path, sha256 });
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
  assert(!await exists(cache), `fresh cache ${label}`);
  const start = performance.now();
  const r = await new Deno.Command(quarto, {
    args: ["render", "--profile", profile],
    cwd: consumer,
    env: {
      QUARTO: quarto,
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
    `${label}: unexpected ${r.code}\n${text.slice(-9000)}`,
  );
  if (failure) {
    assert(
      text.includes(failure),
      `${label}: missing ${failure}\n${text.slice(-9000)}`,
    );
    assert(
      !await exists(join(consumer, `_site-${profile}`)),
      `${label}: current commit exists`,
    );
  }
  results.push({
    label,
    profile,
    expectedFailure: failure ?? null,
    exit: r.code,
    milliseconds: Math.round(performance.now() - start),
  });
  await Deno.writeTextFile(
    join(evidence, "partial-results.json"),
    JSON.stringify({ consumer, results }, null, 2),
  );
  console.log(`PASS ${label} (${r.code})`);
  return text;
}
async function treeHashes(root: string) {
  return Object.fromEntries(
    await Promise.all(
      (await files(root)).map(async (p) => [relative(root, p), await hash(p)]),
    ),
  );
}
async function selection(value: unknown) {
  await Deno.writeTextFile(
    join(consumer, "_probe/selection.json"),
    JSON.stringify(value) + "\n",
  );
}
async function latestEvents() {
  const log =
    (await Deno.readTextFile(join(consumer, "_artifact-evidence/events.jsonl")))
      .trim().split("\n").map((s) => JSON.parse(s));
  return log.filter((e) => e.attemptId === log.at(-1).attemptId);
}
async function verifyRelease(profile: string, withPrint = true) {
  const output = join(consumer, `_site-${profile}`),
    events = await latestEvents();
  assert(
    JSON.stringify(events.map((e) => e.stage)) ===
      JSON.stringify([
        "owner-prepare",
        "owner-prepared",
        "owner-activated",
        "owner-finished",
        "owner-index",
        "qrc-observed",
        ...(withPrint ? ["print-ready"] : []),
        "package-start",
        "package-ready",
        "verified",
      ]),
    "ordered lifecycle",
  );
  const runtime = events.find((e) => e.stage === "verified").runtimeWitnesses;
  for (
    const member of ["theory", "tasks", "practice", "lectures", "handbook"]
  ) {
    assert(
      ["disclosure.js", "presentation.js", "presentation.css"].every((asset) =>
        runtime.some((w: any) => w.member === member && w.asset === asset)
      ),
      `${member}: current marked runtime witness missing`,
    );
  }
  const owner = events.find((e) => e.stage === "owner-index");
  assert(
    owner.index.policy.files.some((f: any) =>
      f.path === "materials/instructor/README.txt" &&
      f.allowed === (profile === "full")
    ),
    "closed-only policy",
  );
  for (const path of ["index.qmd", "_intro.qmd"]) {
    assert(
      owner.index.policy.files.find((f: any) => f.path === path)?.allowed ===
        false,
      `canonical source permitted ${path}`,
    );
  }
  assert(
    owner.index.files.find((f: any) =>
          f.path === "materials/student/starter.qmd"
        )?.role === "resource" &&
      owner.index.policy.files.find((f: any) =>
        f.path === "materials/student/starter.qmd"
      )?.allowed,
    "native registered starter QMD denied",
  );
  assert(
    owner.index.policy.files.find((f: any) => f.path === "assets/shared.png")
      ?.allowed,
    "shared public image",
  );
  assert(
    owner.index.files.some((f: any) => f.origin === "generated"),
    "native generated image evidence",
  );
  assert(owner.engineRuns === 1, "owner engine did not execute exactly once");
  assert(
    events.filter((e) => e.stage === "owner-activated").length === 1 &&
      events.find((e) => e.stage === "owner-activated").namespace === "tasks",
    "owner metadata leaked to another member",
  );
  for (
    const member of ["theory", "tasks", "practice", "lectures", "handbook"]
  ) {
    const html = await Deno.readTextFile(join(output, member, "index.html"));
    assert(
      html.includes("github.com/example/five-parts") &&
        html.includes("issues/new"),
      `${member}: source/issue`,
    );
  }
  assert(
    (await Deno.readTextFile(join(output, "lectures/index.html"))).includes(
      "PUBLIC_SPEAKER_NOTE",
    ),
    "public notes",
  );
  assert(
    (await Deno.readTextFile(join(output, "tasks/index.html"))).includes(
      "PUBLIC_ORDINARY_SOL",
    ),
    "ordinary public sol lost",
  );
  const zipFile = join(output, "tasks/_downloads/starter.zip");
  const archive = JSON.parse(
    await command("python3", [
      "-c",
      "import base64,json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z: print(json.dumps({n:base64.b64encode(z.read(n)).decode() for n in z.namelist()}))",
      zipFile,
    ], consumer),
  );
  for (
    const path of [
      "README.txt",
      "build.sh",
      "dependency.lock",
      "src/main.txt",
      "starter.qmd",
    ]
  ) {
    assert(
      archive[path] ===
        btoa(
          String.fromCharCode(
            ...await Deno.readFile(
              join(consumer, "tasks/materials/student", path),
            ),
          ),
        ),
      `starter bytes ${path}`,
    );
  }
  if (withPrint) {
    const pdf = join(output, "tasks/handouts/current.pdf");
    assert(
      archive["handout.pdf"] ===
        btoa(String.fromCharCode(...await Deno.readFile(pdf))),
      "exact current PDF ZIP bytes",
    );
    const txt = await command("pdftotext", [pdf, "-"], consumer);
    assert(
      txt.includes("Practice") && txt.includes("TLS") &&
        !/TEACHER_SECRET|GRADING_SECRET/.test(txt),
      "Print public body",
    );
    assert(
      (await command("pdfinfo", ["-url", pdf], consumer)).includes(
        "https://example.edu/courses/p0/theory/index.html#sec-theory",
      ),
      "current QRC URL",
    );
  } else {assert(
      !await exists(join(output, "tasks/handouts")),
      "removed Print target survived",
    );}
  results.at(-1)!.phaseTimings =
    events.find((e) => e.stage === "verified").timings;
  results.at(-1)!.printTimings =
    events.find((e) => e.stage === "print-ready")?.result.timings ?? null;
  await Deno.writeTextFile(
    join(evidence, `${profile}-events.json`),
    JSON.stringify(events, null, 2),
  );
}
const rootConfig = join(consumer, "_quarto.yml"),
  tasksConfig = join(consumer, "tasks/_quarto.yml");
let baseTasks: string, originalRoot: string;
try {
  if (!resume) {
    await copy(join(repo, "fixtures/probes/five-parts"), consumer, {
      overwrite: true,
    });
    await copy(
      join(repo, "fixtures/probes/resources"),
      join(consumer, "_probe/resources"),
    );
    await Deno.mkdir(join(consumer, "_probe/artifacts"), { recursive: true });
    await Deno.copyFile(
      join(repo, "fixtures/probes/artifacts/common.ts"),
      join(consumer, "_probe/artifacts/common.ts"),
    );
    const packages = [[
      "course-core",
      join(providers.core, "_extensions/course-core"),
    ], [
      "course-presentation",
      join(providers.core, "_extensions/course-presentation"),
    ], [
      "course-navigation",
      join(
        repo,
        "practice/_extensions/Afonenko-Course-Tools/course-navigation",
      ),
    ], [
      "project-download",
      join(providers.download, "_extensions/project-download"),
    ], [
      "reference-catalog",
      join(repo, "_extensions/Afonenko-Course-Tools/reference-catalog"),
    ], [
      "project-publish",
      join(providers.publisher, "_extensions/project-publish"),
    ], ["course-print", join(providers.print, "_extensions/course-print")]];
    await Deno.copyFile(
      join(repo, "tests/probes/resource-faults.ts"),
      join(consumer, "_probe/faults.ts"),
    );
    await Deno.writeTextFile(
      join(consumer, "_probe/owner-fault.ts"),
      'export {ownerFault as default} from "./faults.ts";\n',
    );
    await Deno.writeTextFile(
      join(consumer, "_probe/zip-fault.ts"),
      'export {zipFault as default} from "./faults.ts";\n',
    );
    for (const [name, source] of packages) await install(name, source);
    for (
      const member of ["theory", "tasks", "practice", "lectures", "handbook"]
    ) {
      const needed = [
        "course-core",
        "course-presentation",
        ...(member === "tasks" ? ["project-download"] : []),
        ...(["practice", "lectures"].includes(member)
          ? ["course-navigation"]
          : []),
      ];
      for (const name of needed) {
        await copy(
          join(consumer, "_extensions/Afonenko-Course-Tools", name),
          join(consumer, member, "_extensions/Afonenko-Course-Tools", name),
        );
      }
    }
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
    const bridge = join(consumer, "_probe/body"),
      producer = join(providers["core-export"], "tests/probes/export-boundary");
    await Deno.mkdir(join(bridge, "producer"), { recursive: true });
    for (
      const name of [
        "package.ts",
        "answer.cue",
        "assessments.cue",
        "declarations.cue",
        "package.cue",
      ]
    ) await Deno.copyFile(join(producer, name), join(bridge, "producer", name));
    await copy(join(producer, "vendor"), join(bridge, "producer/vendor"));
    await copy(join(producer, "fixtures"), join(bridge, "input"));
    await Deno.writeTextFile(
      join(consumer, "_probe/body-manifest.json"),
      JSON.stringify(
        await Promise.all(
          (await files(bridge)).map(async (path) => ({
            path: relative(consumer, path),
            sha256: await hash(path),
          })),
        ),
      ),
    );
    await Deno.copyFile(
      join(bridge, "input/dot.png"),
      join(consumer, "tasks/assets/shared.png"),
    );
    for (
      const [path, content] of [
        ["build.sh", "#!/bin/sh\ncat src/main.txt\n"],
        ["dependency.lock", "locked dependency=1\n"],
        ["src/main.txt", "PUBLIC_UNLINKED_SOURCE\n"],
        ["starter.qmd", "# Starter source\n"],
      ]
    ) {
      await Deno.mkdir(
        dirname(join(consumer, "tasks/materials/student", path)),
        {
          recursive: true,
        },
      );
      await Deno.writeTextFile(
        join(consumer, "tasks/materials/student", path),
        content,
      );
    }
    const taskInput = join(consumer, "tasks/index.qmd");
    await Deno.writeTextFile(
      rootConfig,
      (await Deno.readTextFile(rootConfig)).replace(
        "  integrations:\n",
        "  integrations:\n    - _probe/resources/owner.ts\n",
      ) +
        "    - _probe/resources/delivery.ts\n    - _probe/resources/verify.ts\n",
    );
    await Deno.remove(join(consumer, "tasks/labs"), { recursive: true });
    await Deno.remove(join(consumer, "tasks/plans"), { recursive: true });
    await Deno.writeTextFile(
      rootConfig,
      (await Deno.readTextFile(rootConfig)).replace(
        "[sec-tasks, sec-lab, sec-plan]",
        "[sec-tasks]",
      ),
    );
    baseTasks = (await Deno.readTextFile(tasksConfig)).replace(
      "    - labs/01.qmd\n",
      "",
    ).replace("    - plans/01.qmd\n", "").replace(
      "    - _extensions/Afonenko-Course-Tools/course-core/entrypoints/pre.ts\n",
      "    - _extensions/Afonenko-Course-Tools/course-core/entrypoints/pre.ts\n    - _extensions/Afonenko-Course-Tools/course-core/entrypoints/owner-freeze.ts\n",
    ).replace(
      '"!materials/**"',
      './materials/student/**, "!materials/instructor/**"',
    );
    await Deno.writeTextFile(tasksConfig, baseTasks);
    const permittedTask = "---\nengine: knitr\n---\n" +
      (await Deno.readTextFile(taskInput)) +
      '\n![Shared public](assets/shared.png)\n\n::: {.when-full}\n[Closed-only](materials/instructor/README.txt)\n![Shared closed](assets/shared.png)\n:::\n\n:::: {#exr-public target="manual" difficulty="introductory" work-mode="individual"}\n## Public exercise\nPublic condition.\n::::\n\n::: {#sol-public for="exr-public"}\nPUBLIC_ORDINARY_SOL\n:::\n\n```{r}\n#| echo: false\n#| cache: false\nstarted <- proc.time()[["elapsed"]]\np <- "../_probe/engine-runs.txt"\ncat("run\n", file=p, append=TRUE)\nplot(1:3)\ncat((proc.time()[["elapsed"]]-started)*1000, file="../_probe/engine-ms.txt")\nif (any(grepl("late-link", readLines("../_probe/selection.json")))) knitr::asis_output("\n[Late closed](materials/instructor/README.txt)\n")\n```\n';
    await Deno.writeTextFile(taskInput, permittedTask);
    await selection({ print: true });
    await Deno.writeTextFile(
      join(evidence, "install-manifest.json"),
      JSON.stringify(
        {
          method: "local archives -> quarto add -> complete file/byte equality",
          versions: {
            quarto: (await command(quarto, ["--version"], consumer)).trim(),
            pandoc:
              (await command(quarto, ["pandoc", "--version"], consumer)).split(
                "\n",
              )[0],
            typst: (await command(quarto, ["typst", "--version"], consumer))
              .trim(),
            cue: (await command("cue", ["version"], consumer)).split("\n")[0],
            R: (await command("Rscript", [
              "--vanilla",
              "-e",
              'cat(R.version.string,"\\n"); for (p in c("knitr","rmarkdown")) cat(p,as.character(packageVersion(p)),"\\n")',
            ], consumer)).trim(),
            python: (await command("python3", ["--version"], consumer)).trim(),
            archiveDetector:
              (await command("file", ["--version"], consumer)).split("\n")[0],
          },
          companionSources: await Promise.all(
            Object.entries(providers).map(async ([name, path]) => ({
              name,
              commit: (await command("git", ["rev-parse", "HEAD"], path))
                .trim(),
              tree: (await command("git", ["rev-parse", "HEAD^{tree}"], path))
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
    originalRoot = await Deno.readTextFile(rootConfig);
    await Deno.writeTextFile(
      join(consumer, "_probe/test-setup.json"),
      JSON.stringify({ originalRoot, baseTasks }),
    );
  } else {
    ({ originalRoot, baseTasks } = JSON.parse(
      await Deno.readTextFile(join(consumer, "_probe/test-setup.json")),
    ));
    await Deno.writeTextFile(rootConfig, originalRoot);
    await Deno.writeTextFile(tasksConfig, baseTasks);
    assert(arg("--prior-evidence"), "--resume requires --prior-evidence");
    const prior = resolve(arg("--prior-evidence")!);
    await Deno.copyFile(
      join(prior, "install-manifest.json"),
      join(evidence, "install-manifest.json"),
    );
    for (
      const pkg of JSON.parse(
        await Deno.readTextFile(join(prior, "install-manifest.json")),
      ).packages
    ) {
      const installed = join(
        consumer,
        "_extensions",
        pkg.name === "course-print"
          ? pkg.name
          : "Afonenko-Course-Tools/" + pkg.name,
      );
      assert(
        JSON.stringify(
          (await files(installed)).map((p) => relative(installed, p)),
        ) === JSON.stringify(pkg.files.map((f: any) => f.path)),
        "resume installed set " + pkg.name,
      );
      for (const f of pkg.files) {
        assert(
          await hash(join(installed, f.path)) === f.sha256,
          "resume installed byte " + pkg.name + "/" + f.path,
        );
      }
    }
  }
  if (!resume) {
    await render("student-current");
    await verifyRelease("student");
    await Deno.writeTextFile(
      join(evidence, "print-guards.log"),
      await command(quarto, [
        "run",
        join(repo, "tests/probes/resource-print-guards.ts"),
        "--consumer",
        consumer,
      ], consumer),
    );
  }
  if (!Deno.args.includes("--smoke")) {
    const protectedFull = resume
      ? await treeHashes(join(consumer, "_site-full"))
      : {};
    let expectedFull = protectedFull;
    if (!resume) {
      await render("full-current", "full");
      await verifyRelease("full");
      expectedFull = await treeHashes(join(consumer, "_site-full"));
      await selection({ print: false });
      await render("removed-print-target");
      await verifyRelease("student", false);
      originalRoot = await Deno.readTextFile(rootConfig);
      await Deno.writeTextFile(
        rootConfig,
        originalRoot.replace(
          "- ./assets/**",
          "- ./assets/**\n    - ./_probe/body/**",
        ),
      );
      const serviceFailure = await render(
        "service-native-selection",
        "student",
        "SERVICE_RESOURCE_SELECTION",
      );
      assert(
        !serviceFailure.includes("Публикация: сборка"),
        "service selection reached owner execution",
      );
      await Deno.writeTextFile(rootConfig, originalRoot);
    }
    if (!arg("--from") || arg("--from") === "closed-native-selection") {
      await Deno.writeTextFile(
        tasksConfig,
        baseTasks.replace(
          '"!materials/instructor/**"',
          "./materials/instructor/README.txt",
        ),
      );
      const closedFailure = await render(
        "closed-native-selection",
        "student",
        "RESOURCE.POLICY_DENIED",
      );
      assert(
        !closedFailure.includes("Публикация: сборка"),
        "closed selection reached owner execution",
      );
      await Deno.writeTextFile(tasksConfig, baseTasks);
    }
    let reached = !arg("--from") || arg("--from") === "closed-native-selection";
    for (
      const failure of [
        "late-link",
        "source-mutation",
        "config-mutation",
        "session-mutation",
        "missing-observation",
        "renamed-private-zip",
        "renamed-service-zip",
        "renamed-runtime-plain",
        "renamed-runtime-zip",
        "print-pdf-collision",
        "print-resource-collision",
        "renamed-core-transport",
      ]
    ) {
      if (failure === arg("--from")) reached = true;
      if (!reached) continue;
      const faultConfig = [
          "source-mutation",
          "config-mutation",
          "session-mutation",
          "missing-observation",
        ].includes(failure)
        ? originalRoot.replace(
          "    - _probe/resources/owner.ts",
          "    - _probe/owner-fault.ts\n    - _probe/resources/owner.ts",
        )
        : [
            "renamed-private-zip",
            "renamed-service-zip",
            "renamed-runtime-plain",
            "renamed-runtime-zip",
            "renamed-core-transport",
          ].includes(failure)
        ? originalRoot.replace(
          "    - _probe/resources/verify.ts",
          "    - _probe/zip-fault.ts\n    - _probe/resources/verify.ts",
        )
        : originalRoot;
      await Deno.writeTextFile(rootConfig, faultConfig);
      await selection({ print: true, fail: failure });
      const collision = failure === "print-pdf-collision"
        ? "handout.pdf"
        : failure === "print-resource-collision"
        ? "resources/artifact-course/data.txt"
        : undefined;
      const collisionPath = collision
        ? join(consumer, "tasks/materials/student", collision)
        : undefined;
      if (collisionPath) {
        assert(
          !await exists(collisionPath),
          "collision setup path already exists",
        );
        await Deno.mkdir(dirname(collisionPath), { recursive: true });
        await Deno.writeTextFile(
          collisionPath,
          "PUBLIC_PRINT_TARGET_COLLISION\n",
        );
      }
      try {
        await render(
          failure,
          "student",
          ({
            "late-link": "RESOURCE.POLICY_DENIED",
            "source-mutation": "SOURCE.FROZEN_INPUT_CHANGED",
            "config-mutation": "SOURCE.PROFILE_VIEW_MISMATCH",
            "session-mutation": "SOURCE.INVALID_ATTEMPT",
            "missing-observation": "SOURCE.RECONCILIATION_MISSING",
            "renamed-private-zip": "DENIED_ZIP_RESOURCE",
            "renamed-service-zip": "SERVICE_ZIP_RESOURCE",
            "renamed-runtime-plain": "DENIED_DELIVERY_RESOURCE",
            "renamed-runtime-zip": "DENIED_ZIP_RESOURCE",
            "print-pdf-collision": "PRINT_TARGET_COLLISION",
            "print-resource-collision": "PRINT_TARGET_COLLISION",
            "renamed-core-transport": "SERVICE_DELIVERY_RESOURCE",
          } as Record<string, string>)[failure],
        );
      } finally {
        if (collisionPath) await Deno.remove(collisionPath);
      }
    }
    await Deno.writeTextFile(rootConfig, originalRoot);
    assert(
      JSON.stringify(expectedFull) ===
        JSON.stringify(await treeHashes(join(consumer, "_site-full"))),
      "student failure altered other profile",
    );
    await selection({ print: true });
    await render("restored-print-target");
    await verifyRelease("student");
    if (reviewOnly) {
      await Deno.writeTextFile(
        join(evidence, "print-guards.log"),
        await command(quarto, [
          "run",
          join(repo, "tests/probes/resource-print-guards.ts"),
          "--consumer",
          consumer,
        ], consumer),
      );
    }
    if (!reviewOnly) {
      await Deno.remove(
        join(consumer, "_site-student/tasks/handouts/current.pdf"),
      );
      await render("deleted-current-pdf");
      await verifyRelease("student");
    }
  }
  await Deno.writeTextFile(
    join(evidence, "results.json"),
    JSON.stringify(
      {
        consumer,
        resumedFrom: resume ? resolve(arg("--prior-evidence")!) : null,
        results,
        status: "installed-production-resources-passed",
        boundaries: [
          "bounded HTML student/full owner contract",
          "experimental snapshot-local native Pandoc/CUE Print body producer, no production owner pedagogical package",
          "opaque dependencies/unknown archive carriers/A9/preview/transient portal output remain gates",
        ],
      },
      null,
      2,
    ),
  );
  console.log(`PASS installed resources: ${evidence}`);
} finally {
  await Deno.remove(preparation, { recursive: true });
  if (Deno.args.includes("--keep")) {
    console.log(`Consumer retained: ${consumer}`);
  } else await Deno.remove(consumer, { recursive: true });
}
