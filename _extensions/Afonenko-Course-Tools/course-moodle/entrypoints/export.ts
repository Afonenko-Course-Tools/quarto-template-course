import { exportMoodle } from "../application/export.ts";
const [source, binding, output] = Deno.args;
if (!source || !binding || !output) {
  throw Error("usage: export.ts package.json binding.json bank.xml");
}
const xml = await exportMoodle(
  JSON.parse(await Deno.readTextFile(source)),
  JSON.parse(await Deno.readTextFile(binding)),
);
await Deno.writeTextFile(output, xml);
