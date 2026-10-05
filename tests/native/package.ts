import { resolve, toFileUrl } from "stdlib/path";
const root = resolve(Deno.args[0]), view = Deno.args[1];
if (!["student", "full"].includes(view)) {
  throw Error("Explicit audience required");
}
const core = (path: string) =>
  import(
    toFileUrl(`${root}/_extensions/Afonenko-Course-Tools/course-core/${path}`)
      .href
  );
const run = await (await core("infrastructure/native-run.ts")).loadNativeRun(
  root,
  { view, profiles: [view] },
);
const release = (await core("domain/release.ts")).assembleRelease(
  run.documents.map((d: any) => d.source),
  run.documents,
  run.adapters,
  { view, profiles: [view] },
);
const bodies = await (await core("body-export/producer.ts")).buildBodies(
  release,
  { projectRoot: root, includeClosed: view === "full" },
);
await Deno.writeTextFile(
  `${root}/_generated/public-package.json`,
  JSON.stringify(bodies.publicPackage),
);
await Deno.writeTextFile(
  `${root}/_generated/teacher-package.json`,
  JSON.stringify(bodies.package),
);
console.log(`PASS native ${view} Body package`);
