# Native PL lifecycle verifier fix — 2026-10-08

Changed only dated verifier and its dated guard fixtures, preserving the approved source-witness checks. No owner/harness files, native builds, releases or Java environment were changed.

Fixed verifier SHA-256: `65738dc5afdb6822ede0fe1bbb1f33370f60f9ec5bb4fcbfeba71deaa6950378`.

`exact_pl_resources` now obtains the expected authored files from exact producer BUILD SHA, already checked against clean main/receipt by main. For each of two fixed prefixes, examples/java-gradle/bank/projects/clamp/student/ and tests/, it executes bounded `git ls-tree -r -z SHA -- PREFIX`, requires ordinary blobs (no committed symlinks), and uses `git show SHA:PATH` bytes for SHA-256. Each expected staged authored file must retain those committed bytes. Delivered clientFilesQuestion/tests maps remain fully unfiltered and must exactly match the committed map. Staged Gradle build/.gradle outputs never enter expected authored files; unexpected delivered files still fail. No ignore parser or dependency manager introduced.

Read-only current producer Git list agrees with root's five authored public/test files: student/Clamp.java, tests/ClampChecks.java, tests/build.gradle, tests/grade.sh, tests/settings.gradle. Source/reference continues to be used only for existing reference-success check.

Fixtures use an actual isolated temporary Git repository/commit containing those five authored files plus reference fixture, then copy the committed source into staging, append fake tests/build/classes/Clamp.class and tests/.gradle/cache.bin only to staging after commit, and retain clean authored deliveries. Git commands execute normally; only Gradle execution is mocked. Fixtures retain extra delivered reference/key/test rejection, add extra delivered build/.gradle rejection, and retain all eight groups' source-witness guards and Core URL acceptance.

RED: `python3 /tmp/ready-asset-verifier-guards-20261008.py /tmp/ready-asset-verifier-before-native-pl-fix-20261008.py`
10 tests, exactly one assertion failure: legitimate authored delivery rejected after producer Gradle outputs appeared. Zero errors.
Log: `/tmp/ready-asset-verifier-native-pl-red-20261008.log`.

GREEN: `python3 /tmp/ready-asset-verifier-guards-20261008.py /tmp/ready-asset-verification-prep-20261008.py`
10 tests passed. Python compilation passed.
Log: `/tmp/ready-asset-verifier-native-pl-green-20261008.log`.

These are bounded mock ready trees; no actual new demo readiness claim. Root will explicitly execute actual PL with JAVA_HOME=/usr/lib/jvm/java-25-openjdk and matching PATH.
