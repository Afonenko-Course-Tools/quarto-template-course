// Portable public metadata only; complete manifests are covered by receipt/split cases.
import {
  assertMainRunnerPhase,
  verifyPublicBaseline,
} from "../../probes/actual-main-split-contract.ts";
import { expected } from "../../support/actual-main-fixture.ts";
import { check, expectRefusal } from "../../support/contract-cases.ts";
for (const phase of ["releases", "student-release", "full-release", "late"]) {
  Deno.test(`actual-main public: accept phase ${phase}`, () => {
    check(assertMainRunnerPhase(phase) === phase, "required phase refused");
  });
}
for (const phase of ["student", "full", "smoke", "resume", "all25", ""]) {
  Deno.test(`actual-main public: reject subset ${JSON.stringify(phase)}`, () => {
    expectRefusal(
      () => assertMainRunnerPhase(phase),
      `ACTUAL_MAIN_SPLIT: unsupported finite phase/subset ${phase}`,
      "accept only complete runner phases",
    );
  });
}
const malformed = [
  {
    name: "null baseline",
    value: null,
    expectedRefusal: "ACTUAL_MAIN_SPLIT: public baseline",
  },
  {
    name: "empty baseline",
    value: {},
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: public baseline: unknown/private/missing fields",
  },
  {
    name: "private portable baseline",
    value: {
      protocol: 1,
      status: "success",
      phase: "student-release",
      manifest: {},
      published: {
        archiveSha256: "1".padStart(64, "0"),
        files: {
          student: {
            "index.html": "1".padStart(64, "0"),
            "deep/a.txt": "2".padStart(64, "0"),
          },
          full: {
            "index.html": "1".padStart(64, "0"),
            "deep/a.txt": "2".padStart(64, "0"),
          },
        },
      },
      ownerSession: "forbidden",
    },
    expectedRefusal:
      "ACTUAL_MAIN_SPLIT: public baseline: unknown/private/missing fields",
  },
];
for (const scenario of malformed) {
  Deno.test(`actual-main public: reject ${scenario.name}`, () => {
    expectRefusal(
      () =>
        verifyPublicBaseline(
          scenario.value,
          "student-release",
          "1.10.18",
          expected,
          {},
        ),
      scenario.expectedRefusal,
      "reject malformed/private portable metadata",
    );
  });
}
