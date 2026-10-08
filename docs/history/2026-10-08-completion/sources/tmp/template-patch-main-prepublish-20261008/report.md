# Template patch: clean merged main before publication

PR #19 merged after exact-head CI run 37737745573 succeeded. Actual source main `52316a762da3a9c054b5ac6a7a89620e46c7c150`, tree `7ab56f79f57452207bbd1c44f85fca2635381c08`, equals the independently reviewed/tested PR tree. Primary checkout updated by clean fast-forward; other user worktrees preserved.

Ordered native `task install`, `task fetch`, `task render`, `task check`, `python3 tests/fetch.py`: all exit 0, actual Quarto 1.11.5 / local CUE 0.17.1 / Task 3.54.0 with writable /tmp paths. All 63 installed files/paths/bytes match Core v4.0.1 source `a9a439bd…`; all 549 ready files match the manifest in both copies. Full site check passed 61 HTML pages and 2459 local links; native literal guide and actual fetch regression passed.

599-file checked site map recorded in `site-tree-hashes.json`; guide/fetch tests left it unchanged. Every tracked source hash still equals clean merged main; git diff --check PASS. Detailed receipts: `verified-prepublish.json`, command JSON/logs, installed-core-file-hashes.json, ready-copies-verified.json and source-inputs-before-publication.json.

All five own clean-main sessions completed. Native Task publish and Pages/live verification are next; publication is not claimed by this prepublish receipt.
