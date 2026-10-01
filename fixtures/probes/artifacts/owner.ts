// Политика задаётся доверенной fixture, а не выводится из project-download.profiles.
import {
  assert,
  childOrEqual,
  command,
  event,
  hash,
  join,
  policy,
  relative,
  resolve,
  serviceSegments,
} from "./common.ts";
export default {
  async beforeRender(ctx: any) {
    const p = await policy(ctx);
    await event(ctx, "owner-check");
    for (const rule of p.resources) {
      assert(
        await hash(join(ctx.sourceRoot, rule.source)) === rule.sha256,
        `policy/source hash mismatch: ${rule.source}`,
      );
    }
    const denied = [
      ...p.resources.filter((r: any) =>
        r.deniedProfiles.some((v: string) => ctx.profiles.includes(v))
      ),
      // This is a derived test input with keys, never an author-visible resource.
      { source: "_probe/package.json", target: "private fixture input" },
    ];
    // Native inspect expands the authored globs. A returned directory still covers descendants.
    const projects = [
      {
        path: ctx.sourceRoot,
        namespace: "portal-snapshot",
        sourceBase: ctx.sourceRoot,
      },
      ...ctx.members.map((member: any) => ({
        ...member,
        sourceBase: ctx.sourceRoot,
      })),
      // Quarto's outer portal still renders from its original root after pre-render.
      // Inspect it now too: the new attempt directory already exists there.
      { path: ctx.root, namespace: "native-portal", sourceBase: ctx.root },
    ];
    for (const project of projects) {
      assert(
        childOrEqual(project.sourceBase, project.path),
        "member escaped expected source root",
      );
      const inspected = JSON.parse(
        await command(Deno.env.get("QUARTO") || "quarto", [
          "inspect",
          project.path,
          "--profile",
          ctx.profiles.join(","),
        ], project.path),
      );
      for (const selected of inspected.files.resources) {
        const path = resolve(project.path, selected);
        assert(
          !relative(project.path, path).split("/").some((part: string) =>
            serviceSegments.includes(part)
          ),
          `SERVICE_RESOURCE_SELECTION ${selected}`,
        );
      }
      const selected = [
        ...inspected.files.resources,
        ...inspected.files.configResources,
      ].map((v: string) => resolve(project.path, v));
      for (const r of denied) {
        const source = join(project.sourceBase, r.source);
        assert(
          !selected.some((v: string) => childOrEqual(v, source)),
          `DENIED_RESOURCE_SELECTION ${r.source} -> ${r.target}`,
        );
      }
      // Native Pandoc AST of fixture authored inputs. This conservative probe does not
      // claim full Quarto include/visibility/late-computation resource semantics.
      for (const input of inspected.files.input) {
        const ast = JSON.parse(
          await command(Deno.env.get("QUARTO") || "quarto", [
            "pandoc",
            input,
            "--from",
            "markdown",
            "--to",
            "json",
          ], project.path),
        );
        const visit = (node: any) => {
          if (!node || typeof node !== "object") return;
          if (node.t === "Link" || node.t === "Image") {
            const target = node.c[2][0];
            if (
              target && !/^[a-z][a-z0-9+.-]*:/i.test(target) &&
              !target.startsWith("#")
            ) {
              const source = resolve(
                input.slice(0, input.lastIndexOf("/")),
                decodeURIComponent(target.split(/[?#]/)[0]),
              );
              for (const r of denied) {
                assert(
                  source !== join(project.sourceBase, r.source),
                  `DENIED_AUTHORED_LINK ${r.source} -> ${r.target}`,
                );
              }
            }
          }
          for (const v of Object.values(node)) {
            if (Array.isArray(v)) v.forEach(visit);
            else visit(v);
          }
        };
        visit(ast.blocks);
      }
    }
    await event(ctx, "owner-checked");
  },
};
