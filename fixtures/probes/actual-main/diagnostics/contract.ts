// Closed request fields, finite source registry and actual notification geometry.
import { join } from "stdlib/path";
import { assert } from "../common.ts";
import {
  absoluteLiteral,
  literalRelative,
  pathInside,
  safeDirectory,
} from "./files.ts";

export interface FailureDiagnosticsRequest {
  protocol: 1;
  label: string;
  phase: string;
  profile: "student" | "full";
  root: string;
  sink: string;
  forbiddenRoots: string[];
  members: { namespace: string; path: string; mount: string; format: string }[];
  sourceInputs: Record<"student" | "full", Record<"book" | "essay", string[]>>;
  selectedHashes: Record<string, string>;
  // Optional for legacy callers; current Source supplies its authenticated selection.
  sourceSelection?: { configPaths: string[]; adapterPaths: string[] };
  run: Record<string, string | number | boolean | null>;
  anchors: {
    installManifestSha256: string;
    inspectSha256: Record<string, string>;
    template: { commit: string; tree: string };
    providers: { name: string; commit: string; tree: string }[];
    packages: { name: string; archiveSha256: string; fileMapSha256: string }[];
    installationsSha256: string;
    coreModuleSha256: Record<string, string>;
  };
}
export interface ArmedFailureDiagnostics {
  requestPath: string;
  requestSha256: string;
  directory: string;
}
export interface FailureRetentionTestHooks {
  afterRead?(
    candidate: { sourcePath: string; destinationPath: string; ordinal: number },
    bytes: Uint8Array,
  ): Promise<void>;
}

export const failureProfiles = ["student", "full"] as const;
export const attemptPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const sha256Pattern = /^[a-f0-9]{64}$/;
const sha1Pattern = /^[a-f0-9]{40}$/;
function closed(value: any, keys: string[], label: string) {
  assert(
    value && typeof value === "object" && !Array.isArray(value) &&
      Object.keys(value).every((key) => keys.includes(key)),
    `invalid ${label}`,
  );
}

