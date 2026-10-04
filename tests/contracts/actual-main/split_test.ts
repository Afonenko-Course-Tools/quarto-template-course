// Six-job public-only transport; these checks make no native success claim.
import {
  aggregateSplitActualMain,
  verifyPublicBaseline,
} from "../../probes/actual-main-split-contract.ts";
import {
  expected,
  splitFixture as fixture,
} from "../../support/actual-main-fixture.ts";
import {
  check,
  expectRefusal,
  type RefusalCase,
} from "../../support/contract-cases.ts";
const h = (n: number) => n.toString(16).padStart(64, "0");
Deno.test("actual-main split: complete six-job public-only matrix", () => {
  check(
    aggregateSplitActualMain(fixture(), expected).totalNativeCases === 6,
    "required six labels",
  );
});
Deno.test("actual-main split: complete portable student baseline", () => {
  const base = fixture()[0],
    maps = Object.fromEntries(
      base.manifest.packages.map((p: any) => [p.name, p.files]),
    );
  verifyPublicBaseline(
    base.publicBaseline,
    "student-release",
    base.version,
    expected,
    maps,
  );
});
const refusalCases: RefusalCase<any[]>[] = [
  {
    name: "missing original job",
    goal: "Reject missing original job before accepting native evidence",
    mutate: (x) => x.pop(),
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: required six original native jobs/receipts",
  },
  {
    name: "duplicate original job",
    goal: "Reject duplicate original job before accepting native evidence",
    mutate: (x) => x[5] = structuredClone(x[2]),
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: required six original native jobs/receipts",
  },
  {
    name: "old compound phase is not a split matrix",
    goal:
      "Reject old compound phase is not a split matrix before accepting native evidence",
    mutate: (x) => x[0].phase = "releases",
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: required six original native jobs/receipts",
  },
  {
    name: "failed actual phase",
    goal: "Reject failed actual phase before accepting native evidence",
    mutate: (x) => x[0].receipt.status = "failure",
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: required phase did not succeed",
  },
  {
    name: "source bytes forged consistently",
    goal:
      "Reject source bytes forged consistently before accepting native evidence",
    mutate: (x) => {
      for (const e of x) {
        e.receipt.templateSource.files["index.qmd"] = h(900);
        e.manifest.templateSource.files["index.qmd"] = h(900);
      }
    },
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: Template bytes differ from exact aggregation checkout",
  },
  {
    name: "current provider ref changed",
    goal:
      "Reject current provider ref changed before accepting native evidence",
    mutate: (x) => x[0].manifest.companionSources[0].commit = "0".repeat(40),
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: provider ref core",
  },
  {
    name: "member install missing",
    goal: "Reject member install missing before accepting native evidence",
    mutate: (x) => x[0].manifest.installations.pop(),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: missing, duplicated or misplaced actual member package proof",
  },
  {
    name: "single phase executes duplicate labels",
    goal:
      "Reject single phase executes duplicate labels before accepting native evidence",
    mutate: (x) => x[0].receipt.labels.push("actual-main-full"),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: wrong original-course labels or fixture25 double count",
  },
  {
    name: "full does not import genuine student tree",
    goal:
      "Reject full does not import genuine student tree before accepting native evidence",
    mutate: (x) => x[1].observations[0].previous.student["index.html"] = h(901),
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: positive changed opposite public profile",
  },
  {
    name: "public full lineage receipt changed",
    goal:
      "Reject public full lineage receipt changed before accepting native evidence",
    mutate: (x) => x[1].publicBaseline.parent.publicReceiptSha256 = h(902),
    expectedRefusal: "ACTUAL_MAIN_SPLIT: full imported wrong public lineage",
  },
  {
    name: "public manifest has permission handle",
    goal:
      "Reject public manifest has permission handle before accepting native evidence",
    mutate: (x) => x[0].publicBaseline.manifest.preparedOwner = {},
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: safe source/install manifest: unknown/private/missing fields",
  },
  {
    name: "public baseline has private index",
    goal:
      "Reject public baseline has private index before accepting native evidence",
    mutate: (x) => x[0].publicBaseline.ownerIndexes = {},
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: public baseline: unknown/private/missing fields",
  },
  {
    name: "public nested source has permission payload",
    goal:
      "Reject public nested source has permission payload before accepting native evidence",
    mutate: (x) => x[0].publicBaseline.manifest.templateSource.session = {},
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: safe source: unknown/private/missing fields",
  },
  {
    name: "public package carries permission metadata",
    goal:
      "Reject public package carries permission metadata before accepting native evidence",
    mutate: (x) => x[0].publicBaseline.manifest.packages[0].capture = {},
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: safe package: unknown/private/missing fields",
  },
  {
    name: "public map carries private owner dir",
    goal:
      "Reject public map carries private owner dir before accepting native evidence",
    mutate: (x) =>
      x[0].publicBaseline.published.files
        .student[".course-owner/preparation.json"] = h(903),
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: private state is not public retention input",
  },
  {
    name: "public baseline differs from actual native receipt",
    goal:
      "Reject public baseline differs from actual native receipt before accepting native evidence",
    mutate: (x) => x[0].publicBaseline.nativeReceiptSha256 = h(904),
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: public lineage differs from actual completed job",
  },
  {
    name: "missing raw baseline receipt digest",
    goal:
      "Reject missing raw baseline receipt digest before accepting native evidence",
    mutate: (x) => delete x[0].publicBaselineSha256,
    expectedRefusal: "ACTUAL_MAIN_SPLIT: public baseline receipt SHA",
  },
  {
    name: "wrong imported channel",
    goal: "Reject wrong imported channel before accepting native evidence",
    mutate: (x) =>
      x[1].receipt.baseline.artifactName =
        "actual-main-public-1.11.5-student-release",
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: wrong same-run/channel/source public input or private proof transfer",
  },
  {
    name: "full imported private state",
    goal: "Reject full imported private state before accepting native evidence",
    mutate: (x) => x[1].receipt.baseline.privateStateTransferred = true,
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: wrong same-run/channel/source public input or private proof transfer",
  },
  {
    name: "late imports old native artifact instead public",
    goal:
      "Reject late imports old native artifact instead public before accepting native evidence",
    mutate: (x) =>
      x[2].receipt.baseline.artifactName =
        "actual-main-native-1.10.18-full-release",
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: wrong same-run/channel/source public input or private proof transfer",
  },
  {
    name: "late starts different genuine maps",
    goal:
      "Reject late starts different genuine maps before accepting native evidence",
    mutate: (x) => x[2].observations[0].previous.full["index.html"] = h(905),
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: late baseline is not genuine public bytes",
  },
  {
    name: "unrelated late nonzero",
    goal: "Reject unrelated late nonzero before accepting native evidence",
    mutate: (x) => x[2].observations[0].refusal.code = "UNRELATED",
    expectedRefusal: "ACTUAL_MAIN_SPLIT: unrelated/nonobserved native refusal",
  },
  {
    name: "late reused current owner index",
    goal:
      "Reject late reused current owner index before accepting native evidence",
    mutate: (x) =>
      x[2].observations[0].ownerIndexes.book.indexHash =
        x[0].observations[0].ownerIndexes.book.indexHash,
    expectedRefusal: "ACTUAL_MAIN_SPLIT: late permission index reused",
  },
  {
    name: "late mutated before child finish",
    goal:
      "Reject late mutated before child finish before accepting native evidence",
    mutate: (x) =>
      x[2].observations[0].pipeline = [
        "qrc-finished",
        "pdf-address-mutated",
        "child-owners-finished",
      ],
    expectedRefusal: "ACTUAL_MAIN_SPLIT: wrong current mutation ordering",
  },
  {
    name: "late changed prior publication",
    goal:
      "Reject late changed prior publication before accepting native evidence",
    mutate: (x) => x[2].observations[0].current.student["index.html"] = h(906),
    expectedRefusal: "ACTUAL_MAIN_SPLIT: late altered prior publications",
  },
  {
    name: "temporary public late events",
    goal:
      "Reject temporary public late events before accepting native evidence",
    mutate: (x) => x[2].observations[0].publicEvents.push({ kind: "create" }),
    expectedRefusal: "ACTUAL_MAIN_SPLIT: late created temporary public files",
  },
  {
    name: "unknown alternate completed labels",
    goal:
      "Reject unknown alternate completed labels before accepting native evidence",
    mutate: (x) =>
      x[1].publicBaseline.completed.labels[0] = "main-five-student",
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: not the required completed public labels",
  },
  {
    name: "positive attempts reused",
    goal: "Reject positive attempts reused before accepting native evidence",
    mutate: (x) =>
      x[1].publicBaseline.completed.attempts.full =
        x[1].publicBaseline.completed.attempts.student,
    expectedRefusal: "ACTUAL_MAIN_SPLIT: positive native attempt reused",
  },
  {
    name: "wrong actual native input coverage",
    goal:
      "Reject wrong actual native input coverage before accepting native evidence",
    mutate: (x) => x[1].manifest.sourceInputs.student.essay.pop(),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: original book4/essay5 native source subset or drift",
  },
  {
    name: "private state transfer fields added",
    goal:
      "Reject private state transfer fields added before accepting native evidence",
    mutate: (x) => x[2].receipt.baseline.privateProof = {},
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: imported public lineage: unknown/private/missing fields",
  },
  {
    name: "completed public PDF omitted",
    goal:
      "Reject completed public PDF omitted before accepting native evidence",
    mutate: (x) =>
      delete x[0].publicBaseline.published.files
        .student["handouts/contracts.pdf"],
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: positive archive differs from complete current trees",
  },
];
for (const scenario of refusalCases) {
  Deno.test(`actual-main split: ${scenario.name}`, () => {
    const items = fixture();
    scenario.mutate(items);
    expectRefusal(
      () => aggregateSplitActualMain(items, expected),
      scenario.expectedRefusal,
      scenario.goal,
    );
  });
}
