import { manifest } from "../../probes/actual-main-contract.ts";
import { expected, fixture, h } from "../../support/actual-main-fixture.ts";
import { check, expectRefusal } from "../../support/contract-cases.ts";
import { fromFileUrl, join, toFileUrl } from "stdlib/path";
import {
  checkoutSource,
  diagnosticSourceSelection,
  hash,
  installActualMainAdapter,
  treeHashes,
} from "../../probes/actual-main-evidence.ts";
import { fixture as retentionFixture } from "../../support/actual-main-retention-fixture.ts";
import { originalCourseFiles } from "../../probes/original-course-source.ts";
import { armFailureDiagnostics } from "../../../fixtures/probes/actual-main/state.ts";

// Independent required payload, including every relative runtime dependency.
const requiredFiles = [
  "prepare.ts",
  "finish.ts",
  "verify.ts",
  "state.ts",
  "verification.ts",
  "common.ts",
  "diagnostics/contract.ts",
  "diagnostics/files.ts",
  "diagnostics/reports.ts",
  "diagnostics/retention.ts",
];
function completePayload() {
  const current = structuredClone(expected);
  const value = fixture()[0].manifest;
  value.scaffolding = requiredFiles.map((path, i) => {
    const source = `fixtures/probes/actual-main/${path}`;
    current.template.files[source] = h(500 + i, 64);
    return { source, target: `_publication/${path}`, sha256: h(500 + i, 64) };
  });
  value.templateSource.files = structuredClone(current.template.files);
  return { current, value };
}
Deno.test("actual-main adapter: receipt authenticates every runtime leaf", () => {
  const { current, value } = completePayload();
  manifest(value, "releases", "1.10.18", current);
});
Deno.test("actual-main adapter: receipt refuses every missing, extra or changed runtime leaf", () => {
  const { current, value } = completePayload();
  for (let index = 0; index < requiredFiles.length; index++) {
    for (const mutation of ["missing", "changed", "target"] as const) {
      const candidate = structuredClone(value);
      if (mutation === "missing") candidate.scaffolding.splice(index, 1);
      if (mutation === "changed") {
        candidate.scaffolding[index].sha256 = h(900, 64);
      }
      if (mutation === "target") {
        candidate.scaffolding[index].target += ".extra";
      }
      expectRefusal(
        () => manifest(candidate, "releases", "1.10.18", current),
        "ACTUAL_MAIN_RECEIPT: missing, unsigned or config-mutating test adapter bytes",
        `${mutation} ${requiredFiles[index]} must refuse`,
      );
    }
  }
  const candidate = structuredClone(value);
  candidate.scaffolding.push({
    source: "extra.ts",
    target: "_publication/extra.ts",
    sha256: h(901, 64),
  });
  expectRefusal(
    () => manifest(candidate, "releases", "1.10.18", current),
    "ACTUAL_MAIN_RECEIPT: missing, unsigned or config-mutating test adapter bytes",
    "unregistered runtime leaf must refuse",
  );
});

