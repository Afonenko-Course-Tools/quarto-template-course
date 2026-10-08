# Template clean main prepublication — 2026-10-08

Passed on clean merged main `8b050033b594eeae4270ca6f55f12a1d6e8f1243`, exact source tree `4c808491faf6bc10ee0223510e40a60ecc80bfbc`. Source/main stayed unchanged before/after all commands. This agent performed no source edits, commits, refs operations, publication or deployment.

| Existing command | Exit | Seconds | Log |
| --- | --- | --- | --- |
| install | 0 | 7.853 | `/tmp/template-main-prepublish-20261008/install.log` |
| fetch | 0 | 21.816 | `/tmp/template-main-prepublish-20261008/fetch.log` |
| render | 0 | 33.179 | `/tmp/template-main-prepublish-20261008/render.log` |
| check | 0 | 88.701 | `/tmp/template-main-prepublish-20261008/check.log` |
| fetch-regression | 0 | 3.172 | `/tmp/template-main-prepublish-20261008/fetch-regression.log` |

Quarto 1.11.5; exact local CUE 0.17.1 and Task binary, writable dated cache/data/IPython/Jupyter paths. Existing ordered `task install`, `task fetch`, `task render`, `task check`, then `python3 tests/fetch.py`. No additional runtime CI invented.

Existing site harness: 61 HTML pages / 2459 local links, search/navigation/tagged source provenance. Native literal guide examples ran through installed Core: student/full, roles, answers, work scenarios, selected public/teacher Body, timing and partial native run. Fetch regression ran actual Task/curl/tar.

All 62 installed Core extension files equal Git object `d58494171e3020957b64ed229cbc8537751e3beb` by exact path and SHA-256 bytes. All 549 opaque files in eight ready groups equal committed ready manifests in both fetched `examples/` and rendered `_site/examples/`. No ready bytes rewritten.

Source input snapshots: 111 tracked files, including 49 authoring files and 62 extension files. Full tracked byte hashes unchanged; before/after stat snapshots retained (native install can update mtimes).

Pins digest (canonical tracked Taskfile.yml + tests/ready-assets.json SHA map): `af5046018e582fafc3e0966a9da111a03373a2a3bb0cb8fa09155ef285276b5e`. Whole rendered `_site` contains 599 files; full path/hash map in `site-tree-hashes.json`, canonical digest `6be7d515b6c30b5f4c84a6d15161d41b0b53d582d9b4a7a818b37646aabfdfec`.

Machine gate: `verified-prepublish.json`; source inputs, installed extension hashes, ready copy proofs, commands/timings and logs are adjacent. All asynchronous sessions completed. Root may now execute the existing `task publish` route (`check`, then native `quarto publish gh-pages --no-render`) on this exact source and verified site.
