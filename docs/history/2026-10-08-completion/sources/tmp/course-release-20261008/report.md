# One-off release preparation, 2026-10-08

Prepared only `/tmp/course-release-20261008`; owner repositories, examples, documentation, historical root evidence and original helpers were not modified. No network calls, builds, pushes, CI, merges, draft creation or publication were executed. The scripts are ephemeral copies/adaptations of the existing helpers, not a new runtime or dependency resolver.

## Provenance

Sources read: `/home/tolya/course-tools/START-CODEX.md`; Core linear plan steps 12–15; producer Taskfiles/build.ts/build-info.ts; template Taskfile asset names and existing site checker.

Original helper byte hashes, rechecked unchanged:

| Original source | SHA-256 |
|---|---|
| `/home/tolya/course-tools/local-tools/publish-verified-release.py` | `48f0352c414a2925b29b2e1af9ac5fc0cb54570f6e196e1120eb605915998062` |
| `/home/tolya/course-tools/local-tools/build-verified-demo.py` | `c544c7db6e6af46d25e07163895d13a6df3c2cb318066b77ed33547c0a3d4c92` |

Planned versions are explicit operation inputs, not statements that releases exist: Core `v4.0.0`; Publisher `v5.0.0`; QRC `v3.0.0`; Print `v0.3.0`; Moodle `v0.3.0`; PrairieLearn `v3.0.0`; Cloud `v3.0.0`; Download `v2.0.0`. Demo tag is `demo-20261008`.

## Exact usage

Use full verified lowercase 40-hex SHAs from clean merged `main`. `<...>` below must be replaced by actual values. Keep `--inspect` for local non-mutating preview; omit it only after root final gates authorize execution.

Compact extension preview/publication, repeated separately for all eight planned repositories and versions:

```bash
python3 /tmp/course-release-20261008/publish-verified-release.py quarto-course v4.0.0 <CORE_SHA> --inspect
```

Each extension uses tracked `_extensions`, README and LICENSE only, from `git archive` of that verified SHA. It checks all descriptor versions, installs the local compact tarball with normal `quarto add`, and compares installed descriptor bytes to clean source. Caller remains responsible for owner PR/CI/merged-SHA and regression gates. The helper does not assert CI passed in release notes.

Native build examples:

```bash
python3 /tmp/course-release-20261008/build-verified-demo.py core <CORE_SHA> --release quarto-course=v4.0.0@<CORE_SHA> --quarto-version <EXACT_QUARTO_VERSION> --inspect
python3 /tmp/course-release-20261008/build-verified-demo.py composition <PUBLISHER_SHA> --release quarto-project-publish=v5.0.0@<PUBLISHER_SHA> --release quarto-reference-catalog=v3.0.0@<QRC_SHA> --quarto-version <EXACT_QUARTO_VERSION> --inspect
python3 /tmp/course-release-20261008/build-verified-demo.py qrc <QRC_SHA> --release quarto-reference-catalog=v3.0.0@<QRC_SHA> --release quarto-project-publish=v5.0.0@<PUBLISHER_SHA> --quarto-version <EXACT_QUARTO_VERSION> --inspect
python3 /tmp/course-release-20261008/build-verified-demo.py external <QRC_SHA> --release quarto-reference-catalog=v3.0.0@<QRC_SHA> --quarto-version <EXACT_QUARTO_VERSION> --inspect
python3 /tmp/course-release-20261008/build-verified-demo.py print <PRINT_SHA> --release quarto-course=v4.0.0@<CORE_SHA> --release quarto-course-print=v0.3.0@<PRINT_SHA> --quarto-version <EXACT_QUARTO_VERSION> --inspect
python3 /tmp/course-release-20261008/build-verified-demo.py moodle <MOODLE_SHA> --release quarto-course=v4.0.0@<CORE_SHA> --release quarto-course-moodle=v0.3.0@<MOODLE_SHA> --quarto-version <EXACT_QUARTO_VERSION> --inspect
python3 /tmp/course-release-20261008/build-verified-demo.py prairielearn <PL_SHA> --release quarto-course=v4.0.0@<CORE_SHA> --release quarto-course-prairielearn=v3.0.0@<PL_SHA> --quarto-version <EXACT_QUARTO_VERSION> --inspect
python3 /tmp/course-release-20261008/build-verified-demo.py cloud <CLOUD_SHA> --release quarto-course=v4.0.0@<CORE_SHA> --release quarto-course-cloud=v3.0.0@<CLOUD_SHA> --quarto-version <EXACT_QUARTO_VERSION> --inspect
```

`--release` is an exact explicit fixed set, including the producer's own immutable release. Every supplied version and published immutable release SHA must match. The own release SHA must equal the producer SHA. BUILD spelling is strict: Task groups use `vX.Y.Z` plus exact `quarto`; script groups use plain `X.Y.Z` Core dependency plus plain own `extensionVersion`. No arbitrary version normalization accepts stale pins.

| Group | Producer/source | Native operation | Ready directory | Fixed asset |
|---|---|---|---|---|
| core | quarto-course/examples/course | task install; task render | `_book-full` | course.tar.gz |
| composition | quarto-project-publish/examples/course | task install; task render | `_site` | composite-course.tar.gz |
| qrc | quarto-reference-catalog/examples/course | task install; task render | `_site` | catalog-cross-project.tar.gz |
| external | quarto-reference-catalog/examples/external | task install; task render | `_site` | external-catalog.tar.gz |
| print | quarto-course-print/examples/paper | quarto add Core in bank and Print in root; quarto run build.ts | `_site` | paper.tar.gz |
| moodle | quarto-course-moodle/examples/questions | quarto add Core in bank and Moodle in root; quarto run build.ts | `_site` | moodle-questions.tar.gz |
| prairielearn | quarto-course-prairielearn/examples/java-gradle | quarto add Core and PL in bank; quarto run build.ts | `_site` | java-gradle.tar.gz |
| cloud | quarto-course-cloud/examples/course | quarto add Core and Cloud in root; quarto run build.ts | `_book/full` | cloud.tar.gz |

