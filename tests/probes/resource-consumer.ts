// One installed native owner; checked production body and resources before Print/ZIP.
import { copy } from "stdlib/fs";
import { dirname, fromFileUrl, join, relative, resolve } from "stdlib/path";
import { bodySources, corpus, work } from "./resource-body-fixture.ts";
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
const nativeFailures = [
  "late-link",
  "source-mutation",
  "config-mutation",
  "session-mutation",
  "missing-observation",
  "body-integrity-batch",
  "renamed-private-zip",
  "renamed-service-zip",
  "renamed-runtime-plain",
  "renamed-runtime-zip",
  "print-pdf-collision",
  "print-resource-collision",
  "renamed-core-transport",
];
const allCases = [
  "full-computed-without-student-proof",
  "full-authored-static",
  "full-generated-preserves-static-release",
  "edited-current-body",
  "removed-print-target",
  "service-native-selection",
  "closed-native-selection",
  ...nativeFailures,
  "restored-print-target",
  "deleted-current-pdf",
];
const phases: Record<string, string[]> = {
  current: [
    "full-computed-without-student-proof",
    "full-authored-static",
    "full-generated-preserves-static-release",
    "edited-current-body",
  ],
  lifecycle: [
    "removed-print-target",
    "restored-print-target",
    "deleted-current-pdf",
  ],
  owner: [
    "service-native-selection",
    "closed-native-selection",
    "late-link",
    "source-mutation",
    "config-mutation",
    "session-mutation",
    "missing-observation",
  ],
  body: ["body-integrity-batch"],
  delivery: [
    "renamed-private-zip",
    "renamed-service-zip",
    "renamed-runtime-plain",
    "renamed-runtime-zip",
    "print-pdf-collision",
    "print-resource-collision",
    "renamed-core-transport",
  ],
};
const partition = Object.values(phases).flat();
assert(
  new Set(partition).size === partition.length &&
    JSON.stringify([...partition].sort()) ===
      JSON.stringify([...allCases].sort()),
  "required CI phases must cover every case exactly once",
);
const phase = arg("--phase") || "all";
assert(
  phase === "all" || Object.hasOwn(phases, phase),
  "unknown required resource phase",
);
const plannedCases = phase === "all" ? allCases : phases[phase],
  selectedCases = new Set(plannedCases);
