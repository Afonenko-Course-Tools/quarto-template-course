import {
  preparePrint,
  renderPrint,
} from "../../_extensions/course-print/application/export.ts";
import {
  assert,
  assertPrintTargetAvailable,
  checkBytes,
  command,
  copyTree,
  current,
  dirname,
  event,
  exists,
  files,
  hash,
  join,
  relative,
  remember,
  save,
} from "./common.ts";
function linkTargets(node: any, targets = new Set<string>()): Set<string> {
  if (!node || typeof node !== "object") return targets;
  if (node.t === "Link" || node.t === "Image") targets.add(node.c[2][0]);
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) child.forEach((n) => linkTargets(n, targets));
    else linkTargets(child, targets);
  }
  return targets;
}
export default {
  async finalize(ctx: any) {
    const deliveryStarted = Date.now();
    const options = JSON.parse(
      await Deno.readTextFile(join(ctx.sourceRoot, "_probe/selection.json")),
    );
    const catalog = JSON.parse(
        await Deno.readTextFile(join(ctx.stage, "reference-catalog.json")),
      ),
      target = catalog.targets["theory:sec-theory"];
    assert(target?.page && target.fragment, "QRC must finalize before Print");
    await event(ctx, "qrc-observed", {
      catalogHash: await hash(join(ctx.stage, "reference-catalog.json")),
      target: "theory:sec-theory",
    });
    let { attempt, index, publicPackage: bundle, receipt } = await current(ctx);
    const utility = await Deno.makeTempDir({
        prefix: "resource-download-utility-",
      }),
      privatePrint = await Deno.makeTempDir({
        prefix: "resource-print-candidate-",
      });
    try {
      let pdfHash: string | undefined;
      const printFiles: Record<string, string> = {};
      const expected: Record<string, Record<string, string>> = { starter: {} };
      if (options.print) {
        const workKey = `${bundle.owner}/sec-body-one`;
        assert(
          bundle.works.some((w) => w.key === workKey),
          "FIXED_CURRENT_WORK_REQUIRED",
        );
        const used = linkTargets(
          preparePrint(bundle, workKey, {}).blocks,
        );
        const resources = bundle.resources.filter((r: any) =>
          used.has(r.target)
        );
        // Exact current producer binding; Print receives only its validated public projection.
        for (const r of resources) {
          assert(
            receipt.resources.some((binding) =>
              binding.source === r.source && binding.sha256 === r.sha256 &&
              binding.target === r.target &&
              binding.effectiveBase === r.effectiveBase
            ) &&
              index.files.some((file) =>
                file.path === r.source && file.sha256 === r.sha256
              ),
            `UNPROVEN_PRINT_RESOURCE ${r.target}`,
          );
        }
        const owned = join(privatePrint, "work"),
          result = await renderPrint(bundle, workKey, owned, {}, {
            upstreamCurrent: true,
          });
        assert(
          await exists(join(owned, "handout.pdf")),
          "Print returned without current PDF",
        );
        pdfHash = await hash(join(owned, "handout.pdf"));
        await remember(
          attempt,
          join(owned, "public.json"),
          "print-public-input",
        );
        await remember(
          attempt,
          join(owned, ".course-print.json"),
          "print-receipt",
        );
        const allowed = [
          "handout.pdf",
          "public.json",
          ".course-print.json",
          ...resources.map((r: any) => r.target),
        ].sort();
        assert(
          JSON.stringify(
            (await files(owned)).map((p) => relative(owned, p)).sort(),
          ) === JSON.stringify(allowed),
          "UNEXPECTED_PRINT_OUTPUT",
        );
        for (
          const resource of [
            { target: "handout.pdf", sha256: pdfHash },
            ...resources,
          ]
        ) {
          assert(
            await hash(join(owned, resource.target)) === resource.sha256,
            `PRINT_BYTES_CHANGED ${resource.target}`,
          );
          expected.starter[resource.target] = resource.sha256;
          printFiles[
            `tasks/handouts/${
              resource.target === "handout.pdf"
                ? "current.pdf"
                : resource.target
            }`
          ] = resource.sha256;
          for (
            const base of [
              join(ctx.stage, "tasks/handouts"),
              join(utility, "prepared/starter"),
            ]
          ) {
            const out = join(
              base,
              resource.target === "handout.pdf" && base.includes("handouts")
                ? "current.pdf"
                : resource.target,
            );
            await Deno.mkdir(dirname(out), { recursive: true });
            await Deno.copyFile(join(owned, resource.target), out);
          }
        }
        await event(ctx, "print-ready", {
          pdfHash,
          result,
          bodyPublicHash: attempt.body!.publicHash,
          bodySchema: bundle.schema,
        });
      }
      const selected =
        (await files(join(attempt.handle.root, "materials/student"))).map(
          (path) => relative(attempt.handle.root, path),
        );
      if (ctx.profiles[0] === "full") {
        expected.instructor = {};
        selected.push(
          ...(await files(join(attempt.handle.root, "materials/instructor")))
            .map((path) => relative(attempt.handle.root, path)),
        );
      }
      // Keep current Print service receipts while refreshing validator-owned transports.
      await save(ctx, attempt);
      ({ attempt, index } = await current(ctx, selected));
      for (const path of selected) {
        const group = path.startsWith("materials/student/")
            ? "starter"
            : "instructor",
          name = relative(
            join(
              attempt.handle.root,
              group === "starter"
                ? "materials/student"
                : "materials/instructor",
            ),
            join(attempt.handle.root, path),
          );
        if (group === "starter") assertPrintTargetAvailable(name, printFiles);
        const out = join(utility, "prepared", group, name);
        await Deno.mkdir(dirname(out), { recursive: true });
        await Deno.copyFile(join(attempt.handle.root, path), out);
        expected[group][name] = await hash(out);
      }
      await checkBytes(await files(join(utility, "prepared")), index, attempt);
      await copyTree(
        join(
          ctx.sourceRoot,
          "_extensions/Afonenko-Course-Tools/project-download",
        ),
        join(utility, "_extensions/project-download"),
      );
      const resources = Object.fromEntries(
        Object.keys(expected).map(
          (id) => [id, { path: `prepared/${id}`, gitignore: false }],
        ),
      );
      await Deno.writeTextFile(
        join(utility, "_quarto.yml"),
        JSON.stringify({
          project: {
            type: "default",
            "output-dir": "_output",
            render: ["index.qmd"],
            "pre-render": "_extensions/project-download/entrypoints/pre.ts",
            "post-render": "_extensions/project-download/entrypoints/post.ts",
            resources: ["!prepared/**"],
          },
          format: "html",
          filters: ["project-download"],
          "project-download": { resources },
        }),
      );
      await Deno.writeTextFile(join(utility, ".gitignore"), "prepared/\n");
      await Deno.writeTextFile(
        join(utility, "index.qmd"),
        Object.keys(resources).map((id) => `{{< project-download ${id} >}}`)
          .join("\n\n"),
      );
      await event(ctx, "package-start", { pdfHash });
      const downloadStarted = Date.now();
      await command(Deno.env.get("QUARTO") || "quarto", ["render"], utility, {
        QUARTO_PROJECT_OUTPUT_DIR: "_output",
        QUARTO_PROFILE: "",
        PROJECT_PUBLISH_MEMBER: "1",
      });
      attempt.timings.downloadMs = Date.now() - downloadStarted;
      await copyTree(
        join(utility, "_output/_downloads"),
        join(ctx.stage, "tasks/_downloads"),
      );
      const archiveHashes: Record<string, string> = {};
      for (const id of Object.keys(expected)) {
        archiveHashes[`tasks/_downloads/${id}.zip`] = await hash(
          join(ctx.stage, `tasks/_downloads/${id}.zip`),
        );
      }
      attempt.delivery = {
        pdfHash,
        printFiles,
        archiveHashes,
        archives: Object.fromEntries(
          Object.entries(expected).map((
            [id, mapping],
          ) => [`tasks/_downloads/${id}.zip`, mapping]),
        ),
      };
      attempt.timings.deliveryMs = Date.now() - deliveryStarted;
      await save(ctx, attempt);
      await event(ctx, "package-ready", { pdfHash, timings: attempt.timings });
    } finally {
      await Deno.remove(utility, { recursive: true });
      await Deno.remove(privatePrint, { recursive: true });
    }
  },
};
