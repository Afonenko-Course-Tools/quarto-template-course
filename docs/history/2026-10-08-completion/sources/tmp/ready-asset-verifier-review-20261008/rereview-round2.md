# Final scoped verifier rereview — 2026-10-08

**Approved.** All prior P2 findings are closed. No remaining actionable findings in the bounded delta.

Verified actual script SHA-256 `65738dc5afdb6822ede0fe1bbb1f33370f60f9ec5bb4fcbfeba71deaa6950378`; read the complete round-two diff, lifecycle fix note, guard fixtures and RED/GREEN logs. No producer build, broad runtime retest, network/publication or owner edit performed.

PL expected student/tests paths and bytes now come from ordinary committed blobs at exact BUILD SHA via bounded git ls-tree/git show. Staged authored bytes must equal committed bytes. Generated source tests/build and tests/.gradle no longer enter the expected map. Actual delivered maps remain unfiltered and exact, so extra reference/key/test/build/dot files still reject; native SHA/main/provenance gates remain unchanged. Existing reference-success/starter-failure commands are preserved.

Focused fixtures use a real isolated Git commit and append generated Gradle files to staging only after commit; real Git reads are exercised, only Gradle is mocked. RED reports the single intended native-lifecycle false rejection; GREEN reports all 10 tests passing, including legitimate generated-source acceptance and unexpected delivered build/.gradle rejection. These fixture logs support guard correctness, not actual demo readiness.

Previously approved per-group source witness logic is unchanged: own producer/tool tag/source folder anchor required; Core tree source allowed; unchanged site.cjs still checks every encountered tag, exact hashes and local resources. No new parser, general manager, weakened harness or owner modification.

Approval covers running the dated verifier for step13 after actual immutable dependencies/native build receipts exist. Actual owner builds, format/output verification and normal release publication gates are still required. Root will explicitly select Java25 for PL execution as in the approved runtime matrix.
