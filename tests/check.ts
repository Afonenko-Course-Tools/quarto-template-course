import { dirname, fromFileUrl } from "stdlib/path";
import { checkNeutralPublication } from "./check-neutral.ts";
const root = dirname(dirname(fromFileUrl(import.meta.url)));
const quarto = Deno.env.get("QUARTO") || "quarto";
if (!Deno.args.includes("--skip-render")) {
  for (const profile of ["full", "student"]) {
    for (
      const target of [undefined, "examples/cloud", "examples/prairielearn"]
    ) {
      const result = await new Deno.Command(quarto, {
        args: [
          "render",
          ...(target ? [target] : []),
          "--profile",
          profile,
          "--fail-if-warnings",
        ],
        cwd: root,
        stdout: "inherit",
        stderr: "inherit",
      }).output();
      if (!result.success) {
        throw new Error(`Не удалось собрать ${target || "курс"}/${profile}`);
      }
    }
  }
}
const links = await checkNeutralPublication(root);
console.log(
  `Проверены student/full, пять нейтральных частей, канонические задания, QRC, ручные материалы, изоляция преподавательских данных; ${links} локальных ссылок.`,
);
