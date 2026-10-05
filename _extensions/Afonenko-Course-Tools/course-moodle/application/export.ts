import { create } from "../vendor/xmlbuilder2.js";
import {
  command,
  fail,
  resourceTargets,
  validateBody,
  validatePackage,
  verifyResources,
} from "../infrastructure/transport.ts";
export async function exportMoodle(p: any, binding: any): Promise<string> {
  validatePackage(p);
  if (
    typeof binding?.defaultGrade !== "number" ||
    !Number.isFinite(binding.defaultGrade) || binding.defaultGrade <= 0 ||
    typeof binding.shuffle !== "boolean"
  ) {
    fail("explicit defaultGrade and shuffle binding required");
  }
  for (const q of p.questions) {
    if (!["manual", "single-choice"].includes(q.answerType)) {
      fail("unsupported answer type " + q.answerType);
    }
    validateBody(q.condition, p.resources);
    validateBody(q.publicAnswer, p.resources);
    if (
      q.answerType === "single-choice" &&
      (q.publicAnswer.length !== 1 || q.publicAnswer[0]?.t !== "BulletList" ||
        !Array.isArray(q.publicAnswer[0]?.c) ||
        !Number.isInteger(q.closedKey?.correct) || q.closedKey.correct < 0 ||
        q.closedKey.correct >= q.publicAnswer[0].c.length ||
        q.publicAnswer[0].c.length < 2 ||
        q.publicAnswer[0].c.some((choice: any) =>
          !Array.isArray(choice) || !choice.length ||
          choice.some((node: any) => !node || typeof node.t !== "string")
        ))
    ) fail("invalid single-choice mapping");
  }
  await verifyResources(p);
  const html = async (blocks: any[]) => {
    const b = structuredClone(blocks);
    const map = (v: any) => {
      if (!v || typeof v !== "object") return;
      if (v.t === "Header") v.c[1][0] = "";
      if (v.t === "Image" || v.t === "Link") {
        const r = p.resources.find((r: any) => r.target === v.c[2][0]);
        if (r) v.c[2][0] = "@@PLUGINFILE@@/" + r.target;
      }
      for (const x of Object.values(v)) {
        if (Array.isArray(x)) x.forEach(map);
        else if (typeof x === "object") map(x);
      }
    };
    map(b);
    return await command(
      "quarto",
      ["pandoc", "--from=json", "--to=html5", "--mathml"],
      JSON.stringify({
        "pandoc-api-version": p.apiVersion,
        meta: {},
        blocks: b,
      }),
    );
  };
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("quiz");
  for (const q of p.questions) {
    const node = root.ele("question", {
      type: q.answerType === "manual" ? "essay" : "multichoice",
    });
    node.ele("name").ele("text").txt(q.key);
    node.ele("idnumber").txt(q.key);
    node.ele("defaultgrade").txt(String(binding.defaultGrade));
    node.ele("penalty").txt("0");
    const text = node.ele("questiontext", { format: "html" });
    text.ele("text").txt(await html(q.condition));
    const selectedTargets = resourceTargets([q.condition, q.publicAnswer]);
    for (const r of p.resources) {
      if (selectedTargets.has(r.target)) {
        const parts = r.target.split("/");
        text.ele("file", {
          name: parts.pop(),
          path: "/" + parts.join("/") + "/",
          encoding: "base64",
        }).txt(r.data);
      }
    }
    if (q.answerType === "manual") {
      node.ele("responseformat").txt("editor");
      node.ele("responserequired").txt("1");
      node.ele("responsefieldlines").txt("8");
      node.ele("attachments").txt("0");
      node.ele("attachmentsrequired").txt("0");
    } else {
      node.ele("single").txt("true");
      node.ele("shuffleanswers").txt(binding.shuffle ? "1" : "0");
      node.ele("answernumbering").txt("abc");
      for (const [i, choice] of q.publicAnswer[0].c.entries()) {
        node.ele("answer", {
          fraction: i === q.closedKey.correct ? "100" : "0",
          format: "html",
        }).ele("text").txt(await html(choice));
      }
    }
  }
  return root.end({ prettyPrint: true }) + "\n";
}