function hashMap(value: any, label: string) {
  assert(
    value && typeof value === "object" && !Array.isArray(value) &&
      Object.values(value).every((hash) =>
        typeof hash === "string" &&
        sha256Pattern.test(hash)
      ),
    `invalid ${label}`,
  );
}
export function validateRequest(request: FailureDiagnosticsRequest) {
  closed(request, [
    "protocol",
    "label",
    "phase",
    "profile",
    "root",
    "sink",
    "forbiddenRoots",
    "members",
    "sourceInputs",
    "selectedHashes",
    "sourceSelection",
    "run",
    "anchors",
  ], "diagnostic request");
  assert(
    request.protocol === 1 && typeof request.label === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(request.label) &&
      ["releases", "student-release", "full-release", "late"].includes(
        request.phase,
      ) &&
      failureProfiles.includes(request.profile),
    "invalid diagnostic runner",
  );
  assert(
    absoluteLiteral(request.root) && absoluteLiteral(request.sink) &&
      Array.isArray(request.forbiddenRoots) &&
      request.forbiddenRoots.every(absoluteLiteral),
    "invalid diagnostic roots",
  );
  for (const root of [request.root, ...request.forbiddenRoots]) {
    assert(
      !pathInside(root, request.sink) && !pathInside(request.sink, root),
      "diagnostic sink aliases protected root",
    );
  }
  assert(
    Array.isArray(request.members) && request.members.length === 5 &&
      new Set(request.members.map((m) => m.namespace)).size === 5,
    "invalid diagnostic member registry",
  );
  for (const member of request.members) {
    closed(
      member,
      ["namespace", "path", "mount", "format"],
      "diagnostic member",
    );
    assert(
      typeof member.namespace === "string" &&
        /^[A-Za-z_][A-Za-z0-9_-]*$/.test(member.namespace) &&
        literalRelative(member.path) && literalRelative(member.mount) &&
        ["html", "pdf", "revealjs"].includes(member.format),
      "invalid diagnostic member",
    );
  }
  closed(
    request.sourceInputs,
    ["student", "full"],
    "diagnostic source registry",
  );
  for (const profile of failureProfiles) {
    closed(
      request.sourceInputs[profile],
      ["book", "essay"],
      "diagnostic source registry",
    );
    for (const name of ["book", "essay"] as const) {
      const member = request.members.find((m) => m.namespace === name);
      const inputs = request.sourceInputs[profile][name];
      assert(
        member?.path === name && member.format === "html" &&
          Array.isArray(inputs) &&
          inputs.length === (name === "book" ? 4 : 5) &&
          new Set(inputs).size === inputs.length &&
          inputs.every((path) =>
            literalRelative(path) &&
            path.startsWith(name + "/") && path.endsWith(".qmd")
          ),
        "invalid diagnostic finite source registry",
      );
    }
  }
  hashMap(request.selectedHashes, "selected source hashes");
  assert(
    Object.keys(request.selectedHashes).every(literalRelative),
    "invalid selected source hash paths",
  );
  if (request.sourceSelection !== undefined) {
    const selection = request.sourceSelection;
    closed(
      selection,
      ["configPaths", "adapterPaths"],
      "diagnostic Source selection",
    );
    for (const [kind, paths] of Object.entries(selection)) {
      assert(
        Array.isArray(paths) && paths.length > 0 &&
          new Set(paths).size === paths.length && paths.every((path) =>
            literalRelative(path) && (kind === "configPaths"
              ? /(^|\/)\_quarto[^/]*\.ya?ml$/.test(path)
              : path.startsWith("_publication/") && path.endsWith(".ts"))
          ),
        "invalid diagnostic Source selection paths",
      );
    }
    assert(
      Array.isArray(selection.configPaths) &&
        Array.isArray(selection.adapterPaths),
      "incomplete diagnostic Source selection",
    );
    const selected = [
      ...selection.configPaths,
      "index.qmd",
      ...new Set(
        failureProfiles.flatMap((profile) =>
          ["book", "essay"].flatMap((name) =>
            request.sourceInputs[profile][name as "book" | "essay"]
          )
        ),
      ),
      ...selection.adapterPaths,
    ];
    assert(
      new Set(selected).size === selected.length &&
        JSON.stringify(Object.keys(request.selectedHashes).sort()) ===
          JSON.stringify(selected.sort()),
      "diagnostic selected hashes differ from authenticated Source selection",
    );
  } else {
    assert(
      Object.keys(request.selectedHashes).length <= 53,
      "invalid selected source hash paths",
    );
  }
  assert(
    request.run && typeof request.run === "object" &&
      !Array.isArray(request.run) &&
      Object.values(request.run).every((value) =>
        value === null || typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))
      ),
    "invalid diagnostic run",
  );
  const a = request.anchors;
  closed(a, [
    "installManifestSha256",
    "inspectSha256",
    "template",
    "providers",
    "packages",
    "installationsSha256",
    "coreModuleSha256",
  ], "diagnostic anchors");
  assert(
    sha256Pattern.test(a.installManifestSha256) &&
      sha256Pattern.test(a.installationsSha256),
    "invalid manifest hash anchors",
  );
  hashMap(a.inspectSha256, "inspect hash anchors");
  hashMap(a.coreModuleSha256, "Core module hash anchors");
  closed(a.template, ["commit", "tree"], "Template anchor");
  assert(
    sha1Pattern.test(a.template.commit) && sha1Pattern.test(a.template.tree),
    "invalid Template anchor",
  );
  assert(
    Array.isArray(a.providers) && a.providers.length === 4 &&
      new Set(a.providers.map((p) => p.name)).size === 4,
    "invalid provider anchors",
  );
  for (const p of a.providers) {
    closed(p, ["name", "commit", "tree"], "provider anchor");
    assert(
      ["publisher", "qrc", "core", "download"].includes(p.name) &&
        sha1Pattern.test(p.commit) && sha1Pattern.test(p.tree),
      "invalid provider anchor",
    );
  }
  assert(
    Array.isArray(a.packages) && a.packages.length === 6 &&
      new Set(a.packages.map((p) => p.name)).size === 6,
    "invalid package anchors",
  );
  for (const p of a.packages) {
    closed(p, ["name", "archiveSha256", "fileMapSha256"], "package anchor");
    assert(
      [
        "project-publish",
        "reference-catalog",
        "course-core",
        "course-presentation",
        "course-navigation",
        "project-download",
      ].includes(p.name) &&
        sha256Pattern.test(p.archiveSha256) &&
        sha256Pattern.test(p.fileMapSha256),
      "invalid package anchor",
    );
  }
}