const repo = fromFileUrl(new URL("../../../", import.meta.url));
async function sourceHashes() {
  return Object.fromEntries(
    await Promise.all(requiredFiles.map(async (path) => {
      const source = `fixtures/probes/actual-main/${path}`;
      return [source, await hash(join(repo, source))];
    })),
  );
}
Deno.test("actual-main adapter: copied payload has exact bytes and modes and runs retention through its facade", async () => {
  const root = await Deno.makeTempDir({ prefix: "actual-main-adapter-copy-" });
  try {
    const files = await sourceHashes();
    const copied = await installActualMainAdapter(repo, root, files);
    check(
      JSON.stringify(copied.map((p) => p.target)) ===
        JSON.stringify(requiredFiles.map((p) => `_publication/${p}`)),
      "copied payload is complete and closed",
    );
    const actualFiles = await treeHashes(join(root, "_publication"));
    check(
      Object.keys(actualFiles).length === requiredFiles.length,
      "no extra installed runtime leaves",
    );
    for (const path of requiredFiles) {
      const source = `fixtures/probes/actual-main/${path}`;
      check(actualFiles[path] === files[source], `copied bytes ${path}`);
      check(
        (await Deno.lstat(join(root, "_publication", path))).mode ===
          (await Deno.lstat(join(repo, source))).mode,
        `copied mode ${path}`,
      );
    }
    const installed = await import(
      toFileUrl(join(root, "_publication/state.ts")).href
    );
    check(
      JSON.stringify(Object.keys(installed).sort()) === JSON.stringify([
        "armFailureDiagnostics",
        "assert",
        "diagnosticDigest",
        "dirname",
        "hash",
        "join",
        "load",
        "nativeMembers",
        "observe",
        "readFailureDiagnostics",
        "relative",
        "retainFailureDiagnostics",
        "save",
        "writeFailureDiagnosticsObservation",
      ].sort()),
      "state facade retains its public runtime exports",
    );
    const f = await retentionFixture(join(root, "fixture"));
    const result = await installed.retainFailureDiagnostics(f.ctx, f.armed);
    const retained = JSON.parse(await Deno.readTextFile(result.manifestPath));
    check(
      retained.counts.total === 228 && retained.counts.retained === 8 &&
        retained.counts.absent === 220,
      "copied runtime retains independent finite candidates",
    );
    const report = await installed.writeFailureDiagnosticsObservation(
      f.armed,
      1,
    );
    check(
      (JSON.parse(await Deno.readTextFile(report.observationPath))).status ===
        "retained",
      "copied runtime reports retained evidence",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
Deno.test("actual-main adapter: copy refuses missing or changed authenticated runtime leaves", async () => {
  const root = await Deno.makeTempDir({
    prefix: "actual-main-adapter-unsigned-",
  });
  try {
    const files = await sourceHashes();
    for (const path of requiredFiles) {
      for (const kind of ["missing", "changed"]) {
        const altered = { ...files };
        const source = `fixtures/probes/actual-main/${path}`;
        if (kind === "missing") delete altered[source];
        else altered[source] = h(999, 64);
        let failure: unknown;
        try {
          await installActualMainAdapter(repo, join(root, kind, path), altered);
        } catch (error) {
          failure = error;
        }
        check(
          failure instanceof Error &&
            failure.message.includes(
              `unsigned or changed test adapter source ${source}`,
            ),
          `${kind} source ${source} must refuse`,
        );
      }
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("actual-main adapter: current Source selection arms all configs inputs and runtime leaves", async () => {
  const root = await Deno.makeTempDir({
    prefix: "actual-main-adapter-selection-",
  });
  try {
    const source = await checkoutSource(repo);
    const mounted = originalCourseFiles(source.files);
    const configPaths = Object.keys(mounted).filter((p) =>
      /(^|\/)\_quarto[^/]*\.ya?ml$/.test(p)
    );
    const adapterPaths = requiredFiles.map((p) => `_publication/${p}`);
    const f = await retentionFixture(root);
    const inputPaths = [
      "index.qmd",
      ...f.request.sourceInputs.student.book,
      ...f.request.sourceInputs.student.essay,
    ];
    const selectedHashes = Object.fromEntries([
      ...configPaths.map((p) => [p, mounted[p]]),
      ...inputPaths.map((p) => [p, mounted[p]]),
      ...Object.entries(await sourceHashes()).map((
        [p, hash],
      ) => [p.replace("fixtures/probes/actual-main/", "_publication/"), hash]),
    ]);
    check(
      configPaths.length > 53 &&
        Object.keys(selectedHashes).length === configPaths.length + 10 + 10,
      "actual Source selection exceeds the old count bound and includes every runtime leaf",
    );
    const request = {
      ...f.request,
      selectedHashes,
      sourceSelection: { configPaths, adapterPaths },
    };
    const produced = diagnosticSourceSelection({
      ...source.files,
      ...await sourceHashes(),
    });
    check(
      JSON.stringify(produced) ===
        JSON.stringify({
          selectedHashes,
          sourceSelection: request.sourceSelection,
        }),
      "actual consumer selects the independently expected complete Source map",
    );
    const armed = await armFailureDiagnostics(
      request,
      join(root, "source-selection"),
    );
    check(
      (JSON.parse(await Deno.readTextFile(armed.requestPath))).sourceSelection
        .adapterPaths.length === 10,
      "Source-derived finite selection is armed",
    );
    const altered = [
      {
        name: "legacy bound",
        request: { ...f.request, selectedHashes },
        refusal: "invalid selected source hash paths",
      },
      {
        name: "missing leaf",
        request: {
          ...request,
          selectedHashes: Object.fromEntries(
            Object.entries(selectedHashes).filter(([p]) =>
              p !== "_publication/diagnostics/files.ts"
            ),
          ),
        },
        refusal:
          "diagnostic selected hashes differ from authenticated Source selection",
      },
      {
        name: "extra source",
        request: {
          ...request,
          selectedHashes: { ...selectedHashes, "unregistered.qmd": h(998, 64) },
        },
        refusal:
          "diagnostic selected hashes differ from authenticated Source selection",
      },
      {
        name: "unknown selection field",
        request: {
          ...request,
          sourceSelection: { ...request.sourceSelection, unknown: [] },
        },
        refusal: "invalid diagnostic Source selection",
      },
      {
        name: "escaping leaf",
        request: {
          ...request,
          sourceSelection: {
            ...request.sourceSelection,
            adapterPaths: ["_publication/../escape.ts"],
          },
        },
        refusal: "invalid diagnostic Source selection paths",
      },
      {
        name: "duplicate config",
        request: {
          ...request,
          sourceSelection: {
            ...request.sourceSelection,
            configPaths: [...configPaths, configPaths[0]],
          },
        },
        refusal: "invalid diagnostic Source selection paths",
      },
    ];
    for (const scenario of altered) {
      let failure: unknown;
      try {
        await armFailureDiagnostics(
          scenario.request,
          join(root, scenario.name),
        );
      } catch (error) {
        failure = error;
      }
      check(
        failure instanceof Error &&
          failure.message === `ACTUAL_MAIN_NATIVE: ${scenario.refusal}`,
        `${scenario.name} must refuse before arming`,
      );
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("actual-main adapter: copied facade refuses an omitted runtime dependency", async () => {
  const root = await Deno.makeTempDir({
    prefix: "actual-main-adapter-omitted-",
  });
  try {
    const files = await sourceHashes();
    for (const path of requiredFiles.slice(5)) {
      const destination = join(root, path);
      await installActualMainAdapter(repo, destination, files);
      await Deno.remove(join(destination, "_publication", path));
      let failure: unknown;
      try {
        await import(
          toFileUrl(join(destination, "_publication/state.ts")).href
        );
      } catch (error) {
        failure = error;
      }
      check(
        failure instanceof Error &&
          failure.message.includes("Module not found") &&
          failure.message.includes(path),
        `missing copied ${path} must fail real runtime import`,
      );
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
