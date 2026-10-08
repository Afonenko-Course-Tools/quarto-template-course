# Dated ready demo verifier (2026-10-08)

Prepared script: `/tmp/ready-asset-verification-prep-20261008.py`.
No producer builds/releases were run, no repository content changed.

After each owner's ALL native group builds finish with the dated builder, execute:

```sh
python3 /tmp/ready-asset-verification-prep-20261008.py quarto-course EXACT_CORE_SHA --evidence /tmp/course-release-20261008/receipts
python3 /tmp/ready-asset-verification-prep-20261008.py quarto-project-publish EXACT_PUBLISH_SHA --evidence /tmp/course-release-20261008/receipts
python3 /tmp/ready-asset-verification-prep-20261008.py quarto-reference-catalog EXACT_QRC_SHA --evidence /tmp/course-release-20261008/receipts
python3 /tmp/ready-asset-verification-prep-20261008.py quarto-course-print EXACT_PRINT_SHA --evidence /tmp/course-release-20261008/receipts
python3 /tmp/ready-asset-verification-prep-20261008.py quarto-course-moodle EXACT_MOODLE_SHA --evidence /tmp/course-release-20261008/receipts
python3 /tmp/ready-asset-verification-prep-20261008.py quarto-course-prairielearn EXACT_PL_SHA --evidence /tmp/course-release-20261008/receipts
python3 /tmp/ready-asset-verification-prep-20261008.py quarto-course-cloud EXACT_CLOUD_SHA --evidence /tmp/course-release-20261008/receipts
```

Each owner creates a fresh evidence/checks/OWNER directory. Already-existing directory causes failure, preserving previous evidence. Checks JSON is written ONLY after every owner group passes and clean main SHA is rechecked. QRC requires both qrc and external receipts.

Publisher consumes:
`--verified-demo-checks /tmp/course-release-20261008/receipts/checks/OWNER/verified-demo-checks.json`
with SAME `--evidence` argument as native builder. The publisher's adjacent build receipt path is evidence/builds/GROUP/operation-receipt.json (outside ready root), not a BUILD embedded receipt.

Exact native BUILD and SHA-256 tree are copied into ephemeral harness/tests/ready-assets.json. Existing template tests/site.cjs is executed unchanged with `--demo-dir ABS_READY --demo-group GROUP`. It validates exact BUILD, sourceDirty:false, all tree hashes/symlinks, Russian Quarto HTML, source ref URLs, no duplicate source actions, every local href/src resource. sourceRef is the published OWN TOOL tag from receipt (v4.0.0/v5.0.0/v3.0.0/v0.3.0), whose SHA must equal producer SHA; demo-20261008 and the tool tag share that SHA. Existing producer sources intentionally link to tool version tags, so do not set ephemeral sourceRef to demo-20261008.

Supplemental actual outputs:

- Print: pdfinfo and pdftotext on ordinary.pdf and both handout.pdf files; nonempty pages/text, authored group/header/control condition and absence of unassigned bank task.
- Moodle: existing tests/xml.ts bundled DOM parser (no new parser/dependency); exact two assigned question keys in each XML and TLS as sole full-credit keyed choice in B.
- PL: exact question selection and info policy, actual delivered clientFilesQuestion/tests bytes compared with native source; existing Gradle contract against delivered tests in a temporary copy, reference succeeds and student fails. Native builder already runs source Gradle before export; this checks delivered bytes too.
- Cloud: syntax-check authored external shell action, inspect actual native course.json for exact configure/client steps and external action source; absence of private projects folder from ready root. Native build already runs installed Core validation and selected-work extraction.
- QRC/composition/external: actual catalogs passed through existing validateImportedCatalog and ready HTML parsed by existing QRC html.ts; every actual QRC link has href/caption, every local target fragment exists, and at least one real QRC link is present. No new HTML parser.

Verification preparation evidence: Python syntax/CLI checks pass. Read-only supplemental checks against existing OLD template trees passed actual external QRC (3 links) and Moodle A/B XML. Existing OLD external ready tree fails today's template harness Russian HTML check, expected to be replaced by new native tree; test was not weakened. NEW exact trees have not yet been built or checked by this script; this report does not claim release readiness.