const wants = (label: string) => selectedCases.has(label);
const phaseBudget = Object.fromEntries(
  Object.entries(phases).map(([name, cases]) => {
    const nativeBuilds = cases.length + 1,
      additionalCurrentCalls = name === "body" ? 28 : 0;
    return [name, {
      nativeBuilds,
      additionalCurrentCalls,
      setupMinutes: 20,
      nativeBuildMinutes: 15,
      additionalCurrentCallMinutes: 3,
      remainingChecksMinutes: 5,
      allowanceMinutes: 25 + nativeBuilds * 15 + additionalCurrentCalls * 3,
    }];
  }),
);
assert(
  !Deno.args.includes("--navigation") &&
    !Deno.args.includes("--navigation-ref"),
  "current Navigation is supplied by --core/--core-ref; independent Navigation is unsupported",
);
const providers = Object.fromEntries(
  ["core", "publisher", "qrc", "download", "print"].map(
    (name) => {
      const path = arg(`--${name}`);
      assert(path, `--${name} required`);
      return [name, resolve(path)];
    },
  ),
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
const manifest: unknown[] = [],
  results: Record<string, unknown>[] = [],
  initialization: unknown[] = [];
let bodyIntegrityCases: Record<string, string>[] = [];
let generatedLocatorEvidence: Record<string, unknown>[] = [];
const providerPins = new Map<string, { commit: string; tree: string }>();
async function toolVersion(args: string[]) {
  const result = await new Deno.Command(quarto, {
    args,
    cwd: consumer,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(result.success, `version command failed: ${args.join(" ")}`);
  return (new TextDecoder().decode(result.stdout) +
    new TextDecoder().decode(result.stderr)).trim();
}
async function install(
  name: string,
  repository: string,
  subpath: string,
  provider: string,
) {
  let pin = providerPins.get(provider);
  if (!pin) {
    const revision = arg(`--${provider}-ref`) || "HEAD";
    const commit =
      (await command("git", ["rev-parse", `${revision}^{commit}`], repository))
        .trim();
    pin = {
      commit,
      tree:
        (await command("git", ["rev-parse", `${commit}^{tree}`], repository))
          .trim(),
    };
    providerPins.set(provider, pin);
  }
  const sourceArchive = join(preparation, `${name}-source.tar.gz`),
    snapshot = join(preparation, `${name}-source`);
  await Deno.mkdir(snapshot, { recursive: true });
  await command("git", [
    "archive",
    "--format=tar.gz",
    `--output=${sourceArchive}`,
    pin.commit,
    subpath,
  ], repository);
  await command("tar", ["-xzf", sourceArchive, "-C", snapshot], preparation);
  const source = join(snapshot, subpath);
  const tarRoot = join(preparation, name),
    archive = join(preparation, `${name}.tar.gz`);
  await copy(source, join(tarRoot, "_extensions", name));
  await command("tar", ["-czf", archive, "-C", tarRoot, "."], preparation);
  const archiveDirectory = join(evidence, "provider-archives");
  await Deno.mkdir(archiveDirectory, { recursive: true });
  await Deno.copyFile(
    sourceArchive,
    join(archiveDirectory, `${name}-source.tar.gz`),
  );
  await Deno.copyFile(archive, join(archiveDirectory, `${name}.tar.gz`));
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
  manifest.push({
    name,
    provider,
    ...pin,
    sourceArchive: `provider-archives/${name}-source.tar.gz`,
    archive: `provider-archives/${name}.tar.gz`,
    sourceArchiveSha256: await hash(sourceArchive),
    archiveSha256: await hash(archive),
    files: entries,
  });
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
  assert(
    label === "student-current" || wants(label),
    `unplanned native case ${label}`,
  );
  const cache = join(evidence, `cache-${label}`);
  assert(!await exists(cache), `fresh cache ${label}`);
  const start = performance.now();
  const publicationMaps = async () =>
    Object.fromEntries(
      await Promise.all(["student", "full"].map(async (view) => {
        const root = join(consumer, `_site-${view}`);
        return [view, await exists(root) ? await treeHashes(root) : null];
      })),
    );
  const before = await publicationMaps(),
    beforePath = join(evidence, `${label}-publication-before.json`),
    afterPath = join(evidence, `${label}-publication-after.json`);
  await Deno.writeTextFile(beforePath, JSON.stringify(before, null, 2));
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
  const after = await publicationMaps();
  await Deno.writeTextFile(afterPath, JSON.stringify(after, null, 2));
  const observation: Record<string, unknown> = {
    label,
    profile,
    expectedFailure: failure ?? null,
    exit: r.code,
    milliseconds: Math.round(performance.now() - start),
    publication: {
      before: {
        path: beforePath,
        sha256: await hash(beforePath),
        maps: before,
      },
      after: { path: afterPath, sha256: await hash(afterPath), maps: after },
    },
    status: "observed",
  };
  results.push(observation);
  const saveObserved = () =>
    Deno.writeTextFile(
      join(evidence, "partial-results.json"),
      JSON.stringify({ consumer, results }, null, 2),
    );
  // Preserve both complete maps before any command/code/retention assertion.
  await saveObserved();
  try {
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
        JSON.stringify(before) === JSON.stringify(after),
        `${label}: prior complete student/full artifacts changed`,
      );
    }
    observation.status = "passed";
  } catch (error) {
    observation.status = "failed";
    observation.error = String(error);
    throw error;
  } finally {
    await saveObserved();
  }
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
async function verifyRelease(
  profile: string,
  withPrint = true,
  computed = true,
  marker = "COMPUTED_CURRENT_OWNER_BODY",
) {
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
  for (const path of ["index.qmd", "_intro.qmd", ...bodySources]) {
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
  if (computed) {
    assert(
      owner.index.files.some((f: any) => f.origin === "generated"),
      "native generated image evidence",
    );
  }
  assert(owner.engineRuns === (computed ? 1 : 0), "owner engine count");
  assert(
    owner.body.schema === "course-body-handle-v1" &&
      JSON.stringify(owner.body.questions) ===
        JSON.stringify(["p0-tasks/exr-body", "p0-tasks/exr-choice"]) &&
      JSON.stringify(owner.body.works) ===
        JSON.stringify(["p0-tasks/sec-body-one", "p0-tasks/sec-body-two"]),
    "current canonical owner body identities",
  );
  assert(
    owner.body.workItems.every((w: any) =>
      JSON.stringify(w.items) === JSON.stringify(owner.body.questions)
    ),
    "fixed works must share canonical questions exactly once",
  );
  for (const name of ["work-one", "work-two"]) {
    const html = await Deno.readTextFile(join(output, `tasks/${name}.html`));
    assert(
      ["exr-body", "exr-choice"].every((id) =>
        html.includes(`href="corpus.html#${id}"`)
      ),
      `${name}: native book links must resolve to the shared corpus`,
    );
  }
  if (profile === "student") {
    const html = await Deno.readTextFile(join(output, "tasks/corpus.html"));
    assert(
      html.includes(computed ? marker : "STATIC_CURRENT_OWNER_BODY") &&
        html.includes("<table") && html.includes("HTTP") &&
        html.includes("TLS") && html.includes("FTP") &&
        !/TEACHER_SECRET|GRADING_SECRET|\bclass=["'][^"']*\bcorrect\b[^"']*["']/
          .test(html),
      "actual native public body/choice projection",
    );
  }
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
  const taskIndex = await Deno.readTextFile(join(output, "tasks/index.html"));
  assert(
    taskIndex.includes("PUBLIC_DEMONSTRATION_SOL"),
    "demonstration solution must remain public",
  );
  assert(
    taskIndex.includes("FULL_ONLY_DISCUSSION_SOL") === (profile === "full"),
    "ordinary discussion solution must be full-only",
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
      txt.includes("work-one") && txt.includes("HTTP") && txt.includes("TLS") &&
        txt.includes("FTP") &&
        txt.includes(computed ? marker : "STATIC_CURRENT_OWNER_BODY") &&
        txt.includes("42") &&
        !/TEACHER_SECRET|GRADING_SECRET/.test(txt),
      "Print public body",
    );
    assert(
      (await command("pdfinfo", ["-url", pdf], consumer)).includes(
        "https://example.org/current-owner-body",
      ),
      "authored public URL",
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
let baseTasks: string,
  originalRoot: string,
  priorStudentBodyHash: string | undefined,
  priorStudentPdfHash: string | undefined,
  printCollisionTarget: string | undefined;
try {
  if (!resume) {
    // Stock Quarto metadata is authored before any immutable owner snapshot.
    for (
      const project of [
        consumer,
        ...["theory", "tasks", "practice", "lectures", "handbook"].map((m) =>
          join(consumer, m)
        ),
      ]
    ) {
      const args = [
        "create-project",
        project,
        "--type",
        "default",
        "--no-scaffold",
        "--engine",
        "markdown",
      ];
      const stdout = await command(quarto, args, preparation);
      initialization.push({
        project,
        command: [quarto, ...args],
        exit: 0,
        stdout,
        metadataFiles: Object.fromEntries(
          await Promise.all(["_quarto.yml", ".gitignore"].map(async (path) => [
            path,
            await exists(join(project, path))
              ? await hash(join(project, path))
              : null,
          ])),
        ),
      });
    }
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
    const packages = [
      ["course-core", providers.core, "_extensions/course-core", "core"],
      [
        "course-presentation",
        providers.core,
        "_extensions/course-presentation",
        "core",
      ],
      [
        "course-navigation",
        providers.core,
        "_extensions/course-navigation",
        "core",
      ],
      [
        "project-download",
        providers.download,
        "_extensions/project-download",
        "download",
      ],
      [
        "reference-catalog",
        providers.qrc,
        "_extensions/reference-catalog",
        "qrc",
      ],
      [
        "project-publish",
        providers.publisher,
        "_extensions/project-publish",
        "publisher",
      ],
      ["course-print", providers.print, "_extensions/course-print", "print"],
    ];
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
    await Deno.writeTextFile(
      join(consumer, "_probe/body-fault.ts"),
      'export {bodyFault as default} from "./faults.ts";\n',
    );
    for (const [name, repository, subpath, provider] of packages) {
      await install(name, repository, subpath, provider);
    }
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
        const source = join(
            consumer,
            "_extensions/Afonenko-Course-Tools",
            name,
          ),
          installed = join(
            consumer,
            member,
            "_extensions/Afonenko-Course-Tools",
            name,
          );
        assert(
          JSON.stringify(await treeHashes(source)) ===
            JSON.stringify(await treeHashes(installed)),
          `${member}: exact installed ${name} copy`,
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
    // An authored file, not a proof: Core must bind these actual bytes independently.
    await Deno.writeFile(
      join(consumer, "tasks/assets/shared.png"),
      Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4/x8AAwAB//wl3FEAAAAASUVORK5CYII=",
        ),
        (c) => c.charCodeAt(0),
      ),
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
      ).replace("  output-dir: _site", "  output-dir: .project-publish/native")
        .replace("  render: [index.qmd]", "  render: []").replace(
          "project-publish:\n",
          "project-publish:\n  portal: index.qmd\n",
        ) +
        "    - _probe/resources/delivery.ts\n    - _probe/resources/verify.ts\n",
    );
    for (const profile of ["student", "full"]) {
      await Deno.writeTextFile(
        join(consumer, `_quarto-${profile}.yml`),
        `project-publish:\n  output-dir: _site-${profile}\n`,
      );
    }
    await Deno.remove(join(consumer, "tasks/labs"), { recursive: true });
    await Deno.remove(join(consumer, "tasks/plans"), { recursive: true });
    await Deno.writeTextFile(
      rootConfig,
      (await Deno.readTextFile(rootConfig)).replace(
        "[sec-tasks, sec-lab, sec-plan]",
        "[sec-tasks, sec-body-bank, sec-body-one, sec-body-two]",
      ),
    );
    baseTasks = (await Deno.readTextFile(tasksConfig)).replace(
      "  type: book",
      "  type: book\n  execute-dir: project",
    ).replace(
      "    - labs/01.qmd\n    - plans/01.qmd",
      "    - corpus.qmd\n    - work-one.qmd\n    - work-two.qmd",
    ).replace(
      "    - _extensions/Afonenko-Course-Tools/course-core/entrypoints/pre.ts\n",
      "    - _extensions/Afonenko-Course-Tools/course-core/entrypoints/pre.ts\n    - _extensions/Afonenko-Course-Tools/course-core/entrypoints/owner-freeze.ts\n",
    ).replace(
      '"!materials/**"',
      './materials/student/**, "!materials/instructor/**"',
    );
    await Deno.writeTextFile(tasksConfig, baseTasks);
    const permittedTask = (await Deno.readTextFile(taskInput)) + "\n" +
      await Deno.readTextFile(
        join(repo, "fixtures/probes/resources/solution-visibility.txt"),
      );
    await Deno.writeTextFile(taskInput, permittedTask);
    await Deno.writeTextFile(join(consumer, "tasks/corpus.qmd"), corpus(true));
    await Deno.writeTextFile(
      join(consumer, "tasks/work-one.qmd"),
      work("work-one", "sec-body-one", "lab"),
    );
    await Deno.writeTextFile(
      join(consumer, "tasks/work-two.qmd"),
      work("work-two", "sec-body-two", "test"),
    );
    await selection({ print: true });
    await Deno.writeTextFile(
      join(evidence, "install-manifest.json"),
      JSON.stringify(
        {
          method:
            "stock Quarto initialization before freeze; immutable git archives -> quarto add -> complete file/byte equality, including member copies",
          initialization,
          templateSource: {
            commit: (await command("git", ["rev-parse", "HEAD"], repo)).trim(),
            tree: (await command("git", ["rev-parse", "HEAD^{tree}"], repo))
              .trim(),
            worktreeStatus:
              (await command("git", ["status", "--porcelain"], repo))
                .trim(),
            driverSha256: await hash(fromFileUrl(import.meta.url)),
          },
          versions: {
            quarto: (await command(quarto, ["--version"], consumer)).trim(),
            pandoc:
              (await command(quarto, ["pandoc", "--version"], consumer)).split(
                "\n",
              )[0],
            typst: await toolVersion(["typst", "--version"]),
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
          companionSources: [...providerPins.entries()].map(([name, pin]) => ({
            name,
            ...pin,
          })),
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
    ({ originalRoot, baseTasks, printCollisionTarget } = JSON.parse(
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
    priorStudentBodyHash = (await latestEvents()).find((e) =>
      e.stage === "owner-index"
    ).body.publicHash;
    priorStudentPdfHash = await hash(
      join(consumer, "_site-student/tasks/handouts/current.pdf"),
    );
    const handouts = join(consumer, "_site-student/tasks/handouts"),
      selectedResource = (await files(handouts)).find((p) =>
        !p.endsWith("/current.pdf")
      );
    assert(selectedResource, "current Print resource target required");
    printCollisionTarget = relative(handouts, selectedResource);
    await Deno.writeTextFile(
      join(consumer, "_probe/test-setup.json"),
      JSON.stringify({ originalRoot, baseTasks, printCollisionTarget }),
    );
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
    const fullOutput = join(consumer, "_site-full");
    let expectedFull = await exists(fullOutput)
      ? await treeHashes(fullOutput)
      : null;
    if (!resume) {
      if (wants("full-computed-without-student-proof")) {
        await render(
          "full-computed-without-student-proof",
          "full",
          "BODY.RESOURCE_DENIED",
        );
      }
      if (wants("full-authored-static")) {
        await Deno.writeTextFile(
          join(consumer, "tasks/corpus.qmd"),
          corpus(false),
        );
        await render("full-authored-static", "full");
        await verifyRelease("full", true, false);
        expectedFull = await treeHashes(join(consumer, "_site-full"));
        await Deno.writeTextFile(
          join(consumer, "tasks/corpus.qmd"),
          corpus(true),
        );
      }
      if (wants("full-generated-preserves-static-release")) {
        await render(
          "full-generated-preserves-static-release",
          "full",
          "BODY.RESOURCE_DENIED",
        );
      }
      if (wants("edited-current-body")) {
        await Deno.writeTextFile(
          join(consumer, "tasks/corpus.qmd"),
          corpus(true, "EDITED_CURRENT_OWNER_BODY"),
        );
        await render("edited-current-body");
        await verifyRelease("student", true, true, "EDITED_CURRENT_OWNER_BODY");
        assert(
          (await latestEvents()).find((e) => e.stage === "owner-index").body
                .publicHash !== priorStudentBodyHash &&
            await hash(
                join(consumer, "_site-student/tasks/handouts/current.pdf"),
              ) !== priorStudentPdfHash,
          "body edit retained prior public projection",
        );
        await Deno.writeTextFile(
          join(consumer, "tasks/corpus.qmd"),
          corpus(true),
        );
      }
      if (wants("removed-print-target")) {
        await selection({ print: false });
        await render("removed-print-target");
        await verifyRelease("student", false);
      }
      if (wants("service-native-selection")) {
        originalRoot = await Deno.readTextFile(rootConfig);
        await Deno.writeTextFile(
          rootConfig,
          originalRoot.replace(
            "- ./assets/**",
            "- ./assets/**\n    - ./_probe/resources/owner.ts",
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
    }
    if (
      wants("closed-native-selection") &&
      (!arg("--from") || arg("--from") === "closed-native-selection")
    ) {
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
    for (const failure of nativeFailures) {
      if (!wants(failure)) continue;
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
        : failure.startsWith("body-")
        ? originalRoot.replace(
          "    - _probe/resources/delivery.ts",
          "    - _probe/body-fault.ts\n    - _probe/resources/delivery.ts",
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
        ? printCollisionTarget
        : undefined;
      const collisionPath = collision
        ? join(consumer, "tasks/materials/student", collision)
        : undefined;
      if (failure === "print-resource-collision") {
        assert(
          collisionPath,
          "current Print resource collision fixture missing",
        );
      }
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
            "body-integrity-batch": "RESOURCE.BYTES_CHANGED",
            "renamed-private-zip": "DENIED_ZIP_RESOURCE",
            "renamed-service-zip": "DENIED_ZIP_RESOURCE",
            "renamed-runtime-plain": "DENIED_DELIVERY_RESOURCE",
            "renamed-runtime-zip": "DENIED_ZIP_RESOURCE",
            "print-pdf-collision": "PRINT_TARGET_COLLISION",
            "print-resource-collision": "PRINT_TARGET_COLLISION",
            "renamed-core-transport": "SERVICE_DELIVERY_RESOURCE",
          } as Record<string, string>)[failure],
        );
        if (failure.startsWith("body-")) {
          const events = await latestEvents();
          bodyIntegrityCases = events.filter((e) =>
            e.stage === "body-integrity-checked"
          ).map((e) => ({ failure: e.failure, code: e.code }));
          generatedLocatorEvidence = events.filter((e) =>
            e.stage === "body-generated-locator"
          );
          results.at(-1)!.batchedCases = bodyIntegrityCases;
          results.at(-1)!.generatedLocatorEvidence = generatedLocatorEvidence;
          results.at(-1)!.bodyCurrentRefusals = events.filter((e) =>
            e.stage === "body-current-refusal"
          );
          results.at(-1)!.sourceMutationEvidence = events.filter((e) =>
            e.stage === "body-source-mutation-locator"
          );
          await Deno.writeTextFile(
            join(evidence, "partial-results.json"),
            JSON.stringify({ consumer, results }, null, 2),
          );
          try {
            assert(
              !events.some((e) =>
                ["print-ready", "package-start", "package-ready", "verified"]
                  .includes(e.stage)
              ),
              `${failure}: stale body reached delivery`,
            );
            assert(
              bodyIntegrityCases.length === 13 &&
                new Set(bodyIntegrityCases.map((e) => e.failure)).size === 13 &&
                generatedLocatorEvidence.length === 1 &&
                events.find((e) => e.stage === "owner-index").engineRuns === 1,
              "complete sequential body refusals/recovery after one native engine pass",
            );
          } catch (error) {
            results.at(-1)!.status = "failed";
            results.at(-1)!.error = String(error);
            await Deno.writeTextFile(
              join(evidence, "partial-results.json"),
              JSON.stringify({ consumer, results }, null, 2),
            );
            throw error;
          }
        }
      } finally {
        if (collisionPath) await Deno.remove(collisionPath);
      }
    }
    await Deno.writeTextFile(rootConfig, originalRoot);
    assert(
      JSON.stringify(expectedFull) ===
        JSON.stringify(
          await exists(fullOutput) ? await treeHashes(fullOutput) : null,
        ),
      "student failure altered other profile",
    );
    await selection({ print: true });
    if (wants("restored-print-target")) {
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
    }
    if (!reviewOnly && wants("deleted-current-pdf")) {
      await Deno.remove(
        join(consumer, "_site-student/tasks/handouts/current.pdf"),
      );
      await render("deleted-current-pdf");
      await verifyRelease("student");
    }
  }
  if (!Deno.args.includes("--smoke") && !resume && !arg("--from")) {
    const executed = results.filter((r) => r.label !== "student-current").map((
      r,
    ) => r.label);
    assert(
      JSON.stringify([...executed].sort()) ===
        JSON.stringify([...plannedCases].sort()),
      `required phase coverage ${phase}`,
    );
  }
  const installation = JSON.parse(
    await Deno.readTextFile(join(evidence, "install-manifest.json")),
  );
  await Deno.writeTextFile(
    join(evidence, "results.json"),
    JSON.stringify(
      {
        consumer,
        resumedFrom: resume ? resolve(arg("--prior-evidence")!) : null,
        results,
        phase,
        mode: Deno.args.includes("--smoke")
          ? "smoke"
          : resume || arg("--from")
          ? "focused"
          : phase === "all"
          ? "all"
          : "phase",
        plannedCases,
        requiredPhaseCoverage: phases,
        phaseAggregate: {
          expectedNonBaselineCases: plannedCases.length,
          completedNativeBuilds: results.length,
          budget: phase === "all" ? phaseBudget : phaseBudget[phase],
          templateSource: installation.templateSource,
          providers: installation.companionSources,
          installedFileMaps: installation.packages,
        },
        commonBaseline: "student-current",
        bodyIntegrity: {
          nativeBuilds: bodyIntegrityCases.length ? 1 : 0,
          sequentialMutationCases: bodyIntegrityCases.length,
          cases: bodyIntegrityCases,
          generatedLocatorEvidence,
          recovery: "exact bytes/handle then production current(ctx)",
          finalRefusal: "ordinary delivery before Print/ZIP/commit",
        },
        status: Deno.args.includes("--smoke")
          ? "installed-current-body-smoke-passed"
          : resume || arg("--from")
          ? "installed-current-body-focused-passed"
          : phase === "all"
          ? "installed-current-body-all-passed"
          : `installed-current-body-${phase}-passed`,
        boundaries: [
          "bounded HTML student/full owner contract",
          "current checked production body/resources for the same tasks owner; public projection only to Print",
          "full-only generated resources refuse without executed student proof; authored static full body remains supported",
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
