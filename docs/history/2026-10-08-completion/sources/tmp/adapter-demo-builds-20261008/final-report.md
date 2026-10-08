# Adapter native demos — final local results

All four assigned adapter native builds passed, followed by final exact ready checks for Print, Moodle, PrairieLearn and Cloud. Every producer stayed at its own actual immutable tool release SHA; no owner/source/ready modifications or rebuilds occurred. This agent performed no demo publication.

| Group | Exact producer SHA | Ready root | Final receipt |
| --- | --- | --- | --- |
| Print | 00c51f7342da376e85027a925dd9f1207783f924 | receipts/builds/print/_site | receipts/checks/quarto-course-print/verified-demo-checks.json |
| Moodle | 60ce53d0d52a93e66ca545f2a6cd96f97f09d1e6 | receipts/builds/moodle/_site | receipts/checks/quarto-course-moodle/verified-demo-checks.json |
| PrairieLearn | b9821b5b62863b7e1ae380a4c1a0a0bef855f8ba | receipts/builds/prairielearn/_site | receipts/checks/quarto-course-prairielearn/verified-demo-checks.json |
| Cloud | 552612450b093b0cff2e33187a1cb5b9234c050a | receipts/builds/cloud/_book/full | receipts/checks/quarto-course-cloud/verified-demo-checks.json |

All table paths relative to /tmp/course-release-20261008. Each gate sourceDirty:false, four checks html/resources/sourceLinks/outputs:true, exact complete file tree hashes matching native operation receipt.

Actual Print: pdfinfo/pdftotext all three PDFs pass; root separately confirmed three-PDF visual QA passes. Moodle: two XML variants parsed with existing bundled XML DOM, exact selected question keys and sole TLS key pass. PL: actual committed five authored file set and bytes match both native deliveries; delivered tests run with actual Gradle/Java25, reference succeeds and unfinished student fails for each variant. Cloud: actual current installed loadNativeRun full-view fragment passes exr-service/configure/client/external source assertions; shell syntax and private projects exclusion pass; three HTML pages/75 local href/src pass.

Native adapter loop session28206 completed exit1 at the first Cloud legacy aggregate verifier failure after all native builds passed; all prior Print/Moodle/PL receipts preserved. Root reviewed/approved narrow QRC Reveal URL and Cloud current-native-loader fixes in /tmp/ready-asset-verifier-review-20261008/rereview-qrc-cloud.md. Final verifier SHA bc329df2b7661d42faa21f6ad8b5cbbf8697d1ad19f60c13d0b876078c5be468.

Cloud failed checks moved only with root authorization to receipts/checks/quarto-course-cloud.failed-aggregate-path-20261008; all three relative paths/hashes proved unchanged before/after in cloud-failed-checks-preservation.json. Fresh original guard then ran against existing ready tree and exited0. Log cloud-check-approved-native-rerun.log.

Verification preparation required narrow reviewed fixes: initial PL extra-file gap and absent source witness; exact PL lifecycle map corrected to committed SHA files after producer-generated build/.gradle false rejection; native QRC Reveal route/query corrected using existing parser+URL; Cloud obsolete aggregate corrected via existing installed loader. Focused RED→GREEN evidence saved in corresponding /tmp/ready-asset-* reports/logs. No failed gates hidden, outputs rewritten or tests weakened.

Current eight-group local status snapshot in final-eight-group-proof-status.json: all8 native build receipts and final four-check gates exist. At snapshot Core/Print/Moodle/PL immutable demo publication receipts existed; composition/QRC/external/Cloud were locally verified and awaiting root normal publisher completion. This snapshot reads receipt files and is not a fresh remote query. Root owns publication and subsequent main/cleanup decisions.

All own sessions finished. No broad runtime retests repeated.
