import { dirname, fromFileUrl, join } from "stdlib/path";
import { parseImports } from "../_extensions/reference-catalog/infrastructure/import-config.ts";
import { importTargets } from "../_extensions/reference-catalog/infrastructure/imports.ts";
const root = dirname(dirname(fromFileUrl(import.meta.url)));
const fixture = await Deno.readTextFile(
  join(root, "fixtures/external-reference.json"),
);
let requests = 0;
const server = Deno.serve(
  { hostname: "127.0.0.1", port: 0, onListen() {} },
  () => {
    requests++;
    return new Response(fixture, {
      headers: { "content-type": "application/json" },
    });
  },
);
try {
  const imports = parseImports(
    {
      os: {
        source: `http://127.0.0.1:${server.addr.port}/reference-catalog.json`,
        namespace: "book",
        "base-url": "https://example.edu/os/",
        style: "external",
      },
    },
    root,
    ["book", "lectures", "practice", "essay"],
  );
  const targets = await importTargets(imports);
  if (
    requests !== 1 || targets.length !== 1 ||
    targets[0].sourceTitle !== "Операционные системы" ||
    targets[0].defaultStyle !== "external"
  ) {
    throw new Error(
      "HTTP-источник не сохранил цель и оформление внешней ссылки",
    );
  }
  console.log("Проверка HTTP-источника каталога пройдена");
} finally {
  await server.shutdown();
}
