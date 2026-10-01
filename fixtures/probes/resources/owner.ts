import { toFileUrl } from "stdlib/path";
import {
  activateOwner,
  finishOwner,
  prepareOwner,
} from "../../_extensions/Afonenko-Course-Tools/course-core/owner-preflight/owner.ts";
import {
  assert,
  type Attempt,
  childOrEqual,
  command,
  event,
  files,
  hash,
  join,
  load,
  relative,
  remember,
  rememberTree,
  resolve,
  save,
  serviceSegments,
  validateOwnerResources,
} from "./common.ts";
async function selectionGate(ctx: any) {
  // Native inspect expands selections; configResources are render dependencies, not raw delivery.
  for (
    const project of [
      { path: ctx.sourceRoot },
      { path: ctx.root },
      ...ctx.members,
    ]
  ) {
    const info = JSON.parse(
      await command(Deno.env.get("QUARTO") || "quarto", [
        "inspect",
        project.path,
        "--profile",
        ctx.profiles.join(","),
      ], project.path),
    );
    for (const selected of info.files.resources) {
      const path = resolve(project.path, selected),
        segments = relative(project.path, path).split("/");
      assert(
        !segments.some((s: string) =>
          [...serviceSegments, ".course-owner", "_generated"].includes(s)
        ),
        `SERVICE_RESOURCE_SELECTION ${selected}`,
      );
      assert(
        !childOrEqual(path, join(project.path, "_probe")),
        `SERVICE_RESOURCE_SELECTION ${selected}`,
      );
    }
  }
}
export default {
  async beforeRender(ctx: any) {
    const beforeStarted = Date.now();
    assert(
      ctx.profiles.length === 1 &&
        ["student", "full"].includes(ctx.profiles[0]),
      "UNSUPPORTED_CONSUMER_PROFILE",
    );
    const member = ctx.members.find((m: any) => m.namespace === "tasks");
    assert(
      member?.format === "html" &&
        member.path === join(ctx.sourceRoot, "tasks"),
      "UNSUPPORTED_CONSUMER_OWNER",
    );
    await event(ctx, "owner-prepare");
    await selectionGate(ctx);
    const prepareStarted = Date.now();
    const handle = await prepareOwner(member.path, {
      attemptId: ctx.attemptId,
      profile: ctx.profiles[0],
      extension: "_extensions/Afonenko-Course-Tools/course-core",
    });
    const prepareOwnerMs = Date.now() - prepareStarted;
    const manifest = JSON.parse(
      await Deno.readTextFile(
        join(ctx.sourceRoot, "_probe/body-manifest.json"),
      ),
    );
    const body = [];
    for (const entry of manifest) {
      const path = resolve(ctx.sourceRoot, entry.path);
      assert(
        childOrEqual(join(ctx.sourceRoot, "_probe/body"), path) &&
          await hash(path) === entry.sha256,
        `BODY_SETUP_CHANGED ${entry.path}`,
      );
      body.push({
        path,
        sha256: entry.sha256,
        role: [
            join(ctx.sourceRoot, "_probe/body/input/dot.png"),
            join(ctx.sourceRoot, "_probe/body/input/data.txt"),
          ].includes(path)
          ? "experimental-public-resource"
          : "experimental-body-input",
      });
    }
    const actual = (await files(join(ctx.sourceRoot, "_probe/body"))).sort();
    assert(
      JSON.stringify(actual) === JSON.stringify(body.map((f) => f.path).sort()),
      "BODY_SETUP_FILE_SET_CHANGED",
    );
    const { buildPackage } = await import(
      toFileUrl(join(ctx.sourceRoot, "_probe/body/producer/package.ts")).href
    );
    const bundle = await buildPackage(
      ["corpus.qmd", "work-one.qmd", "work-two.qmd"].map((name) =>
        toFileUrl(join(ctx.sourceRoot, "_probe/body/input", name))
      ),
      "artifact-course",
    );
    const packagePath = join(ctx.sourceRoot, "_probe/current-package.json");
    await Deno.writeTextFile(packagePath, JSON.stringify(bundle));
    const runtimeProviders = [];
    for (const member of ctx.members) {
      const providerRoot = join(
        member.path,
        "_extensions/Afonenko-Course-Tools/course-presentation",
      );
      const declarationPath = join(providerRoot, "html-dependency.json"),
        entrypoint = join(providerRoot, "filter.lua");
      const declaration = JSON.parse(await Deno.readTextFile(declarationPath));
      const assets = [];
      for (
        const [field, kind] of [["scripts", "script"], [
          "stylesheets",
          "stylesheet",
        ]] as const
      ) {
        for (const asset of declaration[field] || []) {
          assert(
            typeof asset.path === "string" && !asset.path.startsWith("/") &&
              !asset.path.split(/[\\/]/).some((p: string) =>
                !p || p === ".." || p === "."
              ),
            "UNSUPPORTED_RUNTIME_ASSET",
          );
          const source = join(providerRoot, asset.path);
          assets.push({
            path: asset.path,
            source,
            sha256: await hash(source),
            kind,
          });
        }
      }
      runtimeProviders.push({
        namespace: member.namespace,
        mount: member.mount,
        root: member.path,
        provider: declaration.name,
        declarationPath,
        declarationSha256: await hash(declarationPath),
        entrypoint,
        entrypointSha256: await hash(entrypoint),
        assets,
      });
    }
    const attempt: Attempt = {
      protocol: 1,
      timings: { prepareOwnerMs },
      handle,
      body,
      services: body.filter((file) =>
        file.role !== "experimental-public-resource"
      ),
      packagePath,
      runtimeProviders,
      packageHash: await hash(packagePath),
    };
    attempt.services.push({
      path: packagePath,
      sha256: attempt.packageHash,
      role: "experimental-print-input",
    });
    await remember(
      attempt,
      join(ctx.sourceRoot, "_probe/body-manifest.json"),
      "body-receipt",
    );
    await rememberTree(
      attempt,
      join(handle.root, ".course-owner"),
      "owner-session",
    );
    attempt.timings.beforeRenderMs = Date.now() - beforeStarted;
    await save(ctx, attempt);
    await event(ctx, "owner-prepared", {
      timings: attempt.timings,
      sessionId: handle.sessionId,
      packageHash: attempt.packageHash,
      experimental: "snapshot-local Pandoc+CUE body",
    });
  },
  async metadata(ctx: any) {
    if (ctx.namespace !== "tasks") {
      const ended = Date.now(), attempt = await load(ctx);
      if (attempt.timings.nativeStartedAt && !attempt.timings.nativeTasksMs) {
        attempt.timings.nativeTasksMs = ended - attempt.timings.nativeStartedAt;
        await save(ctx, attempt);
      }
      return {};
    }
    assert(ctx.format === "html", "UNSUPPORTED_OWNER_FORMAT");
    const attempt = await load(ctx);
    const overlay = await activateOwner(attempt.handle, { output: ctx.output });
    attempt.output = ctx.output;
    attempt.timings.nativeStartedAt = Date.now();
    await save(ctx, attempt);
    await event(ctx, "owner-activated", {
      namespace: ctx.namespace,
      output: ctx.output,
      sessionId: attempt.handle.sessionId,
    });
    return overlay;
  },
  async finalize(ctx: any) {
    const attempt = await load(ctx);
    const finishStarted = Date.now();
    const result = await finishOwner(attempt.handle);
    attempt.timings.finishOwnerMs = Date.now() - finishStarted;
    assert(
      result.exitCode === 0,
      `${result.stage}: ${JSON.stringify(result.report)}`,
    );
    await event(ctx, "owner-finished", { resultStage: result.stage });
    const indexStarted = Date.now();
    const index = await validateOwnerResources(attempt.handle);
    attempt.timings.indexValidationMs = Date.now() - indexStarted;
    attempt.indexHash = index.indexHash;
    await rememberTree(
      attempt,
      join(attempt.handle.root, ".course-owner"),
      "owner-session",
    );
    await save(ctx, attempt);
    const count =
      (await Deno.readTextFile(join(ctx.sourceRoot, "_probe/engine-runs.txt")))
        .trim().split("\n").length;
    attempt.timings.cellMs = Number(
      await Deno.readTextFile(join(ctx.sourceRoot, "_probe/engine-ms.txt")),
    );
    await save(ctx, attempt);
    await event(ctx, "owner-index", {
      index,
      engineRuns: count,
      timings: attempt.timings,
    });
  },
};
