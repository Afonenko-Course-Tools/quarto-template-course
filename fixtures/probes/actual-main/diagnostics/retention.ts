// Finite candidate ordering, stable copy retention and the attempt manifest.
import { extname, join, relative } from "stdlib/path";
import { assert, hash } from "../common.ts";
import {
  type ArmedFailureDiagnostics,
  type FailureDiagnosticsRequest,
  failureProfiles,
  type FailureRetentionTestHooks,
  validateContext,
} from "./contract.ts";
import {
  diagnosticDigest,
  exclusiveBytes,
  fingerprint,
  literalRelative,
  message,
  safeRegular,
} from "./files.ts";
import { requestFrom } from "./reports.ts";

interface FailureCandidate {
  ordinal: number;
  scope: string;
  profile: string;
  sourceRelative: string;
  role: string;
  sourcePath: string;
  destination: string;
}
async function candidates(request: FailureDiagnosticsRequest, ctx: any) {
  const tuples = [{
    scope: "root",
    root: ctx.sourceRoot,
    profile: request.profile,
    sourceRelative: relative(ctx.sourceRoot, ctx.portal.input),
  }];
  for (const profile of failureProfiles) {
    for (const scope of ["book", "essay"] as const) {
      const member = request.members.find((m) => m.namespace === scope)!;
      for (const input of request.sourceInputs[profile][scope]) {
        const coreRoot = join(ctx.sourceRoot, member.path);
        const sourceRelative = relative(coreRoot, join(ctx.sourceRoot, input));
        assert(
          literalRelative(sourceRelative),
          "diagnostic input escapes member Core root",
        );
        tuples.push({ scope, root: coreRoot, profile, sourceRelative });
      }
    }
  }
  assert(tuples.length === 19, "diagnostic finite tuple count");
  const result: FailureCandidate[] = [];
  for (const tuple of tuples) {
    const encode = new TextEncoder();
    const h = await diagnosticDigest(
      encode.encode(tuple.sourceRelative),
      "SHA-1",
    );
    const k = await diagnosticDigest(
      encode.encode(tuple.profile + ":" + tuple.sourceRelative),
      "SHA-1",
    );
    const add = (path: string, role: string) => {
      const ordinal = result.length + 1;
      result.push({
        ordinal,
        scope: tuple.scope,
        profile: tuple.profile,
        sourceRelative: tuple.sourceRelative,
        role,
        sourcePath: join(tuple.root, path),
        destination: "files/candidate-" + String(ordinal).padStart(4, "0") +
          extname(path),
      });
    };
    for (const phase of ["capture", "identity", "render"]) {
      add(
        `.course-owner/native-listing/input/${phase}/${tuple.profile}/${h}.md`,
        "native-listing-input:" + phase,
      );
      add(
        `.course-owner/native-listing/witness/${phase}/${tuple.profile}/${h}.json`,
        "native-listing-witness:" + phase,
      );
      add(
        `.course-owner/${phase}/${tuple.profile}/${h}.json`,
        "native-observation:" + phase,
      );
    }
    add(`.course-owner/reader-input/${tuple.profile}/${h}.md`, "reader-input");
    add(`.course-owner/capture-${k}.log`, "capture-log");
    add(`.course-owner/identity-${k}.log`, "identity-log");
  }
  assert(
    result.length === 228 &&
      new Set(result.map((c) => c.sourcePath)).size === 228,
    "diagnostic finite candidate count/uniqueness",
  );
  return result;
}
async function selectedHashes(
  request: FailureDiagnosticsRequest,
  sourceRoot: string,
) {
  const result: Record<string, unknown>[] = [];
  for (const [path, expected] of Object.entries(request.selectedHashes)) {
    try {
      const sourcePath = join(sourceRoot, path);
      const before = await safeRegular(sourcePath, sourceRoot);
      const bytes = await Deno.readFile(sourcePath);
      const after = await safeRegular(sourcePath, sourceRoot);
      assert(
        fingerprint(before) === fingerprint(after),
        "selected source changed while hashing",
      );
      const observed = await diagnosticDigest(bytes);
      result.push({
        path,
        expected,
        observed,
        status: observed === expected ? "equal" : "changed",
      });
    } catch (error) {
      result.push({
        path,
        expected,
        status: error instanceof Deno.errors.NotFound ? "absent" : "error",
        ...(error instanceof Deno.errors.NotFound
          ? {}
          : { error: message(error) }),
      });
    }
  }
  return result;
}
export async function retainFailureDiagnostics(
  ctx: any,
  supplied?: Pick<ArmedFailureDiagnostics, "requestPath" | "requestSha256">,
  testHooks?: FailureRetentionTestHooks,
): Promise<{ manifestPath: string; manifestSha256: string }> {
  const requestPath = supplied?.requestPath ||
    Deno.env.get("ACTUAL_MAIN_NATIVE_DIAGNOSTICS_REQUEST");
  const requestSha256 = supplied?.requestSha256 ||
    Deno.env.get("ACTUAL_MAIN_NATIVE_DIAGNOSTICS_REQUEST_SHA256");
  assert(requestPath && requestSha256, "diagnostic request missing");
  const request = await requestFrom({ requestPath, requestSha256 });
  const context = await validateContext(ctx, request);
  const attemptRoot = join(request.sink, ctx.attemptId);
  await Deno.mkdir(attemptRoot); // The prior notification's evidence cannot be overwritten.
  await Deno.mkdir(join(attemptRoot, "files"));
  const rows: Record<string, unknown>[] = [];
  for (const candidate of await candidates(request, ctx)) {
    const destinationPath = join(attemptRoot, candidate.destination);
    const { destination: _destination, ...facts } = candidate;
    let observed = false;
    try {
      const before = await safeRegular(candidate.sourcePath, ctx.sourceRoot);
      observed = true;
      const source = await Deno.open(candidate.sourcePath, { read: true });
      let bytes: Uint8Array;
      try {
        const stat = await source.stat();
        assert(
          fingerprint(stat) === fingerprint(before),
          "diagnostic source changed before open",
        );
        const parts: Uint8Array[] = [];
        const buffer = new Uint8Array(65536);
        let size = 0, count: number | null;
        while ((count = await source.read(buffer)) !== null) {
          if (count === 0) continue;
          parts.push(buffer.slice(0, count));
          size += count;
        }
        bytes = new Uint8Array(size);
        let offset = 0;
        for (const part of parts) {
          bytes.set(part, offset);
          offset += part.length;
        }
        assert(
          fingerprint(await source.stat()) === fingerprint(before),
          "diagnostic source unstable during read",
        );
      } finally {
        source.close();
      }
      await testHooks?.afterRead?.({
        sourcePath: candidate.sourcePath,
        destinationPath,
        ordinal: candidate.ordinal,
      }, bytes);
      const after = await safeRegular(candidate.sourcePath, ctx.sourceRoot);
      const sourceAgain = await Deno.readFile(candidate.sourcePath);
      const final = await safeRegular(candidate.sourcePath, ctx.sourceRoot);
      const sha256 = await diagnosticDigest(bytes);
      assert(
        fingerprint(before) === fingerprint(final) &&
          fingerprint(before) === fingerprint(after) &&
          sha256 === await diagnosticDigest(sourceAgain),
        "diagnostic source unstable after read",
      );
      await exclusiveBytes(destinationPath, bytes);
      await safeRegular(destinationPath, attemptRoot);
      const copied = await Deno.readFile(destinationPath);
      assert(
        copied.length === bytes.length &&
          await diagnosticDigest(copied) === sha256,
        "diagnostic copied bytes/SHA mismatch",
      );
      rows.push({
        ...facts,
        destination: candidate.destination,
        status: "retained",
        bytes: bytes.length,
        sha256,
      });
    } catch (error) {
      rows.push({
        ...facts,
        status: error instanceof Deno.errors.NotFound && !observed
          ? "absent-at-notification"
          : (error instanceof Deno.errors.NotFound && observed) ||
              /unstable|changed (before|while)/.test(message(error))
          ? "unstable"
          : "error",
        ...(error instanceof Deno.errors.NotFound && !observed
          ? {}
          : { error: message(error) }),
      });
    }
  }
  const hashes = await selectedHashes(request, ctx.sourceRoot);
  const counts = {
    total: rows.length,
    retained: rows.filter((row) => row.status === "retained").length,
    absent:
      rows.filter((row) => row.status === "absent-at-notification").length,
    errors:
      rows.filter((row) => row.status === "error" || row.status === "unstable")
        .length +
      hashes.filter((row) => row.status === "error").length,
  };
  const manifest = {
    protocol: 1,
    scope: "diagnostic-only",
    attemptId: ctx.attemptId,
    label: request.label,
    phase: request.phase,
    profile: request.profile,
    run: request.run,
    requestSha256,
    anchors: request.anchors,
    context,
    selectedHashes: hashes,
    candidates: rows,
    counts,
  };
  const manifestPath = join(attemptRoot, "manifest.json");
  await exclusiveBytes(
    manifestPath,
    new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  );
  await safeRegular(manifestPath, attemptRoot);
  const manifestSha256 = await hash(manifestPath);
  if (counts.errors) {
    throw new Error(
      "ACTUAL_MAIN_NATIVE: retention incomplete; partial manifest " +
        manifestPath,
    );
  }
  return { manifestPath, manifestSha256 };
}
