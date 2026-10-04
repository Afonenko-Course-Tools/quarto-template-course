// Synthetic evidence transport only; never a native course success claim.
import {
  ACTUAL_MAIN_INPUTS,
  ACTUAL_MAIN_INSTALLATIONS,
  ACTUAL_MAIN_MEMBERS,
} from "../probes/actual-main-contract.ts";
export const h = (n: number, size = 40) => n.toString(16).padStart(size, "0");
export const files = (n: number) => ({
  "index.html": h(n, 64),
  "deep/a.txt": h(n + 1, 64),
  "handouts/contracts.pdf": h(n + 2, 64),
});
export const expected = {
  template: {
    commit: h(1),
    tree: h(2),
    files: Object.fromEntries(
      [
        "_quarto.yml",
        "_quarto-student.yml",
        "book/_quarto.yml",
        "essay/_quarto.yaml",
        "index.qmd",
        ...ACTUAL_MAIN_INPUTS.book,
        ...ACTUAL_MAIN_INPUTS.essay,
        ...["prepare", "finish", "verify", "state", "verification"].map((p) =>
          `fixtures/probes/actual-main/${p}.ts`
        ),
      ].map((p, i) => [p, h(10 + i, 64)]),
    ),
  },
  providers: Object.fromEntries(
    ["core", "download", "publisher", "qrc"].map((
      name,
      i,
    ) => [name, { commit: h(30 + i), tree: h(40 + i) }]),
  ),
  run: { repository: "synthetic/template", runId: "100" },
  lateRefusal: "SYNTHETIC_CURRENT_ADDRESS_CHANGED",
};
export function fixture() {
  const configs = Object.fromEntries(
    Object.entries(expected.template.files).filter(([p]) =>
      /(^|\/)\_quarto[^/]*\.ya?ml$/.test(p)
    ),
  );
  const sources = Object.fromEntries(
    ["index.qmd", ...ACTUAL_MAIN_INPUTS.book, ...ACTUAL_MAIN_INPUTS.essay].map((
      p,
    ) => [p, expected.template.files[p]]),
  );
  return structuredClone(["1.10.18", "1.11.5"].flatMap((version, channel) => {
    const source = { ...expected.template, dirty: false };
    const packages = [
      "course-core",
      "course-navigation",
      "course-presentation",
      "project-download",
      "project-publish",
      "reference-catalog",
    ].map((name, i) => ({
      name,
      archiveSha256: h(50 + i, 64),
      files: { "payload.txt": h(60 + i, 64) },
    }));
    const manifest = (phase: string) => ({
      protocol: 1,
      phase,
      templateSource: source,
      run: { ...expected.run, runAttempt: "1" },
      versions: { quarto: version, cue: "cue version v0.17.1" },
      companionSources: Object.entries(expected.providers).map(([name, r]) => ({
        name,
        ...r,
        dirty: false,
      })),
      packages,
      installations: ACTUAL_MAIN_INSTALLATIONS.map((i) => ({
        ...i,
        files: packages.find((p) => p.name === i.name)!.files,
      })),
      sourceInputs: { student: ACTUAL_MAIN_INPUTS, full: ACTUAL_MAIN_INPUTS },
      members: ACTUAL_MAIN_MEMBERS,
      scaffolding: ["prepare", "finish", "verify", "state", "verification"].map(
        (p) => ({
          source: `fixtures/probes/actual-main/${p}.ts`,
          target: `_publication/${p}.ts`,
          sha256:
            expected.template.files[`fixtures/probes/actual-main/${p}.ts`],
        }),
      ),
    });
    let current = { student: files(100 + channel), full: files(110 + channel) };
    const observations = ["student", "full"].map((profile, i) => {
      const previous = structuredClone(current);
      current = { ...current, [profile]: files(120 + channel * 5 + i) };
      return {
        label: `actual-main-${profile}`,
        profile,
        attemptId: `attempt-${channel}-${i}`,
        exit: 0,
        previous,
        current: structuredClone(current),
        authorConfigs: {
          before: structuredClone(configs),
          after: structuredClone(configs),
        },
        authorInputs: {
          before: structuredClone(sources),
          after: structuredClone(sources),
        },
        publicEvents: [{ kind: "rename" }],
        nativeMembers: ACTUAL_MAIN_MEMBERS.map((m) => ({
          ...m,
          output: `/current/${channel}/${i}/${m.namespace}`,
        })),
        ownerInputs: ACTUAL_MAIN_INPUTS,
        pipeline: [
          "qrc-finished",
          "child-owners-finished",
          "publication-verified",
        ],
        ownerIndexes: {
          book: { indexHash: h(160 + i + channel * 10, 64) },
          essay: { indexHash: h(170 + i + channel * 10, 64) },
        },
        pdf: {
          path: "handouts/contracts.pdf",
          sha256:
            current[profile as "student" | "full"]["handouts/contracts.pdf"],
        },
        checked: {
          rolesArchives: true,
          qrcSearchLinks: true,
          sourceConfigPreserved: true,
          allFive: true,
        },
      };
    });
    const receipt = (phase: string, labels: string[]) => ({
      protocol: 1,
      status: "success",
      phase,
      version,
      templateSource: source,
      run: { ...expected.run, runAttempt: "1" },
      labels,
      caseCount: labels.length,
      caseMultiplicity: Object.fromEntries(labels.map((p) => [p, 1])),
      networkImportsDisabled: true,
      resumedFrom: null,
    });
    const publication = {
      archiveSha256: h(210 + channel, 64),
      files: structuredClone(current),
    };
    const release = {
      version,
      phase: "releases",
      manifest: manifest("releases"),
      receipt: {
        ...receipt("releases", ["actual-main-student", "actual-main-full"]),
        publication,
      },
      observations,
      receiptSha256: h(220 + channel, 64),
      manifestSha256: h(230 + channel, 64),
      publication,
    };
    const late = {
      version,
      phase: "late",
      manifest: manifest("late"),
      receipt: {
        ...receipt("late", ["actual-main-late-current-address"]),
        expectedFailure: expected.lateRefusal,
        baseline: {
          artifactName: `actual-main-${version}-releases`,
          run: { ...expected.run, runAttempt: "1" },
          version,
          receiptSha256: release.receiptSha256,
          manifestSha256: release.manifestSha256,
          publicationArchiveSha256: publication.archiveSha256,
          files: structuredClone(current),
          transferred: ["student-publication", "full-publication"],
          privateStateTransferred: false,
        },
      },
      observations: [{
        ...structuredClone(observations[0]),
        label: "actual-main-late-current-address",
        attemptId: `late-${channel}`,
        exit: 1,
        previous: structuredClone(current),
        current: structuredClone(current),
        publicEvents: [],
        pipeline: [
          "qrc-finished",
          "child-owners-finished",
          "pdf-address-mutated",
        ],
        ownerIndexes: {
          book: { indexHash: h(250 + channel, 64) },
          essay: { indexHash: h(260 + channel, 64) },
        },
        mutation: {
          kind: "mounted-pdf-byte-drift",
          path: "handouts/contracts.pdf",
          beforeSha256: observations[0].pdf.sha256,
          afterSha256: h(280 + channel, 64),
          point: "after-child-finish-before-navigation-finish",
        },
        refusal: { code: expected.lateRefusal, observed: true },
      }],
    };
    return [release, late];
  }));
}