Source is extracted from clean producer Git archive into a fresh non-Git staging directory. Native environment retains `DEMO_SOURCE_COMMIT=<verified SHA>` and `DEMO_SOURCE_DIRTY=false`; XDG/Deno caches live under the explicitly chosen evidence directory. Installed extension descriptors are checked in either direct or Quarto GitHub owner namespace, exactly one match required. Producer content, source URLs and BUILD metadata are never rewritten.

Demo publication examples:

```bash
python3 /tmp/course-release-20261008/publish-verified-release.py quarto-course demo-20261008 <CORE_SHA> --demo core=/tmp/course-release-20261008/receipts/builds/core/_book-full --verified-demo-checks <CORE_FINAL_CHECKS_JSON> --inspect
python3 /tmp/course-release-20261008/publish-verified-release.py quarto-reference-catalog demo-20261008 <QRC_SHA> --demo qrc=/tmp/course-release-20261008/receipts/builds/qrc/_site --demo external=/tmp/course-release-20261008/receipts/builds/external/_site --verified-demo-checks <QRC_FINAL_CHECKS_JSON> --inspect
```

For the other five demo repositories use their fixed group and ready directory from the table, each with its actual owner SHA and final checks JSON. Download has no demo group. QRC own and external assets MUST be uploaded together in the same draft; no later additions to an immutable release.

Every execution can specify `--evidence /absolute/owner-chosen/evidence-path`. Use the same directory for builds and demo publication: publisher reads `builds/<group>/operation-receipt.json` there. Defaults are dated `/tmp/course-release-20261008/receipts`. Preserve it before reboot or cleaning `/tmp`.

## Final local checks receipt and gates

The current `/home/tolya/course-tools/quarto-template-course/tests/site.cjs` requires `--demo-group`, reads `tests/ready-assets.json` from cwd and compares final pinned file hashes. The original helper's bare `--demo-dir` invocation is unusable for a freshly built producer. The dated scripts therefore do not call the template consumer harness or generate its pins. The builder records native command success, BUILD provenance, installed namespace/version descriptor hashes, and full ready-tree hashes; it requires `index.html` and rejects symlinks. Final language, source links, HTML/QRC/resources and real PDF/XML/PL content checks remain root/owner gates before demo publication.

After actually checking those outputs, provide a JSON receipt (one per producer; QRC covers both groups):

```json
{
  "producer": "Afonenko-Course-Tools/quarto-course",
  "commit": "<VERIFIED_40_HEX_SHA>",
  "sourceDirty": false,
  "groups": {
    "core": {
      "passed": true,
      "checks": {"html": true, "resources": true, "sourceLinks": true, "outputs": true},
      "files": {"index.html": "<SHA256>", "BUILD.json": "<SHA256>", "<every other relative ready file>": "<SHA256>"}
    }
  }
}
```

`files` must be the complete exact ready-tree hash map, identical to that independently checked tree and the builder receipt; the publisher rejects changed/missing/extra files. Do not mark checks true until their actual producer verification passes. Receipt schema is a final operation gate, not a documentation/build manager. This preparation did not produce or fabricate such a receipt.

## Publication safeguards and pitfalls

The publisher requires clean branch `main`, exact supplied HEAD, enabled repository immutable releases, absence of local tag and remote tag/release, and fresh evidence output. It builds locally before remote mutation and checks absence again. It creates a NEW draft with exact SHA, never overwrites assets/tags/releases, downloads every draft asset, checks exact asset names and SHA-256, saves `draft.json` and `download-verified.json`, then publishes and verifies immutable status and source SHA. Extension releases are latest; demo releases are not latest. `RELEASE.json` records asset hashes, sizes and native/final provenance.

On any failure after draft creation, preserve evidence and inspect the draft manually. No automatic retry, draft replacement, cleanup or resume is implemented. Rerunning will fail safely on existing evidence/tag/release. `gh` authentication/404 errors must be distinguishable; only explicit HTTP 404 establishes absence. A race on remote tag creation cannot be made transactional with `gh`; review the draft target and tag if a concurrent publisher exists. GitHub metadata is not proof of required CI: root must enforce CI/PR/merged SHA gates separately before running these helpers.

Current producers still contained old pins when inspected. They are intentionally rejected until owner changes are merged. Native source URLs and Russian prose must be authored by the producer agent before merge; the scripts do not repair them. If a producer intentionally changes its native Taskfile install locations or BUILD schema, review the fixed map/schema narrowly before execution. No dependency graph discovery is performed.

## Local verification

`python3 -m py_compile` and help checks passed. `/tmp/course-release-20261008/local-verification.json` records 30 local checks: both AST/help checks; all eight fixed build `--inspect` operations; all eight extension `--inspect` operations; all seven demo release group `--inspect` operations; rejection of stale pins, short SHA and incomplete QRC group sets. `--inspect` uses parsed explicit inputs only, with no producer reads, network or mutations. Final syntax checks were repeated after removing the obsolete consumer harness and adding the explicit final local checks gate. No actual package install, producer render, asset creation or remote API verification is claimed.

Final dated script SHA-256:

- `build-verified-demo.py`: `d260dd4ffc529d1f46a192feb8d29aa0bc1d7dc5e1b49ff2ec269697cc379e00`
- `publish-verified-release.py`: `cc9e10ee18f585725708a5410c4f41187980e81ece7202c6dfcbcdab07f8df02`
