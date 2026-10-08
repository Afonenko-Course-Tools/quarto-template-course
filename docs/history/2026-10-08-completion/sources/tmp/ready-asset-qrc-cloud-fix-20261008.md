# Combined bounded QRC/Cloud verifier fix — 2026-10-08

Fixed dated verifier SHA-256: `bc329df2b7661d42faa21f6ad8b5cbbf8697d1ad19f60c13d0b876078c5be468`.
Full delta against last approved SHA65738dc: `/tmp/ready-asset-qrc-cloud-delta-20261008.diff`.
Only dated verifier changed; no owner/harness/ready outputs/source/receipts altered, and no native builds or final owner check reruns executed in this wave.

QRC uses existing native HTML parser with URL(relative href, file URL base). Query/path/hash separated. Route slash normalization requires actual native reveal→slides DOM, with actual routed section ID inside slides; qrc-target requires actual object ID plus actual slide ID. Plain fragment unchanged; slash route on non-Reveal rejects. Diagnostics print captured subprocess failure output before rethrow.

QRC fixture RED before fix: 6 tests, exactly 2 false-rejection failures; GREEN final combined script: 6 passed, including missing slide/object rejection and plain/slash guards.
Tests `/tmp/ready-asset-qrc-reveal-guards-20261008.py`; logs `/tmp/ready-asset-qrc-reveal-{red,green}-20261008.log`.

Cloud old course.json aggregate is expected to be absent after native build.ts finishes collectExport: exporter starts/completes a current full native JSON run and invalidates old aggregate. New generated verify-cloud.ts discovers exactly one installed course-core/infrastructure/native-run.ts at the two existing namespace locations; imports that module from the installed release and calls existing loadNativeRun(stage,{view:"full"}). This API checks actual current pointer, configuration hashes, run identity and full-view documents, then exposes existing adapter.fragments Map.

Verifier requires exactly one cloud adapter, tasks/index.qmd fragment/course demo-cloud, exactly one exr-service and exact configure/client steps, preserving the original external source-file guard. Existing shell syntax check and private projects exclusion remain unchanged. It neither assembles nor captures/renders new evidence.

Actual completed Cloud evidence probe:
`python3 /tmp/ready-asset-cloud-native-guard-20261008.py SCRIPT`
uses /tmp/course-release-20261008/receipts/builds/cloud and actual ready root _book/full. Only temporary probe/cache files are writable; loadNativeRun is read-only, no pointer/documents mutation. Ready SHA-256 map compared before/after and unchanged.
RED previous approved script: one assertion failure, obsolete course.json missing.
GREEN combined fixed script: one test passed, output `PASS installed current native Cloud loader: exr-service/configure/client/source file`.
Fixture `/tmp/ready-asset-cloud-native-guard-20261008.py`; logs `/tmp/ready-asset-cloud-native-{red,green}-20261008.log`.
Python compilation passed.

Actual native Cloud build already passed at source SHA552612450b093b0cff2e33187a1cb5b9234c050a, but final receipt is still withheld pending independent review and authorized fresh verifier execution. Preserved failed check directory and /tmp/adapter-demo-builds-20261008/cloud-check.log untouched. Print/Moodle/PL success receipts untouched. No processes/sessions remain active from adapter loop (session28206 completed exit1 on legacy Cloud check).
