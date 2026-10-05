// Synthetic file factory and independent 228-candidate oracle; no tests execute on import.
import { dirname, join } from "stdlib/path";
import { assert, hash } from "../probes/actual-main-evidence.ts";
import {
  armFailureDiagnostics,
  type FailureDiagnosticsRequest,
} from "../../fixtures/probes/actual-main/state.ts";
import {
  ACTUAL_MAIN_INPUTS,
  ACTUAL_MAIN_MEMBERS,
} from "../probes/actual-main-contract.ts";
const digest = async (text: string, algorithm = "SHA-1") =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest(algorithm, new TextEncoder().encode(text)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0")).join("");
export const regularExists = async (path: string) => {
  try {
    return (await Deno.lstat(path)).isFile;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
};
export async function write(path: string, bytes: Uint8Array | string) {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeFile(
    path,
    typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes,
  );
}
type Candidate = {
  sourcePath: string;
  scope: string;
  profile: string;
  sourceRelative: string;
};
async function inventory(sourceRoot: string, profile: "student" | "full") {
  const tuples = [{
    root: sourceRoot,
    scope: "root",
    profile,
    sourceRelative: "index.qmd",
  }];
  for (const selected of ["student", "full"] as const) {
    for (const member of ["book", "essay"] as const) {
      for (const source of ACTUAL_MAIN_INPUTS[member]) {
        tuples.push({
          root: join(sourceRoot, member),
          scope: member,
          profile: selected,
          sourceRelative: source.slice(member.length + 1),
        });
      }
    }
  }
  const candidates: Candidate[] = [];
  for (const tuple of tuples) {
    const h = await digest(tuple.sourceRelative),
      k = await digest(`${tuple.profile}:${tuple.sourceRelative}`);
    const paths: string[] = [];
    for (const phase of ["capture", "identity", "render"]) {
      paths.push(
        `.course-owner/native-listing/input/${phase}/${tuple.profile}/${h}.md`,
      );
      paths.push(
        `.course-owner/native-listing/witness/${phase}/${tuple.profile}/${h}.json`,
      );
      paths.push(`.course-owner/${phase}/${tuple.profile}/${h}.json`);
    }
    paths.push(`.course-owner/reader-input/${tuple.profile}/${h}.md`);
    paths.push(
      `.course-owner/capture-${k}.log`,
      `.course-owner/identity-${k}.log`,
    );
    for (const path of paths) {
      candidates.push({
        sourcePath: join(tuple.root, path),
        scope: tuple.scope,
        profile: tuple.profile,
        sourceRelative: tuple.sourceRelative,
      });
    }
  }
  assert(
    tuples.length === 19 && candidates.length === 228,
    "PURE independent finite oracle geometry",
  );
  return candidates;
}
let fixtureId = 0;
export async function fixture(
  retentionRoot: string,
  profile: "student" | "full" = "student",
  complete = false,
) {
  const base = join(retentionRoot, `case-${++fixtureId}`),
    project = join(base, "project"),
    attemptId = `00000000-0000-4000-8000-${
      String(fixtureId).padStart(12, "0")
    }`,
    sourceRoot = join(project, ".project-publish/builds", attemptId, "sources");
  await Deno.mkdir(sourceRoot, { recursive: true });
  const selectedHashes: Record<string, string> = {};
  for (
    const path of [
      "index.qmd",
      "_quarto.yml",
      "_quarto-publish-portal.yml",
      ...ACTUAL_MAIN_INPUTS.book,
      ...ACTUAL_MAIN_INPUTS.essay,
    ]
  ) {
    await write(
      join(sourceRoot, path),
      `authored synthetic reference ${path}\n`,
    );
    selectedHashes[path] = await hash(join(sourceRoot, path));
  }
  for (const member of ACTUAL_MAIN_MEMBERS) {
    await Deno.mkdir(join(sourceRoot, member.path), { recursive: true });
  }
  const candidates = await inventory(sourceRoot, profile),
    content = new Map<string, Uint8Array>();
  for (const [i, candidate] of candidates.entries()) {
    if (complete || [0, 1, 10, 12, 43, 90, 144, 226].includes(i)) {
      // Deliberately opaque, noncanonical bytes: never parse or reserialize witnesses.
      const bytes = new TextEncoder().encode(
        `  { "nativeShape" : [ {"opaque":${i}} ], "diagnostic":"${candidate.profile}" } \n\n`,
      );
      await write(candidate.sourcePath, bytes);
      content.set(candidate.sourcePath, bytes);
    }
  }
  for (
    const path of [
      ".course-owner/session.json",
      ".course-owner/preparation.json",
      ".course-owner/active.json",
      ".course-owner/finished.json",
      ".course-owner/index.json",
      ".course-owner/private-publication-addresses.json",
      ".course-owner/native-listing/unknown.json",
      ".project-publish/actual-main-adapter.json",
    ]
  ) {
    await write(
      join(sourceRoot, path),
      "PRIVATE AUTHORITY MUST NOT BE COPIED\n",
    );
  }
  const request: Omit<FailureDiagnosticsRequest, "protocol" | "sink"> = {
    label: profile === "student" ? "actual-main-student" : "actual-main-full",
    phase: `${profile}-release`,
    profile,
    root: project,
    forbiddenRoots: [project],
    members: ACTUAL_MAIN_MEMBERS.map((m) => ({ ...m })),
    sourceInputs: {
      student: {
        book: [...ACTUAL_MAIN_INPUTS.book],
        essay: [...ACTUAL_MAIN_INPUTS.essay],
      },
      full: {
        book: [...ACTUAL_MAIN_INPUTS.book],
        essay: [...ACTUAL_MAIN_INPUTS.essay],
      },
    },
    selectedHashes,
    run: {
      repository: "PURE/template",
      runId: "pure-file-fixture",
      runAttempt: "1",
    },
    anchors: {
      installManifestSha256: "1".repeat(64),
      inspectSha256: {
        "book-student": "2".repeat(64),
        "book-full": "3".repeat(64),
        "essay-student": "4".repeat(64),
        "essay-full": "5".repeat(64),
      },
      template: { commit: "6".repeat(40), tree: "7".repeat(40) },
      providers: ["publisher", "qrc", "core", "download"].map((name) => ({
        name,
        commit: "8".repeat(40),
        tree: "9".repeat(40),
      })),
      packages: [
        "course-core",
        "course-navigation",
        "course-presentation",
        "project-publish",
        "project-download",
        "reference-catalog",
      ].map((name) => ({
        name,
        archiveSha256: "a".repeat(64),
        fileMapSha256: "b".repeat(64),
      })),
      installationsSha256: "c".repeat(64),
      coreModuleSha256: { "owner-preflight/owner.ts": "d".repeat(64) },
    },
  };
  const ctx: any = {
    root: project,
    sourceRoot,
    attemptId,
    profiles: [profile],
    config: { project: { type: "website" } },
    members: ACTUAL_MAIN_MEMBERS.map((m) => ({
      ...m,
      path: join(sourceRoot, m.path),
    })),
    portal: {
      input: join(sourceRoot, "index.qmd"),
      output: join(project, ".project-publish/builds", attemptId, "portal"),
      renderProfiles: [profile, "publish-portal"],
      control: join(sourceRoot, "_quarto-publish-portal.yml"),
      controlHash: selectedHashes["_quarto-publish-portal.yml"],
      configHashes: {
        [join(sourceRoot, "_quarto.yml")]: selectedHashes["_quarto.yml"],
        [join(sourceRoot, "_quarto-publish-portal.yml")]:
          selectedHashes["_quarto-publish-portal.yml"],
      },
    },
    failure: {
      phase: "preparation",
      operation: "before-render",
      error: { name: "Error", message: "PURE original preparation refusal" },
    },
  };
  const directory = join(base, "diagnostics"),
    armed = await armFailureDiagnostics(request, directory);
  return {
    base,
    project,
    sourceRoot,
    attemptId,
    candidates,
    content,
    request,
    ctx,
    armed,
    directory,
  };
}
