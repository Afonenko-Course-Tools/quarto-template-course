# Four native task demo groups — 2026-10-08

All four native builds and final exact ready-asset verifiers passed. Producer staging used the fixed dated argv and actual published immutable dependency releases. No rebuild, source/repository edit, commit, refs change, release or publication performed by this agent.

| Group | Source SHA | Files | Ready root | Exact gate |
| --- | --- | --- | --- | --- |
| core | `d58494171e3020957b64ed229cbc8537751e3beb` | 107 | `/tmp/course-release-20261008/receipts/builds/core/_book-full` | `/tmp/course-release-20261008/receipts/checks/quarto-course/verified-demo-checks.json` |
| composition | `215309b5c41669e56a857a1bc3e4f7f2ce782c5f` | 130 | `/tmp/course-release-20261008/receipts/builds/composition/_site` | `/tmp/course-release-20261008/receipts/checks/quarto-project-publish/verified-demo-checks.json` |
| qrc | `559583805a514ae8a244b6ea4cb5124867064024` | 188 | `/tmp/course-release-20261008/receipts/builds/qrc/_site` | `/tmp/course-release-20261008/receipts/checks/quarto-reference-catalog/verified-demo-checks.json` |
| external | `559583805a514ae8a244b6ea4cb5124867064024` | 20 | `/tmp/course-release-20261008/receipts/builds/external/_site` | `/tmp/course-release-20261008/receipts/checks/quarto-reference-catalog/verified-demo-checks.json` |

Actual HTML/resource/source-link and format checks pass; composition native QRC links, all QRC catalogs and native Revealjs slide/object destinations pass. QRC: 163 local links / 8 HTML pages and 18 actual QRC links. External: 15 local links / 1 HTML page and 3 actual QRC links. Core was verified before the scoped QRC/Cloud checker repair and its exact receipt remains valid.

Composition first failed because the verifier compared native Reveal slash fragment `/sec-slide` to HTML ID `sec-slide`. Site/source/resource checks had passed. The approved scoped verifier supports existing native URL/Reveal DOM semantics with missing-slide/object/plain-HTML-negative guards intact; checker actual SHA `bc329df2b7661d42faa21f6ad8b5cbbf8697d1ad19f60c13d0b876078c5be468`. Review: `/tmp/ready-asset-verifier-review-20261008/rereview-qrc-cloud.md`.

Original failed composition check directory was preserved by explicitly authorized rename to `/tmp/course-release-20261008/receipts/checks/quarto-project-publish.failed-native-reveal-20261008`. All four old file paths and SHA-256 hashes matched before/after rename; inventory in `failed-evidence-preservation.json`. Existing native staging/BUILD/ready bytes were not changed or rebuilt. Approved fresh checks then created the normal check directory.

Final full ready file maps equal native build receipts and each checker gate. Owner main SHA stays equal to exact tool-release source; all mains clean. All own execution sessions finished. Machine table: `results.json`. Native build logs, original failure/cause logs and approved final checker logs are in this directory. Root handles normal draft assets/download hashes/immutable demo publication.
