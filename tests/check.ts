import { resolve } from "stdlib/path";
import { checkNeutralPublication } from "./check-neutral.ts";
const root = resolve(Deno.args[0] || ".");
console.log(
  `PASS neutral public assets, privacy, downloads, catalog and ${await checkNeutralPublication(
    root,
  )} local links`,
);
