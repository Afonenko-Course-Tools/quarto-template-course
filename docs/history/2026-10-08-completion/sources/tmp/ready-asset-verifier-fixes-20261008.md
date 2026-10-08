# Narrow verifier review fixes — 2026-10-08

Fixed only `/tmp/ready-asset-verification-prep-20261008.py`; no owner/harness files changed and no producer build/release executed.

Script SHA-256: `543f9d25810dbbb82f3b4b3656ccf0a72b4dd3d6e81d6490d1765dfb75ea4fe9`.

P2 exact PL resources: complete relative path → SHA-256 maps must match for source/student → delivered/clientFilesQuestion and source/tests → delivered/tests. Missing directories, changed bytes, extra reference/client/key/test files and nested symlinks fail. Existing delivered Gradle reference-success/student-failure checks remain unchanged.

P2 source witness: each actual ready group must contain at least one authored anchor href to its own producer GitHub blob/tree URL, own published tool tag and exact source folder (folder itself or descendant). Core tree/v4.0.0/examples/course code-link shape is accepted. Generated outputs do not need individual source actions. Per-group witnesses are saved outside the ready root as GROUP-source-witnesses.json before receipt success; unchanged site.cjs continues validating every encountered source tag/resources/hashes.

Focused isolated fixture tests: `/tmp/ready-asset-verifier-guards-20261008.py`.

RED command on preserved pre-fix script:
`python3 /tmp/ready-asset-verifier-guards-20261008.py /tmp/ready-asset-verifier-before-review-20261008.py`

Result: 8 tests, 12 assertion failures, zero errors. Before the fix, extra PL reference/client/test key files, missing all source URLs for each of 8 fixed groups, and wrong source folder were incorrectly accepted.
Log: `/tmp/ready-asset-verifier-guards-red-20261008.log`.

GREEN command on fixed script:
`python3 /tmp/ready-asset-verifier-guards-20261008.py /tmp/ready-asset-verification-prep-20261008.py`

Result: 8 tests passed, including all 8 source omission subtests, exact legitimate PL resource fixture, Core's real authored URL shape, wrong-folder and wrong-tag rejection. Fixture-only Gradle is mocked and SHA/main checks are isolated; unchanged consumer harness executes on bounded mock ready trees. No test result claims an actual new producer build is ready.
Log: `/tmp/ready-asset-verifier-guards-green-20261008.log`.
Python compilation passed. Root still must export JAVA_HOME=/usr/lib/jvm/java-25-openjdk and matching PATH before actual PL execution; no environment choice changed in the helper.