import { publicBaseline } from "../probes/actual-main-split-contract.ts";
const splitHash = (n: number) => n.toString(16).padStart(64, "0");
export function splitFixture(): any[] {
  const old: any[] = fixture(), result: any[] = [];
  for (let channel = 0; channel < 2; channel++) {
    const release = old[channel * 2],
      legacyLate = old[channel * 2 + 1],
      version = release.version;
    const one = (phase: string, i: number) => ({
      version,
      phase,
      manifest: { ...structuredClone(release.manifest), phase },
      receipt: {
        ...structuredClone(release.receipt),
        phase,
        labels: [`actual-main-${i ? "full" : "student"}`],
        caseCount: 1,
        caseMultiplicity: { [`actual-main-${i ? "full" : "student"}`]: 1 },
        publication: {
          archiveSha256: splitHash(400 + channel * 10 + i),
          files: structuredClone(release.observations[i].current),
        },
      },
      observations: [structuredClone(release.observations[i])],
      receiptSha256: splitHash(410 + channel * 10 + i),
      manifestSha256: splitHash(420 + channel * 10 + i),
      publicBaselineSha256: splitHash(430 + channel * 10 + i),
    });
    const student: any = one("student-release", 0),
      full: any = one("full-release", 1);
    student.publicBaseline = publicBaseline(student, expected);
    const lineage = (parent: any, phase: string) => ({
      artifactName: `actual-main-public-${version}-${phase}`,
      publicReceiptSha256: parent.publicBaselineSha256,
      publicationArchiveSha256: parent.receipt.publication.archiveSha256,
      files: structuredClone(parent.receipt.publication.files),
      transferred: ["student-publication", "full-publication"],
      privateStateTransferred: false,
    });
    full.receipt.baseline = lineage(student, "student-release");
    full.publicBaseline = publicBaseline(full, expected, {
      value: student.publicBaseline,
      sha256: student.publicBaselineSha256,
    });
    const late: any = {
      ...structuredClone(legacyLate),
      receiptSha256: splitHash(450 + channel),
      manifestSha256: splitHash(460 + channel),
    };
    late.receipt.baseline = lineage(full, "full-release");
    result.push(student, full, late);
  }
  return result;
}
