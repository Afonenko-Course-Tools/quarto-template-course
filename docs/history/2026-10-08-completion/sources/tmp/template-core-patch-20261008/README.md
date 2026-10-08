# Template Core 4.0.1 source preparation

State: bounded source-only preparation complete; actual immutable Core/tool+demo publication is pending. No new release availability, source SHA, archive hash, BUILD or file map is claimed.

Worktree `/home/tolya/course-tools/quarto-template-core-patch-20261008`, branch `fix/core-student-link-guide-pins-20261008`, unchanged HEAD/base `8b050033b594eeae4270ca6f55f12a1d6e8f1243`.

`prepared.diff` changes 23 explicit source/documentation/owner-journal paths. Task's entire change is the Core install pin to v4.0.1 and core asset URL to demo-20261008-1. Core tagged Source/spec/diagnostic URLs and displayed bundle labels match. Catalog/source map is explicitly mixed: one future new core group and seven existing demo-20261008 groups. README/versions/catalog mark the Core release as pending; remove those temporary pending sentences only after root supplies actual release evidence. The original v1.0.0 template release and model-introduction v4.0.0 remain historical facts; 4.0 authoring semantics/API are preserved.

Read-only static evidence in `source-static-proof.json`: full manifest unchanged (SHA256 46c909a8f38d7aed58189542cff4e1c3c59691179f2292ccd16fb9bbf91e6b3c); all 62 vendored files match base path/bytes; harness/workflow/native resource config unchanged; all literal fenced guide examples equal the base except three shell installation tags; seven non-core catalog rows and all eight current manifest entries untouched; git diff --check PASS. No native install/fetch/render/check/fetch-regression, commit, push, PR, merge or publish was run in this preparation.

Next ordered gate after root signal:

1. Download the actual published new core archive to /tmp and compare its archive hash/size, complete BUILD/tree/file hashes and own source SHA against root receipts. New sourceRef must be v4.0.1; new demo tag must resolve to the same actual producer SHA. No field can be invented from the pending release.
2. Replace only the core manifest record from those bytes. Keep the other seven records exactly byte/value-equivalent, including their Core4.0.0 dependency evidence. Remove temporary pending availability prose and update journal with actual facts.
3. Run native task install; prove every installed file/path/byte equals the new Core Git object (expected 63 files), no overlay or extras. Include new untracked bundle files explicitly after reviewing them.
4. Run task fetch, task render, task check and python3 tests/fetch.py in order, with actual Quarto1.11.5, CUE0.17.1 local runtime and writable /tmp caches. Check copied ready maps and git diff --check; native network/loopback uses authorized require_escalated.
5. Save exact checks/diff/HEAD for independent review. Root owns PR/CI/merge, clean-main rerun and existing native task publish. The currently published source8b050033 / gh-pagesa55b0e3 remains the factual baseline until republished.

Every preparation process completed; no asynchronous sessions remain.
