# Template final bundle independent review — 2026-10-08

**Verdict: Needs fixes — 0 Critical, 1 Important, 1 Minor.** One bounded prose wave in two public pages is required before step 14's final approval. No runtime, pins, fetched assets, tests or publish workflow change is needed for these findings.

Reviewed exact clean HEAD `28d5053b54551b44fcd4b996225211d7573d1578`, Git tree `69df0f42e28d59ff5a5e5c92c9023c7a76f76d39`, branch `feat/authoring-model-20261008`. Scope: complete owner branch changes relative to current `origin/main`, final pass diff, current authored README/spec/guide/extensions/reference/catalog/config/workflow/tests, historical ownership preservation and actual local step 14 receipts. The installed upstream bundle was verified against its released producer source bytes rather than re-reviewed as a new runtime implementation.

## Consolidated findings and one fix wave

### Important P2 — Catalog still labels the new immutable demos as old unverified groups

Path: `/home/tolya/course-tools/quarto-template-course/catalog/index.qmd`, lines **10–12**.

The visible note says the catalog still contains groups from 7 October, they do not confirm the new bank markup, and next assets will replace them only after producer release/checks. This is false on this exact branch: all eight catalog links, Task URLs and manifest refer to the actually published `demo-20261008`; independent downloaded archive/file verification below confirms their new producer SHAs, new tool pins and `sourceDirty:false`. The catalog is the reader's primary route to these checked examples, so the note directly contradicts the completed step 13 evidence and the current versions page.

Minimal fix: replace the note's three obsolete preparation sentences with a short statement that the eight ready groups are pinned to immutable `demo-20261008` Releases, with source matching each group's tool tag at the same producer SHA; keep the link to the versions page. Do not rewrite producer HTML or regenerate manifest to address this text defect.

### Minor P3 — Presentation introduction still describes Core 4 bank rules as future preparation

Path: `/home/tolya/course-tools/quarto-template-course/guide/presentation.qmd`, lines **8–9**.

The sentence says the linked new bank policy is being prepared separately from the pinned release. The same page immediately installs `quarto-course@v4.0.0` and later correctly describes student Reveal bank privacy and demonstration. The released source's `spec/learning-elements.md` and `spec/visibility.md` already implement those rules. This remaining sentence can mislead authors about whether banking is supported by the instructed installation.

Minimal fix: retain the statement that the shown ordinary slides do not enable the bank, then point to the bank policy of released Core 4.0.0 as current. This is part of the same two-file prose wave.

After that wave, render the two changed pages with the existing native path and run the existing site check; no new broad Core/adapter suite is justified by these prose-only corrections. Root still owns exact-head PR/CI/merge and step 15's full ordered checks on clean merged main before native publication. Re-review the bounded two-file diff and new exact HEAD before claiming Approved.

## Independent positive verification

Fresh commands in this review:

- `git status --porcelain`, `git rev-parse HEAD`, `git rev-parse HEAD^{tree}`: exact reviewed SHA/tree above, clean.
- `git diff --check`: exit 0.
- `node tests/site.cjs` from the actual template owner: exit 0, **61 HTML pages / 2459 local links**. This verifies current documentation source UI/sidebar/search coverage, current ready BUILD/file maps and opaque resource copy; no native producer rebuild was run.
- A bounded read-only byte comparison against Git source and downloaded archives: **62/62 installed paths/bytes equal Core source `d58494171e3020957b64ed229cbc8537751e3beb`**, including all three extensions. **549/549 files** match exactly across archive contents, `tests/ready-assets.json`, actual `examples/GROUP`, actual `_site/examples/GROUP`, and the independently downloaded staging tree. The manifest SHA256 is `46c909a8f38d7aed58189542cff4e1c3c59691179f2292ccd16fb9bbf91e6b3c`.

Exact compact independent proof is `/tmp/template-final-review-20261008/read-only-proof.json`. It binds the reviewed template SHA/tree to each archive hash, Release ID, source SHA and actual tool sourceRef; no producer resource was altered.

| Group | Files | Source tag | Producer SHA |
| --- | ---: | --- | --- |
| Core | 107 | `v4.0.0` | `d58494171e3020957b64ed229cbc8537751e3beb` |
| Composition | 130 | `v5.0.0` | `215309b5c41669e56a857a1bc3e4f7f2ce782c5f` |
| QRC | 188 | `v3.0.0` | `559583805a514ae8a244b6ea4cb5124867064024` |
| External QRC | 20 | `v3.0.0` | `559583805a514ae8a244b6ea4cb5124867064024` |
| Print | 26 | `v0.3.0` | `00c51f7342da376e85027a925dd9f1207783f924` |
| Moodle | 21 | `v0.3.0` | `60ce53d0d52a93e66ca545f2a6cd96f97f09d1e6` |
| PrairieLearn | 35 | `v3.0.0` | `b9821b5b62863b7e1ae380a4c1a0a0bef855f8ba` |
| Cloud | 22 | `v3.0.0` | `552612450b093b0cff2e33187a1cb5b9234c050a` |

