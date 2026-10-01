// Доверенный adapter конкретной пробы. Не production bridge Core/QRC.
import {
  assert,
  command,
  copyTree,
  dirname,
  event,
  exists,
  files,
  hash,
  join,
  policy,
  relative,
} from "./common.ts";
import { renderPrint } from "../_extensions/course-print/application/export.ts";
export default {
  async finalize(ctx: any) {
    const p = await policy(ctx);
    const catalog = JSON.parse(
      await Deno.readTextFile(join(ctx.stage, "reference-catalog.json")),
    );
    const target = catalog.targets["theory:sec-theory"];
    assert(
      target && target.page && target.fragment,
      "QRC must finalize before Print",
    );
    const url = new URL(
      `${target.page}#${target.fragment}`,
      ctx.config.website["site-url"],
    ).href;
    await event(ctx, "qrc-observed", { url });
    const options = JSON.parse(
      await Deno.readTextFile(join(ctx.sourceRoot, "_probe/selection.json")),
    );
    const utility = await Deno.makeTempDir({
      prefix: "native-download-utility-",
    });
    const privatePrint = await Deno.makeTempDir({
      prefix: "artifact-print-candidate-",
    });
    try {
      const bundle = JSON.parse(
        await Deno.readTextFile(join(ctx.sourceRoot, "_probe/package.json")),
      );
      // Bind one existing native Link in the fixture to this attempt's final address.
      const bind = (node: any) => {
        if (!node || typeof node !== "object") return;
        if (
          node.t === "Link" &&
          node.c[2][0] === "https://example.org/course#def-one"
        ) node.c[2][0] = url;
        for (const v of Object.values(node)) {
          if (Array.isArray(v)) v.forEach(bind);
          else bind(v);
        }
      };
      for (const q of bundle.questions) bind(q.condition);
      if (options.fail === "print") bundle.questions[0].visibility = "closed";
      let pdfHash: string | undefined;
      if (options.print) {
        const owned = join(privatePrint, "work");
        const result = await renderPrint(
          bundle,
          bundle.works[0].key,
          owned,
          {},
          { upstreamCurrent: true },
        );
        assert(
          await exists(join(owned, "handout.pdf")),
          "Print returned without current PDF",
        );
        pdfHash = await hash(join(owned, "handout.pdf"));
        await Deno.mkdir(join(ctx.stage, "tasks/handouts"), {
          recursive: true,
        });
        await Deno.copyFile(
          join(owned, "handout.pdf"),
          join(ctx.stage, "tasks/handouts/current.pdf"),
        );
        // Keep selected link/image resources relative to the PDF in both destinations.
        for (const file of await files(owned)) {
          const path = relative(owned, file);
          if (
            ["handout.pdf", "public.json", ".course-print.json"].includes(path)
          ) continue;
          for (
            const base of [
              join(ctx.stage, "tasks/handouts"),
              join(utility, "prepared/starter"),
            ]
          ) {
            await Deno.mkdir(dirname(join(base, path)), { recursive: true });
            await Deno.copyFile(file, join(base, path));
          }
        }
        await event(ctx, "print-ready", { pdfHash, result });
      }
      // Utility sources contain only owner-permitted, explicitly selected starter trees.
      await copyTree(
        join(ctx.sourceRoot, "tasks/materials/student"),
        join(utility, "prepared/starter"),
      );
      if (options.print) {
        assert(pdfHash, "PDF required before packaging");
        await Deno.copyFile(
          join(ctx.stage, "tasks/handouts/current.pdf"),
          join(utility, "prepared/starter/handout.pdf"),
        );
      }
      if (ctx.profiles.includes("full")) {
        await copyTree(
          join(ctx.sourceRoot, "tasks/materials/instructor"),
          join(utility, "prepared/instructor"),
        );
      }
      for (
        const r of p.resources.filter((r: any) =>
          r.deniedProfiles.some((v: string) => ctx.profiles.includes(v))
        )
      ) {
        for (
          const f of await files(
            join(utility, "prepared"),
          )
        ) {
          assert(
            await hash(f) !== r.sha256,
            `DENIED_UTILITY_RESOURCE ${r.source}`,
          );
        }
      }
      await copyTree(
        join(
          ctx.sourceRoot,
          "_extensions/Afonenko-Course-Tools/project-download",
        ),
        join(utility, "_extensions/project-download"),
      );
      const resources: Record<string, any> = {
        starter: { path: "prepared/starter", gitignore: false },
      };
      if (ctx.profiles.includes("full")) {
        resources.instructor = {
          path: "prepared/instructor",
          gitignore: false,
        };
      }
      if (options.fail === "pack") resources.starter.path = "prepared/missing";
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
      // Clear inherited outer-project output/profile variables: this is an independent
      // native default utility with no course/book hooks or content computation.
      await command(Deno.env.get("QUARTO") || "quarto", ["render"], utility, {
        QUARTO_PROJECT_OUTPUT_DIR: "_output",
        QUARTO_PROFILE: "",
        PROJECT_PUBLISH_MEMBER: "1",
      });
      await copyTree(
        join(utility, "_output/_downloads"),
        join(ctx.stage, "tasks/_downloads"),
      );
      await event(ctx, "package-ready", { pdfHash });
      if (options.fail === "late-resource") {
        await Deno.mkdir(join(ctx.stage, "injected"), { recursive: true });
        await Deno.copyFile(
          join(ctx.sourceRoot, "tasks/materials/instructor/README.txt"),
          join(ctx.stage, "injected/renamed.txt"),
        );
      }
    } finally {
      await Deno.remove(utility, { recursive: true });
      await Deno.remove(privatePrint, { recursive: true });
    }
  },
};
