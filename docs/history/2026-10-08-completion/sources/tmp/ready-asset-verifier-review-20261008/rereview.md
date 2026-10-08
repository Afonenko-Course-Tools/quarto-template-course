# Focused verifier rereview — 2026-10-08

**Needs fixes.** Reviewed exact script SHA-256 `543f9d25810dbbb82f3b4b3656ccf0a72b4dd3d6e81d6490d1765dfb75ea4fe9`, full narrow diff and fixture tests/fix note. No builds, network, owner edits or broad retests.

Source witness P2 is closed: every group requires an actual anchor href matching own producer, own tool tag and exact source folder boundary; Core's real tree/code-link shape is accepted. Missing-all source URLs no longer produces sourceLinks:true. Existing harness remains unchanged.

**[P2] Exact PL expected tree includes generated Gradle files that native exporter excludes.** New exact_pl_resources compares hashes(stage/bank/projects/clamp/tests) wholesale against delivered tests. Actual native examples/java-gradle/build.ts runs Gradle in this very source tests directory before export, producing build/ and .gradle/. Existing adapter application/export.ts::files explicitly omits dot names and build/node_modules/_generated/_extensions. Therefore successful actual native source builds produce a legitimate delivery whose tests cannot equal the unfiltered source hash map. Isolated valid fixtures have no Gradle build outputs, so their green does not cover this real lifecycle.

Narrow fix: derive the exact expected authored resource map from clean producer source at the exact SHA, or apply existing exporter exclusions only to expected source-resource traversal. Keep the actual delivered map unfiltered: unexpected client/reference/key/test files must still fail. Add a bounded fixture with source tests/build and tests/.gradle plus legitimate delivered authored files, asserting acceptance, while retaining rejection of extra delivered files (including unexpected build/dot dirs). No actual producer rebuild is needed to demonstrate closure.

The original extra-file gap is correctly rejected by current code, but this new false rejection blocks approval for actual step13 execution. Other fixed gates and Gradle commands are unchanged. Root's explicit Java25 environment remains appropriate.
