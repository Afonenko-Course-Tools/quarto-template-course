// External request arming/authentication and diagnostic inventory/observation reports.
import { dirname, join } from "stdlib/path";
import { assert, hash } from "../common.ts";
import {
  type ArmedFailureDiagnostics,
  attemptPattern,
  type FailureDiagnosticsRequest,
  sha256Pattern,
  validateRequest,
} from "./contract.ts";
import {
  absoluteLiteral,
  diagnosticDigest,
  exclusiveBytes,
  fingerprint,
  message,
  safeDirectory,
  safeRegular,
} from "./files.ts";

export async function requestFrom(
  armed: Pick<ArmedFailureDiagnostics, "requestPath" | "requestSha256">,
) {
  assert(
    absoluteLiteral(armed.requestPath) &&
      sha256Pattern.test(armed.requestSha256),
    "invalid diagnostic request path/hash",
  );
  const before = await safeRegular(
    armed.requestPath,
    dirname(armed.requestPath),
  );
  const bytes = await Deno.readFile(armed.requestPath);
  const after = await safeRegular(
    armed.requestPath,
    dirname(armed.requestPath),
  );
  assert(
    fingerprint(before) === fingerprint(after) &&
      await diagnosticDigest(bytes) === armed.requestSha256,
    "diagnostic request SHA/stability mismatch",
  );
  const request: FailureDiagnosticsRequest = JSON.parse(
    new TextDecoder().decode(bytes),
  );
  validateRequest(request);
  assert(
    armed.requestPath === join(request.sink, "request.json"),
    "diagnostic request aliases sink",
  );
  await safeDirectory(request.root);
  await safeDirectory(request.sink);
  for (const root of request.forbiddenRoots) await safeDirectory(root);
  return request;
}
export async function armFailureDiagnostics(
  request: Omit<FailureDiagnosticsRequest, "protocol" | "sink">,
  directory: string,
): Promise<ArmedFailureDiagnostics> {
  const complete: FailureDiagnosticsRequest = {
    protocol: 1,
    ...request,
    sink: directory,
  };
  validateRequest(complete);
  await safeDirectory(complete.root);
  for (const root of complete.forbiddenRoots) await safeDirectory(root);
  await safeDirectory(dirname(directory), true);
  await Deno.mkdir(directory); // Each label/request is fresh; no overwrite.
  const requestPath = join(directory, "request.json");
  await exclusiveBytes(
    requestPath,
    new TextEncoder().encode(JSON.stringify(complete, null, 2)),
  );
  const armed = {
    requestPath,
    requestSha256: await hash(requestPath),
    directory,
  };
  await requestFrom(armed);
  return armed;
}

export async function readFailureDiagnostics(armed: ArmedFailureDiagnostics) {
  const attempts: {
    attemptId: string;
    manifestPath: string;
    manifestSha256: string;
    retainedCount: number;
    absentCount: number;
    errorCount: number;
  }[] = [];
  try {
    await requestFrom(armed);
    for await (const entry of Deno.readDir(armed.directory)) {
      if (entry.name === "request.json") continue;
      assert(
        entry.isDirectory && !entry.isSymlink &&
          attemptPattern.test(entry.name),
        "unexpected external diagnostic entry",
      );
      const root = join(armed.directory, entry.name);
      await safeDirectory(root);
      const manifestPath = join(root, "manifest.json");
      await safeRegular(manifestPath, root);
      const manifest = JSON.parse(await Deno.readTextFile(manifestPath));
      assert(
        manifest.protocol === 1 && manifest.scope === "diagnostic-only" &&
          manifest.attemptId === entry.name &&
          manifest.requestSha256 === armed.requestSha256 &&
          manifest.counts?.total === 228,
        "invalid external diagnostic manifest",
      );
      attempts.push({
        attemptId: entry.name,
        manifestPath,
        manifestSha256: await hash(manifestPath),
        retainedCount: manifest.counts.retained,
        absentCount: manifest.counts.absent,
        errorCount: manifest.counts.errors,
      });
    }
    assert(
      attempts.length <= 1,
      "multiple attempts for one diagnostic request",
    );
    return {
      requestSha256: armed.requestSha256,
      status: attempts.some((a) => a.errorCount)
        ? "retention-error"
        : attempts.length
        ? "retained"
        : "not-notified",
      attempts,
    };
  } catch (error) {
    return {
      requestSha256: armed.requestSha256,
      status: "inventory-error",
      attempts,
      error: message(error),
    };
  }
}

export async function writeFailureDiagnosticsObservation(
  armed: ArmedFailureDiagnostics,
  childExit: number,
) {
  const request = await requestFrom(armed);
  const inventory = await readFailureDiagnostics(armed);
  const observationPath = join(armed.directory, "observation.json");
  await exclusiveBytes(
    observationPath,
    new TextEncoder().encode(JSON.stringify(
      {
        label: request.label,
        phase: request.phase,
        profile: request.profile,
        childExit,
        ...inventory,
      },
      null,
      2,
    )),
  );
  return { observationPath, observationSha256: await hash(observationPath) };
}
