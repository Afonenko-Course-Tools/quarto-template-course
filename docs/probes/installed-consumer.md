# P0 installed consumer and five-part portal

This is a baseline proof of the **current installed extension copies**, not a
production migration or a new content/resource contract. The production root
template remains unchanged. Run from this repository with Quarto, CUE and the
Quarto-bundled Deno available:

```sh
quarto run tests/probes/installed-consumer.ts --output /tmp/p0-consumer-evidence
# Optional: --keep retains the temporary consumer for inspection.
```

Use a new evidence directory on each run. Existing cache directories are rejected.
The driver copies only fixture sources and real extension-package files into an
unrelated temporary directory. It rejects symlinks, developer/cache directories,
embedded developer paths and remote TypeScript module imports in copied packages.
No repository checkout, node_modules, LMS adapter or development dependency cache
is copied to the consumer. Installation uses package copies, as permitted by the
P0 plan; this does not prove a remote tagged `quarto add` installation.

## Fixture

`fixtures/probes/five-parts` contains independent sibling Quarto projects:

| Owner | Native format | Content |
|---|---|---|
| theory | HTML book | Theory and links to lectures/tasks |
| tasks | HTML book | Canonical exercise, full-only solution, lab and plan pages |
| practice | Reveal | Links to tasks/theory |
| lectures | Reveal | Links to theory/practice, public Speaker View notes |
| handbook | HTML book | Reference material |
| root | Website portal | Links to all five owners |

Each project has explicit student/full profiles; root defaults to student.
The coordinator has no `home`, so the root renders its own portal. All
cross-owner references use QRC; the only include is `tasks/_intro.qmd`, owned by
the same tasks project. The exercise/assessment syntax uses the current baseline
contract. The plan is an ordinary author page; no future stable-work or print
contract is invented here.

The three books use native `book.repo-url`, `repo-branch`, `repo-subdir` and
`repo-actions: [source, issue]`. Reveal uses ordinary GitHub links in its native
footer. The example repository URL is synthetic: exact generated hrefs are
checked, without sending issues or promising that the example repository exists.
The branch contains a slash and the publication is configured under
`https://example.edu/courses/p0/`. QRC hrefs are resolved under that prefix and
their final HTML targets/anchors checked. Reveal targets use `#/slide-id`.

## Assertions and recorded evidence

- Both profiles build all five members and the portal using the documented
  project-publish metadata/finalize integration. Seven explicit QRC exports are
  verified, including lab/plan pages and book ↔ slides transitions.
- Exact native source/issue and Reveal footer hrefs survive QRC finalize. The
  source action for the same-owner include remains the author `tasks/index.qmd`.
  No rendered HTML/search file contains a staging or temporary consumer path.
- Public notes remain in Reveal HTML with `show-notes: false`. Full-only markers
  are absent from student HTML/search, present in each full member, and remain
  intentionally in public fixture QMD sources.
- Ordinary portal/task resources are published. One student ZIP and two full
  ZIPs contain exactly the selected `README.txt`; the sibling reference directory
  is excluded. Source QMD, Lua, TypeScript and CUE are absent from final output.
- Unknown, conflicting and missing child profiles fail.
- Failure in the final handbook member follows earlier successful member builds,
  publishes no student portal, and leaves the full release untouched. Recovery
  uses the default student profile and removes an obsolete output file.
- A deliberate ordinary-resource glob counterexample is retained: exposing
  `tasks/materials/**` copies `FULL_ONLY_DOWNLOAD` into student output. The driver
  succeeds when it reproduces this known **failed production visibility gate**.
  `results.json` explicitly marks that gate blocked. Selecting ZIP profiles does
  not provide a policy for ordinary Quarto resource copying.

The evidence directory contains package/file SHA-256s, copied upstream provenance,
tool versions, bundled-license paths, logs for every render/negative case,
student/full file lists, successful publication snapshots, and `results.json`.
The temporary consumer is removed unless `--keep` is supplied. The deliberately
leaking final negative output is not copied into the successful publication
snapshots.

## Offline scope and limitations

Every render starts with distinct empty `XDG_CACHE_HOME` and `DENO_DIR`
directories. The current copied package modules are local, and QRC has vendored
parse5/entities. This proves bounded package locality and independence from a
warmed developer dependency cache. It does **not** establish an operating-system
network-denial gate or a syscall audit of file access.

OS-level tracing/network isolation could not be enabled in the managed test
environment: `strace` failed at `PTRACE_TRACEME` and `unshare -n` failed with
`Operation not permitted`. These constraints are reported instead of bypassed.

Earlier exploratory runs observed that the installed Quarto runner accepts
`QUARTO_RUN_NO_NETWORK=true` and rejects a never-cached remote import. That
undocumented environment flag is **not used by the committed proof or relied on
as supported offline evidence**. Similarly, exploratory use of
`QUARTO_DENO_EXTRA_OPTIONS` failed during recursive publication when nested
invocations appended duplicate `--v8-flags`; it is not used by the proof.
No `.quarto` cache format or private Quarto integration API is read or modified.
The extension integration uses the existing project-publish metadata/finalize
interface and native Quarto render/profile configuration.

CUE remains an explicit tool prerequisite; its schema is inside course-core,
but the CUE executable is not supplied by the copied package. Installed package
licenses are incomplete: reference-catalog includes its MIT license, parse5 MIT license and entities
BSD-2-Clause license;
course-core, course-presentation, course-navigation, project-download and
project-publish copies contain no license files. The manifest records that fact.

HTML/anchor assertions do not establish interactive Speaker View, scroll/mobile
navigation or browser-print visual behavior. Those browser checks remain open.
No new print/PDF-before-ZIP integration is attempted while the sibling content and
resource gates remain open. Native Windows and real LMS installations are also
outside this baseline proof.

## Baseline environment and tests

On 2026-10-01: Quarto 1.11.5; Deno 2.7.14; CUE v0.17.1; XeTeX
0.999995 from TeX Live 2023/Debian. The copied extension versions are Core 2.0.0,
Presentation 0.1.0, Navigation 0.2.0, QRC 2.0.0, Publish 1.0.0 and Download 1.0.0.
QRC vendors parse5 7.3.0 and entities 6.0.1.

The unchanged production-template baseline commands also passed:

```sh
quarto run tests/check.ts
quarto run tests/external.ts
quarto run tests/features.ts --course .
```

`check.ts` rendered both audiences, the existing five-member composition, real
XeLaTeX handouts, and standalone Cloud/PrairieLearn examples. Its own assertions
reported 768 local links and 129 demonstrated features. `external.ts` passed its
local HTTP import test; `features.ts --course .` reported 129/129 self-coverage.
This preserves the existing PDF baseline without substituting a different print
engine or claiming the future print resource policy is complete.
