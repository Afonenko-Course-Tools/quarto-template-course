import { assert, capture, command, parseXml, sha256, text } from "./helpers.ts";
import { fixture, ignored, search } from "./run.ts";
import "./exports.ts";
import "./lifecycle.ts";
import "./preview.ts";

// Imports must be inert: the acceptance CLIs run only as main modules.
const root = await Deno.makeTempDir({ prefix: "native-helper-test-" });
try {
  await command(["--version"], root);
  const version = await capture(["--version"], root);
  assert(version.success && /^\d+\.\d+\.\d+/.test(text(version.stdout)));
  assert(ignored("_site-student") && ignored("thing_files") && ignored(".git"));
  assert(!ignored("_extensions") && !ignored("index.qmd"));
  assert(
    await sha256(new TextEncoder().encode("abc")) ===
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  const xml = parseXml(
    '<?xml version="1.0"?><quiz><question type="essay"><questiontext><text><![CDATA[<p>A & B</p>]]></text><file path="/a/" name="x&amp;y.png"> YWJj\n </file></questiontext></question><question type="multichoice"><answer fraction="100"/><answer fraction="0"/></question></quiz>',
  );
  assert(xml.name === "quiz" && xml.children.length === 2);
  assert(xml.children[0].children[0].children[0].text === "<p>A & B</p>");
  assert(xml.children[0].children[0].children[1].attributes.name === "x&y.png");
  for (
    const invalid of [
      "<quiz><question></quiz>",
      "<quiz><question>",
      "<quiz/><quiz/>",
      '<quiz broken="x></quiz>',
      "<quiz>A & B</quiz>",
      "<quiz>&#0;</quiz>",
      "<quiz>\u0000</quiz>",
      '<quiz a="1" a="2"/>',
      "<quiz><!-- invalid--comment --></quiz>",
      "<quiz><![CDATA[unclosed</quiz>",
      '<quiz/><?xml version="1.0"?>',
      "<!DOCTYPE quiz><quiz/>",
    ]
  ) {
    let rejected = false;
    try {
      parseXml(invalid);
    } catch {
      rejected = true;
    }
    assert(rejected, `Malformed XML accepted: ${invalid}`);
  }
  const site = `${root}/_site-student`;
  await Deno.mkdir(`${site}/tasks`, { recursive: true });
  await Deno.writeTextFile(`${site}/index.html`, "root");
  await Deno.writeTextFile(`${site}/tasks/task.html`, "task");
  await Deno.writeTextFile(
    `${site}/search.json`,
    JSON.stringify([{ href: "index.html#x" }, { href: "tasks/task.html" }]),
  );
  await search(root, "neutral", "student");
  await Deno.remove(`${site}/tasks/task.html`);
  let staleRejected = false;
  try {
    await search(root, "neutral", "student");
  } catch {
    staleRejected = true;
  }
  assert(staleRejected, "Stale search rows must fail acceptance");
  // Persistent workspaces must reuse an existing tree without rewriting it.
  await Deno.mkdir(`${root}/neutral`);
  await Deno.writeTextFile(`${root}/neutral/sentinel`, "keep");
  assert(await fixture("neutral", root) === `${root}/neutral`);
  assert(await Deno.readTextFile(`${root}/neutral/sentinel`) === "keep");
  console.log(
    "PASS inert imports, exclusions, Body SHA256, XML structure, stale search rejection and persistent fixtures",
  );
} finally {
  await Deno.remove(root, { recursive: true });
}
