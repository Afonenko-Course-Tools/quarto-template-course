import {
  assert,
  assertPrintArchive,
  checkBytes,
  command,
  current,
  denied,
  event,
  files,
  hash,
  join,
  relative,
  remember,
  type RuntimeWitness,
  serviceSegments,
} from "./common.ts";
export default {
  async finalize(ctx: any) {
    const auditStarted = Date.now();
    const { attempt, index } = await current(ctx);
    assert(attempt.delivery, "DELIVERY_RECEIPT_MISSING");
    const paths = await files(ctx.stage);
    for (const path of paths) {
      assert(
        !relative(ctx.stage, path).split("/").some((part) =>
          [...serviceSegments, ".course-owner", "_generated"].includes(part)
        ),
        `SERVICE_FINAL_RESOURCE ${path}`,
      );
    }
    assert(
      Array.isArray(index.runtimeEligibility),
      "RUNTIME_ELIGIBILITY_REQUIRED",
    );
    for (const provider of attempt.runtimeProviders) {
      const member = ctx.members.find((m: any) =>
        m.namespace === provider.namespace
      );
      assert(
        member?.path === provider.root && member.mount === provider.mount,
        "RUNTIME_MEMBER_CHANGED",
      );
      for (const asset of provider.assets) {
        assert(
          index.runtimeEligibility.some((e) =>
            e.eligible && e.producer === provider.provider &&
            e.asset === asset.path && e.kind === asset.kind &&
            e.sourceSha256 === asset.sha256 &&
            e.descriptorSha256 === provider.declarationSha256 &&
            e.registrationSha256 === provider.entrypointSha256 &&
            asset.source === join(provider.root, e.source) &&
            provider.declarationPath ===
              join(provider.root, e.descriptorPath) &&
            provider.entrypoint === join(provider.root, e.registrationPath)
          ),
          `RUNTIME_DECLARATION_NOT_ELIGIBLE ${provider.namespace}/${asset.path}`,
        );
      }
    }
    const runtimeInput = join(ctx.sourceRoot, "_probe/runtime-input.json");
    await Deno.writeTextFile(
      runtimeInput,
      JSON.stringify(attempt.runtimeProviders),
    );
    await remember(attempt, runtimeInput, "runtime-receipt");
    const witnesses = JSON.parse(
      await command("python3", [
        join(ctx.sourceRoot, "_probe/resources/runtime.py"),
        ctx.stage,
        runtimeInput,
      ], ctx.root),
    ) as RuntimeWitness[];
    await checkBytes(paths, index, attempt, { stage: ctx.stage, witnesses });
    const archives = JSON.parse(
      await command("python3", [
        join(ctx.sourceRoot, "_probe/resources/audit.py"),
        ctx.stage,
      ], ctx.root),
    );
    for (const archive of archives) {
      for (const entry of archive.entries) {
        for (const forbidden of denied(index, attempt)) {
          assert(
            entry.sha256 !== forbidden.sha256,
            `${
              forbidden.role === "policy" ? "DENIED" : "SERVICE"
            }_ZIP_RESOURCE ${forbidden.path} -> ${archive.path}/${entry.path}`,
          );
        }
      }
      if (archive.path === "tasks/_downloads/starter.zip") {
        assertPrintArchive(
          archive.entries,
          attempt.delivery.printFiles,
          attempt.delivery.pdfHash,
        );
      }
      const expected = attempt.delivery.archives[archive.path];
      assert(expected, `UNPROVEN_ARCHIVE ${archive.path}`);
      assert(
        JSON.stringify(archive.entries.map((e: any) => e.path).sort()) ===
          JSON.stringify(Object.keys(expected).sort()),
        `ZIP_FILE_SET_CHANGED ${archive.path}`,
      );
      for (const entry of archive.entries) {
        assert(
          expected[entry.path] === entry.sha256,
          `ZIP_BYTES_CHANGED ${archive.path}/${entry.path}`,
        );
      }
    }
    assert(
      JSON.stringify(archives.map((a: any) => a.path).sort()) ===
        JSON.stringify(Object.keys(attempt.delivery.archives).sort()),
      "ZIP_OUTPUT_SET_CHANGED",
    );
    const handoutFiles = paths.map((path) => relative(ctx.stage, path)).filter(
      (path) => path.startsWith("tasks/handouts/"),
    );
    assert(
      JSON.stringify(handoutFiles.sort()) ===
        JSON.stringify(Object.keys(attempt.delivery.printFiles).sort()),
      "PRINT_OUTPUT_SET_CHANGED",
    );
    for (const [path, sha256] of Object.entries(attempt.delivery.printFiles)) {
      assert(
        await hash(join(ctx.stage, path)) === sha256,
        `CURRENT_PRINT_RESOURCE_CHANGED ${path}`,
      );
    }
    for (
      const [path, sha256] of Object.entries(attempt.delivery.archiveHashes)
    ) {
      assert(
        await hash(join(ctx.stage, path)) === sha256,
        `CURRENT_ARCHIVE_CHANGED ${path}`,
      );
    }
    if (attempt.delivery.pdfHash) {
      assert(
        await hash(join(ctx.stage, "tasks/handouts/current.pdf")) ===
          attempt.delivery.pdfHash,
        "CURRENT_PDF_CHANGED",
      );
    }
    // Recheck after all consumer mutations, immediately before Publisher's stage commit.
    await current(ctx);
    await event(ctx, "verified", {
      runtimeWitnesses: witnesses,
      timings: { ...attempt.timings, auditMs: Date.now() - auditStarted },
    });
  },
};