export async function validateContext(
  ctx: any,
  request: FailureDiagnosticsRequest,
) {
  assert(
    ctx && ctx.root === request.root && attemptPattern.test(ctx.attemptId) &&
      ctx.sourceRoot ===
        join(
          request.root,
          ".project-publish",
          "builds",
          ctx.attemptId,
          "sources",
        ) &&
      JSON.stringify(ctx.profiles) === JSON.stringify([request.profile]),
    "diagnostic context root/attempt/source/profile mismatch",
  );
  await safeDirectory(ctx.sourceRoot);
  const members = request.members.map((m) => ({
    ...m,
    path: join(ctx.sourceRoot, m.path),
  }));
  assert(
    Array.isArray(ctx.members) && ctx.members.length === members.length &&
      ctx.members.every((actual: any, index: number) => {
        closed(
          actual,
          ["namespace", "path", "mount", "format"],
          "diagnostic context member",
        );
        return ["namespace", "path", "mount", "format"].every((key) =>
          actual[key] === (members[index] as any)[key]
        );
      }),
    "diagnostic member context mismatch",
  );
  const portal = ctx.portal;
  closed(portal, [
    "input",
    "output",
    "renderProfiles",
    "control",
    "controlHash",
    "configHashes",
  ], "diagnostic portal");
  assert(
    portal.input === join(ctx.sourceRoot, "index.qmd") &&
      portal.output ===
        join(
          request.root,
          ".project-publish",
          "builds",
          ctx.attemptId,
          "portal",
        ) &&
      portal.control === join(ctx.sourceRoot, "_quarto-publish-portal.yml") &&
      sha256Pattern.test(portal.controlHash) &&
      Array.isArray(portal.renderProfiles) &&
      portal.renderProfiles.includes(request.profile) &&
      portal.renderProfiles.every((p: unknown) =>
        typeof p === "string" &&
        /^[A-Za-z0-9_-]+$/.test(p)
      ),
    "diagnostic portal context mismatch",
  );
  hashMap(portal.configHashes, "portal config hash provenance");
  closed(ctx.failure, ["phase", "operation", "error"], "diagnostic failure");
  closed(ctx.failure.error, ["name", "message"], "diagnostic failure error");
  assert(
    ["preparation", "render", "publication"].includes(ctx.failure.phase) &&
      [
        "before-render",
        "metadata",
        "portal-render",
        "member-render",
        "save-state",
        "preview",
        "workspace",
        "stage",
        "finalize",
        "commit",
      ].includes(ctx.failure.operation) &&
      typeof ctx.failure.error.name === "string" &&
      typeof ctx.failure.error.message === "string",
    "diagnostic failure descriptor mismatch",
  );
  if (ctx.namespace !== undefined) {
    assert(
      request.members.some((m) => m.namespace === ctx.namespace),
      "diagnostic namespace mismatch",
    );
  }
  if (ctx.format !== undefined) {
    assert(
      ["html", "pdf", "revealjs"].includes(ctx.format),
      "diagnostic format mismatch",
    );
  }
  for (const path of [portal.output, ctx.output, ctx.stage]) {
    if (path === undefined) continue;
    assert(
      absoluteLiteral(path) && !pathInside(path, request.sink) &&
        !pathInside(request.sink, path),
      "diagnostic sink aliases output/stage",
    );
  }
  return {
    root: ctx.root,
    sourceRoot: ctx.sourceRoot,
    profiles: [...ctx.profiles],
    members,
    portal: structuredClone(portal),
    failure: structuredClone(ctx.failure),
    ...(ctx.namespace === undefined ? {} : { namespace: ctx.namespace }),
    ...(ctx.format === undefined ? {} : { format: ctx.format }),
    ...(ctx.output === undefined ? {} : { output: ctx.output }),
    ...(ctx.stage === undefined ? {} : { stage: ctx.stage }),
  };
}
