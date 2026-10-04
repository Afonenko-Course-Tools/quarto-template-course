// Ограниченный consumer: предметную политику и проверку owner index выполняет Core.
export {
  assert,
  childOrEqual,
  command,
  copyTree,
  dirname,
  event,
  exists,
  files,
  hash,
  join,
  relative,
  resolve,
  serviceSegments,
} from "../artifacts/common.ts";
import { assert, files, hash, join } from "../artifacts/common.ts";
import {
  type BodyReceipt,
  type OwnerBodyHandle,
  type PreparedOwner,
  type PublicBodyPackage,
  validateOwnerBodies,
} from "../../_extensions/Afonenko-Course-Tools/course-core/owner-preflight/owner.ts";
import {
  type OwnerResourceIndex,
  validateOwnerResources,
} from "../../_extensions/Afonenko-Course-Tools/course-core/owner-preflight/resources.ts";
export { validateOwnerBodies, validateOwnerResources };
export type {
  BodyReceipt,
  OwnerBodyHandle,
  OwnerResourceIndex,
  PreparedOwner,
  PublicBodyPackage,
};
export interface OwnedBytes {
  path: string;
  sha256: string;
  role: string;
}
export interface RuntimeProvider {
  namespace: string;
  mount: string;
  root: string;
  provider: string;
  declarationPath: string;
  declarationSha256: string;
  entrypoint: string;
  entrypointSha256: string;
  assets: {
    path: string;
    source: string;
    sha256: string;
    kind: "script" | "stylesheet";
  }[];
}
export interface RuntimeWitness {
  member: string;
  document: string;
  documentSha256: string;
  destination: string;
  source: string;
  sha256: string;
  provider: string;
  asset: string;
  kind: "script" | "stylesheet";
  declarationHash: string;
}
export interface Attempt {
  protocol: 1;
  timings: Record<string, number>;
  handle: PreparedOwner;
  body?: OwnerBodyHandle;
  services: OwnedBytes[];
  runtimeProviders: RuntimeProvider[];
  output?: string;
  indexHash?: string;
  delivery?: {
    pdfHash?: string;
    printFiles: Record<string, string>;
    archives: Record<string, Record<string, string>>;
    archiveHashes: Record<string, string>;
  };
}
export const attemptPath = (ctx: any) =>
  join(ctx.sourceRoot, "_probe/resource-attempt.json");
export async function save(ctx: any, attempt: Attempt) {
  await Deno.writeTextFile(attemptPath(ctx), JSON.stringify(attempt));
}
export async function load(ctx: any): Promise<Attempt> {
  const a = JSON.parse(await Deno.readTextFile(attemptPath(ctx))) as Attempt;
  assert(
    a.protocol === 1 && a.handle.root === join(ctx.sourceRoot, "tasks") &&
      a.handle.attemptId === ctx.attemptId && ctx.profiles.length === 1 &&
      a.handle.profile === ctx.profiles[0],
    "INVALID_CONSUMER_ATTEMPT",
  );
  a.services.push({
    path: attemptPath(ctx),
    sha256: await hash(attemptPath(ctx)),
    role: "consumer-receipt",
  });
  return a;
}
export async function current(
  ctx: any,
  selections: string[] = [],
): Promise<
  {
    attempt: Attempt;
    index: OwnerResourceIndex;
    publicPackage: PublicBodyPackage;
    receipt: BodyReceipt;
  }
> {
  const attempt = await load(ctx);
  assert(
    attempt.body?.schema === "course-body-handle-v1",
    "CURRENT_OWNER_BODY_HANDLE_REQUIRED",
  );
  const checked = await validateOwnerBodies(attempt.handle, attempt.body),
    index = await validateOwnerResources(attempt.handle, { selections });
  assert(attempt.indexHash === index.indexHash, "CONSUMER_INDEX_CHANGED");
  // Validator retains producer-owned CUE inputs in this already declared Core area.
  await rememberTree(
    attempt,
    join(attempt.handle.root, ".course-owner"),
    "owner-session",
  );
  await save(ctx, attempt);
  return {
    attempt,
    index,
    publicPackage: checked.publicPackage,
    receipt: checked.receipt,
  };
}
export async function remember(attempt: Attempt, path: string, role: string) {
  const sha256 = await hash(path);
  if (
    !attempt.services.some((f) =>
      f.path === path && f.sha256 === sha256 && f.role === role
    )
  ) {
    attempt.services.push({ path, sha256, role });
  }
}
export async function rememberTree(
  attempt: Attempt,
  path: string,
  role: string,
) {
  for (const file of await files(path)) await remember(attempt, file, role);
}
function printZipTargets(printFiles: Record<string, string>, pdfHash?: string) {
  if (pdfHash) {
    assert(
      printFiles["tasks/handouts/current.pdf"] === pdfHash,
      "PRINT_RECEIPT_PDF_CHANGED",
    );
  }
  return Object.fromEntries(
    Object.entries(printFiles).map(([path, sha256]) => {
      assert(path.startsWith("tasks/handouts/"), "PRINT_RECEIPT_PATH_CHANGED");
      const target = path === "tasks/handouts/current.pdf"
        ? "handout.pdf"
        : path.slice("tasks/handouts/".length);
      return [target, sha256];
    }),
  );
}
export function assertPrintTargetAvailable(
  name: string,
  printFiles: Record<string, string>,
) {
  assert(
    !Object.hasOwn(printZipTargets(printFiles), name),
    `PRINT_TARGET_COLLISION ${name}`,
  );
}
export function assertPrintArchive(
  entries: { path: string; sha256: string }[],
  printFiles: Record<string, string>,
  pdfHash?: string,
) {
  for (
    const [target, sha256] of Object.entries(
      printZipTargets(printFiles, pdfHash),
    )
  ) {
    assert(
      entries.find((entry) => entry.path === target)?.sha256 === sha256,
      `CURRENT_PRINT_ZIP_RESOURCE_CHANGED ${target}`,
    );
  }
}
export function denied(index: OwnerResourceIndex, attempt: Attempt) {
  return [
    ...index.policy.files.filter((f) => !f.allowed).map((f) => ({
      sha256: f.sha256,
      path: f.path,
      role: "policy",
    })),
    ...attempt.services,
  ];
}
export async function checkBytes(
  paths: string[],
  index: OwnerResourceIndex,
  attempt: Attempt,
  runtime: { stage: string; witnesses: RuntimeWitness[] } | undefined =
    undefined,
) {
  for (const path of paths) {
    const digest = await hash(path);
    for (const forbidden of denied(index, attempt)) {
      const witness = runtime?.witnesses.find((w) =>
        join(runtime.stage, w.destination) === path && w.sha256 === digest
      );
      const derivative = forbidden.role === "policy" && witness &&
        index.runtimeEligibility.some((eligible) =>
          eligible.eligible && eligible.source === forbidden.path &&
          eligible.sourceSha256 === digest &&
          eligible.producer === witness.provider &&
          eligible.asset === witness.asset && eligible.kind === witness.kind &&
          eligible.descriptorSha256 === witness.declarationHash &&
          index.files.some((file) =>
            file.path === eligible.source && file.origin === "service" &&
            file.sha256 === digest
          )
        );
      assert(
        digest !== forbidden.sha256 || derivative,
        `${
          forbidden.role === "policy" ? "DENIED" : "SERVICE"
        }_DELIVERY_RESOURCE ${forbidden.path} -> ${path}`,
      );
    }
  }
}