Each group in the central locally read `all-demo-published-verified.json` has immutable `demo-20261008`, its SHA equals its own tool row in `all-tools-published-verified.json`, sourceDirty is false, sourceRef equals that tool's published tag, and archive URL/hash/BUILD/file map equals the template's actual manifest. QRC's two groups share one demo Release. Download has its eighth tool release and no separate demo group. Catalog demo-tag URLs and producer tool-tag source links are intentionally different names at equal producer SHAs; neither was globally rewritten.

## Requirements and implementation review

The guide covers explicit exercise-bank opt-in and native metadata inheritance, own difficulty/time and statement override, ordinary native exr/exm/sol outside banking, suffix and nested solution pairing, all 12 course roles, four work kinds, multiple ordered task-items, stage without a hidden default, required/optional and individual/pair/group assignments, demonstration witnesses, restricted-only practical/test and non-assigning assessment-preview. It explains 35/75 required/all task totals, 50/90 with theory once, fractional theory 7.5 and partial omission without historical sum substitution. Those examples agree with the released Core source contracts read at exact SHA.

Five answer forms have copyable QMD and adapter support boundaries. The guide separates participant condition/publicAnswer from teacher closedKey/solution/gradingNotes, uses qualified Body assignments equal to items, keeps restricted participant delivery separate from public-site openness, and excludes preview/external work prose from selected conditions. `guide/solutions.qmd:75–88`, `guide/assessments.qmd` and `guide/export.qmd` correctly explain that an HTML-only public solution is insufficient for the current selected JSON demonstration stage, recommend a portable solution container, and avoid promising an extra full/source render or old-result lookup.

Profiles/native formats, source modal/raw-QMD privacy recommendations, closed resources/ZIP, standalone Presentation, Reveal notes/fragments/print, composition child warning configuration, QRC address-only import, explicit resource ownership, participant Print, teacher Moodle, PL External bindings/client/tests/reference and Cloud's non-Body/non-execution scope are documented. Installed commands and specification/diagnostic source URLs use all eight actual tool tags. Fresh diagnostics checks confirm representative Core IDs against the exact source's diagnostics. Current template spec links replace old accepted-next Core/Body status; generic status vocabulary remains appropriate. Intentional in-progress owner/global plan links belong to final step 18 cleanup and do not block step 14.

README and Windows guide accurately limit execution proof: Linux fetch path tested; actual Windows/macOS execution not claimed. The two narrow released Core Windows fixes are described without claiming fresh native Windows validation. recoverEncode is conditional and historical rather than claimed reproducible today. PL/Moodle/Cloud local export/build evidence is distinguished from live platform execution/import.

`tests/site.cjs` changes strengthen the existing harness: exact archive hash before extraction; whole BUILD equality and sourceDirty false; complete relative-file SHA256 map; symlink refusal; Russian Quarto pages; exact own tool source-ref check; duplicate source actions; matching Task/catalog pins; additional documentation/sidebar/search/anchor coverage. The former full opaque-copy/resource/link checks remain. `--documentation-only` remains an explicit limited mode; default `task check` still checks all ready groups and the literal guide test. No successful gate is obtained by weakening an old check.

`tests/fetch.py` continues exercising actual Task/curl/tar in Unicode/spaces and preserving the previous group on refusal, now with archive/BUILD/dependency/file/language/source failure inputs. Its old-release fixture tag is isolated synthetic fixture metadata, not a product pin. `tests/guide-examples.py` extracts literal authored fenced snippets into a temporary native book for tests; it introduces no runtime Markdown parser, docs generator or dependency manager. It uses installed pinned Core by default, validates actual student/full native artifacts and selected public/teacher packages, then checks fractional theory and partial omission. It does not rebuild ready producer groups.

`Taskfile.yml` keeps explicit install/fetch/render/check operations. Native publish is still `task check` then `quarto publish gh-pages --no-render`. Workflow has read-only contents permissions, pull_request/manual check triggers, Quarto 1.11.5/CUE 0.17.1, existing Task checksum verification and ordered checks; no PR deployment or artifact/Sites workaround was introduced. Generated/service directories remain excluded from website resources and Git. Historical old plans are preserved under the already verified owner history; no unrelated user worktree edits are present in this branch.

## Evidence inspected and honest limits

Read full local command summaries and terminal tails for `/tmp/template-release-finalize-20261008/{install,fetch,render,check,fetch-regression}.log`, corresponding command JSON and `step14-check-report.json`: all five writer commands have recorded exit 0 and real logs. Literal guide PASS comes from that completed local native run; this reviewer did **not** repeat the broad native guide/render suite or claim its own new native run. The fresh reviewer checks are only the bounded read-only byte/site/diff/source checks named above.

Reviewed local published/download receipts and archived bytes, not fresh remote GitHub API/network status. CI/merge/main publication/live site QA are still pending root gates. Browser UI QA is explicitly unverified because CUA had no browser surface; neither the writer nor this review claims interactive browser success. Root's planned live headless/native smoke QA after publication remains necessary. No source edits, CI, pushes, refs, publication, cleanup or runtime modifications were performed by this reviewer.
