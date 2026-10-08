# Bounded native QRC Reveal verifier repair

Only dated generated verify-qrc.ts and run() exception diagnostics changed. No owner/harness/native output/receipt edits; no actual QRC check rerun.

URL destinations now use new URL(relative href, pathToFileURL(current HTML)), separating native query/path/hash. Existing QRC parseHtml remains the only parser. Slash fragment normalization is accepted only when actual target DOM has reveal → slides structure; routed slide must be an actual section ID inside slides. Plain HTML fragment remains unchanged, and plain HTML slash routes reject. qrc-target query requires actual native Reveal structure, nonempty unique object key, existing object ID and existing slide destination.

run() prints captured CalledProcessError.output before rethrow, so producer stderr/stdout remains in failure log. Exit behavior unchanged.

Focused real-parser fixtures: /tmp/ready-asset-qrc-reveal-guards-20261008.py.
RED against /tmp/ready-asset-verifier-before-reveal-fix-20261008.py: 6 tests, 2 failures (legitimate native slide route and object query falsely rejected), zero errors.
GREEN: all 6 passed (native slide route/object query accepted; missing slide/object rejected; plain fragment accepted; slash route on non-Reveal rejected).
Logs /tmp/ready-asset-qrc-reveal-{red,green}-20261008.log.

Successful Print/Moodle/PL receipts retained unchanged. Cloud native builder passed but current Cloud verifier uses obsolete course.json, so no Cloud success receipt exists yet; separate narrow installed loadNativeRun API repair proposed to root.

Verifier SHA-256: `e25133d2792a1bc232620c4da21a41e29e28db3fd95fee59f16a1668d7705052`.
