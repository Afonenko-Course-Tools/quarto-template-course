// Synthetic receipt transport; these checks make no native success claim.
import {
  aggregateActualMain,
  assertActualMainPhase,
} from "../../probes/actual-main-contract.ts";
import {
  expected,
  files,
  fixture,
  h,
} from "../../support/actual-main-fixture.ts";
import {
  check,
  expectRefusal,
  type RefusalCase,
} from "../../support/contract-cases.ts";
Deno.test("actual-main receipt: six original labels and required phases", () => {
  check(
    aggregateActualMain(fixture(), expected).totalNativeCases === 6,
    "six original-course labels across two channels",
  );
  for (const phase of ["releases", "late"]) {
    check(assertActualMainPhase(phase) === phase, "required phase refused");
  }
});
for (const phase of ["student", "full", "smoke", "resume", "", "all25"]) {
  Deno.test(`actual-main receipt: reject subset ${JSON.stringify(phase)}`, () => {
    expectRefusal(
      () => assertActualMainPhase(phase),
      `ACTUAL_MAIN_RECEIPT: unsupported subset/phase ${phase}`,
      "only complete phases are accepted",
    );
  });
}
const refusalCases: RefusalCase<any[]>[] = [
  {
    name: "missing required channel/phase",
    goal:
      "Reject missing required channel/phase before accepting native evidence",
    mutate: (x) => x.pop(),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: required both-channel release/late artifact matrix",
  },
  {
    name: "duplicate required artifact",
    goal: "Reject duplicate required artifact before accepting native evidence",
    mutate: (x) => x[3] = structuredClone(x[1]),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: required both-channel release/late artifact matrix",
  },
  {
    name: "failed required job receipt",
    goal: "Reject failed required job receipt before accepting native evidence",
    mutate: (x) => x[0].receipt.status = "failure",
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: required phase did not succeed",
  },
  {
    name: "source head mismatch",
    goal: "Reject source head mismatch before accepting native evidence",
    mutate: (x) => x[0].receipt.templateSource.commit = h(300),
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: wrong Template head/tree",
  },
  {
    name: "missing exact scaffolding bytes",
    goal:
      "Reject missing exact scaffolding bytes before accepting native evidence",
    mutate: (x) => delete x[0].manifest.scaffolding,
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: missing, unsigned or config-mutating test adapter bytes",
  },
  {
    name: "unsigned scaffold source",
    goal: "Reject unsigned scaffold source before accepting native evidence",
    mutate: (x) => x[0].manifest.scaffolding[0].sha256 = h(399, 64),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: missing, unsigned or config-mutating test adapter bytes",
  },
  {
    name: "scaffold mutates author config",
    goal:
      "Reject scaffold mutates author config before accepting native evidence",
    mutate: (x) => x[0].manifest.scaffolding[0].target = "_quarto.yml",
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: missing, unsigned or config-mutating test adapter bytes",
  },
  {
    name: "all artifacts share wrong source bytes",
    goal:
      "Reject all artifacts share wrong source bytes before accepting native evidence",
    mutate: (x) => {
      for (const item of x) {
        item.receipt.templateSource.files["index.qmd"] = h(301, 64);
        item.manifest.templateSource = structuredClone(
          item.receipt.templateSource,
        );
      }
    },
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: Template bytes differ from exact aggregation checkout",
  },
  {
    name: "dirty source",
    goal: "Reject dirty source before accepting native evidence",
    mutate: (x) => x[0].manifest.templateSource.dirty = true,
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: dirty Template source",
  },
  {
    name: "provider ref mismatch",
    goal: "Reject provider ref mismatch before accepting native evidence",
    mutate: (x) => x[0].manifest.companionSources[0].commit = h(302),
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: provider ref core",
  },
  {
    name: "provider tree mismatch",
    goal: "Reject provider tree mismatch before accepting native evidence",
    mutate: (x) => x[0].manifest.companionSources[0].tree = h(303),
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: provider ref core",
  },
  {
    name: "dirty provider",
    goal: "Reject dirty provider before accepting native evidence",
    mutate: (x) => x[0].manifest.companionSources[0].dirty = true,
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: dirty provider core",
  },
  {
    name: "missing package",
    goal: "Reject missing package before accepting native evidence",
    mutate: (x) => x[0].manifest.packages.pop(),
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: wrong package set",
  },
  {
    name: "changed package file map",
    goal: "Reject changed package file map before accepting native evidence",
    mutate: (x) => x[0].manifest.packages[0].files = files(304),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: installed complete file-set/SHA differs",
  },
  {
    name: "changed actual installation",
    goal: "Reject changed actual installation before accepting native evidence",
    mutate: (x) => x[0].manifest.installations[0].files = files(305),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: installed complete file-set/SHA differs",
  },
  {
    name: "missing member installation",
    goal: "Reject missing member installation before accepting native evidence",
    mutate: (x) => x[0].manifest.installations.pop(),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: missing, duplicated or misplaced actual member package proof",
  },
  {
    name: "wrong channel version",
    goal: "Reject wrong channel version before accepting native evidence",
    mutate: (x) => x[0].manifest.versions.quarto = "1.11.5",
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: wrong actual native versions",
  },
  {
    name: "wrong run lineage",
    goal: "Reject wrong run lineage before accepting native evidence",
    mutate: (x) => x[1].receipt.baseline.run.runId = "previous-run",
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: not the current repository/workflow run",
  },
  {
    name: "wrong baseline channel",
    goal: "Reject wrong baseline channel before accepting native evidence",
    mutate: (x) => x[1].receipt.baseline.version = "1.11.5",
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: not the same-channel release artifact",
  },
  {
    name: "changed baseline receipt bytes",
    goal:
      "Reject changed baseline receipt bytes before accepting native evidence",
    mutate: (x) => x[1].receipt.baseline.receiptSha256 = h(306, 64),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: baseline receipt/manifest/archive byte lineage changed",
  },
  {
    name: "changed baseline archive bytes",
    goal:
      "Reject changed baseline archive bytes before accepting native evidence",
    mutate: (x) => x[1].receipt.baseline.publicationArchiveSha256 = h(307, 64),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: baseline receipt/manifest/archive byte lineage changed",
  },
  {
    name: "missing public tree",
    goal: "Reject missing public tree before accepting native evidence",
    mutate: (x) => delete x[0].publication.files.full,
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: complete genuine public archive maps both public trees required",
  },
  {
    name: "empty public tree",
    goal: "Reject empty public tree before accepting native evidence",
    mutate: (x) => x[0].publication.files.full = {},
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: complete genuine public archive maps/full empty",
  },
  {
    name: "private session tree transferred",
    goal:
      "Reject private session tree transferred before accepting native evidence",
    mutate: (x) => {
      x[1].receipt.baseline.transferred.push("owner-session");
      x[1].receipt.baseline.privateStateTransferred = true;
    },
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: private proof/state transfer forbidden",
  },
  {
    name: "private state in public archive map",
    goal:
      "Reject private state in public archive map before accepting native evidence",
    mutate: (x) =>
      x[0].publication.files.student[".project-publish/session.json"] = h(
        308,
        64,
      ),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: complete genuine public archive maps contains private state",
  },
  {
    name: "public archive differs from genuine current output",
    goal:
      "Reject public archive differs from genuine current output before accepting native evidence",
    mutate: (x) => x[0].publication.files.student = files(309),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: public archive differs from genuine released current trees",
  },
  {
    name: "late baseline tree changed",
    goal: "Reject late baseline tree changed before accepting native evidence",
    mutate: (x) => x[1].receipt.baseline.files.student = files(310),
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: baseline trees changed",
  },
  {
    name: "late previous tree differs from imported baseline",
    goal:
      "Reject late previous tree differs from imported baseline before accepting native evidence",
    mutate: (x) => x[1].observations[0].previous.student = files(311),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: late does not start with genuine baseline bytes",
  },
  {
    name: "failed late changed prior output",
    goal:
      "Reject failed late changed prior output before accepting native evidence",
    mutate: (x) => x[1].observations[0].current.student = files(312),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: late failure altered prior publication",
  },
  {
    name: "late temporary public file event",
    goal:
      "Reject late temporary public file event before accepting native evidence",
    mutate: (x) => x[1].observations[0].publicEvents.push({ kind: "create" }),
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: late created temporary public files",
  },
  {
    name: "no genuine baseline success",
    goal: "Reject no genuine baseline success before accepting native evidence",
    mutate: (x) => x[0].observations[1].exit = 1,
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: genuine release failed",
  },
  {
    name: "baseline retains seed bytes",
    goal: "Reject baseline retains seed bytes before accepting native evidence",
    mutate: (x) => x[0].observations[0].current = x[0].observations[0].previous,
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: genuine baseline kept populated seed",
  },
  {
    name: "release chain discontinuity",
    goal: "Reject release chain discontinuity before accepting native evidence",
    mutate: (x) => x[0].observations[1].previous.student = files(313),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: positive release changed other profile",
  },
  {
    name: "success changes opposite profile",
    goal:
      "Reject success changes opposite profile before accepting native evidence",
    mutate: (x) => x[0].observations[0].current.full = files(314),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: positive release changed other profile",
  },
  {
    name: "book source subset",
    goal: "Reject book source subset before accepting native evidence",
    mutate: (x) => x[0].manifest.sourceInputs.full.book = ["book/index.qmd"],
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: original book4/essay5 native source subset or drift",
  },
  {
    name: "essay source subset",
    goal: "Reject essay source subset before accepting native evidence",
    mutate: (x) => x[0].observations[0].ownerInputs.essay = ["essay/index.qmd"],
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: original book4/essay5 native source subset or drift",
  },
  {
    name: "missing native member",
    goal: "Reject missing native member before accepting native evidence",
    mutate: (x) => x[0].observations[0].nativeMembers.pop(),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: all five current native members/PDF required",
  },
  {
    name: "PDF changed to HTML",
    goal: "Reject PDF changed to HTML before accepting native evidence",
    mutate: (x) => x[0].observations[0].nativeMembers.at(-1).format = "html",
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: all five current native members/PDF required",
  },
  {
    name: "late reuses previous attempt",
    goal:
      "Reject late reuses previous attempt before accepting native evidence",
    mutate: (x) =>
      x[1].observations[0].attemptId = x[0].observations[0].attemptId,
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: late reused prior native attempt",
  },
  {
    name: "late reuses previous owner index",
    goal:
      "Reject late reuses previous owner index before accepting native evidence",
    mutate: (x) =>
      x[1].observations[0].ownerIndexes.book.indexHash =
        x[0].observations[0].ownerIndexes.book.indexHash,
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: late reused prior owner permission index",
  },
  {
    name: "late native command returned zero",
    goal:
      "Reject late native command returned zero before accepting native evidence",
    mutate: (x) => x[1].observations[0].exit = 0,
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: late native mutation returned zero",
  },
  {
    name: "unrelated nonzero accepted",
    goal: "Reject unrelated nonzero accepted before accepting native evidence",
    mutate: (x) => x[1].observations[0].refusal.code = "UNRELATED_FAILURE",
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: unrelated/nonobserved nonzero is not the required refusal",
  },
  {
    name: "refusal not observed",
    goal: "Reject refusal not observed before accepting native evidence",
    mutate: (x) => x[1].observations[0].refusal.observed = false,
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: unrelated/nonobserved nonzero is not the required refusal",
  },
  {
    name: "mutation before child finish",
    goal:
      "Reject mutation before child finish before accepting native evidence",
    mutate: (x) =>
      x[1].observations[0].pipeline = [
        "qrc-finished",
        "pdf-address-mutated",
        "child-owners-finished",
      ],
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: late mutation ordering/current boundary wrong",
  },
  {
    name: "wrong mutated path",
    goal: "Reject wrong mutated path before accepting native evidence",
    mutate: (x) =>
      x[1].observations[0].mutation.path = "book/assets/contract.svg",
    expectedRefusal: "ACTUAL_MAIN_RECEIPT: wrong mutation point/address",
  },
  {
    name: "mutation has no byte change",
    goal: "Reject mutation has no byte change before accepting native evidence",
    mutate: (x) =>
      x[1].observations[0].mutation.afterSha256 =
        x[1].observations[0].mutation.beforeSha256,
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: PDF bytes unchanged or not actual current proof",
  },
  {
    name: "author config changed",
    goal: "Reject author config changed before accepting native evidence",
    mutate: (x) => x[0].observations[0].authorConfigs.after = files(315),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: author config changed during attempt",
  },
  {
    name: "config subset before and after",
    goal:
      "Reject config subset before and after before accepting native evidence",
    mutate: (x) => {
      delete x[0].observations[0].authorConfigs.before["book/_quarto.yml"];
      delete x[0].observations[0].authorConfigs.after["book/_quarto.yml"];
    },
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: author config map is not the complete exact authored source",
  },
  {
    name: "configs consistently differ from authored source",
    goal:
      "Reject configs consistently differ from authored source before accepting native evidence",
    mutate: (x) => {
      x[0].observations[0].authorConfigs.before["_quarto.yml"] = h(316, 64);
      x[0].observations[0].authorConfigs.after["_quarto.yml"] = h(316, 64);
    },
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: author config map is not the complete exact authored source",
  },
  {
    name: "chapter changed during attempt",
    goal:
      "Reject chapter changed during attempt before accepting native evidence",
    mutate: (x) =>
      x[0].observations[0].authorInputs.after["book/index.qmd"] = h(317, 64),
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: authored root/chapter bytes changed during attempt",
  },
  {
    name: "chapter subset before and after",
    goal:
      "Reject chapter subset before and after before accepting native evidence",
    mutate: (x) => {
      delete x[0].observations[0].authorInputs
        .before["essay/text/decoding/index.qmd"];
      delete x[0].observations[0].authorInputs
        .after["essay/text/decoding/index.qmd"];
    },
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: author input map differs from original full course checkout",
  },
  {
    name: "chapters consistently differ from authored source",
    goal:
      "Reject chapters consistently differ from authored source before accepting native evidence",
    mutate: (x) => {
      x[0].observations[0].authorInputs.before["book/index.qmd"] = h(318, 64);
      x[0].observations[0].authorInputs.after["book/index.qmd"] = h(318, 64);
    },
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: author input map differs from original full course checkout",
  },
  {
    name: "resumed permission receipt",
    goal: "Reject resumed permission receipt before accepting native evidence",
    mutate: (x) => x[1].receipt.resumedFrom = "old-session",
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: network imports or resumed permission receipt",
  },
  {
    name: "network imports allowed",
    goal: "Reject network imports allowed before accepting native evidence",
    mutate: (x) => x[1].receipt.networkImportsDisabled = false,
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: network imports or resumed permission receipt",
  },
  {
    name: "roles/archive check missing",
    goal: "Reject roles/archive check missing before accepting native evidence",
    mutate: (x) => x[0].observations[0].checked.rolesArchives = false,
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: original roles/archive/QRC/config checks absent",
  },
  {
    name: "labels double-count fixture25",
    goal:
      "Reject labels double-count fixture25 before accepting native evidence",
    mutate: (x) => x[0].receipt.labels[0] = "main-five-student",
    expectedRefusal:
      "ACTUAL_MAIN_RECEIPT: wrong original-course labels or fixture25 double count",
  },
];
for (const scenario of refusalCases) {
  Deno.test(`actual-main receipt: ${scenario.name}`, () => {
    const items = fixture();
    scenario.mutate(items);
    expectRefusal(
      () => aggregateActualMain(items, expected),
      scenario.expectedRefusal,
      scenario.goal,
    );
  });
}
