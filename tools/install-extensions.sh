#!/usr/bin/env bash
# Install released extension bundles through Quarto; run from any directory.
set -euo pipefail
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
quarto=${QUARTO:-quarto}
cd "$repo"

# A quarto-course release contains Core, Presentation and Navigation together.
# Only the filters/plugins selected in authored YAML are activated.
for scope in . theory tasks lectures practice handbook book essay examples/cloud examples/prairielearn examples/exports; do
  (cd "$scope"; "$quarto" add Afonenko-Course-Tools/quarto-course@v2.1.0 --no-prompt)
done
for scope in . theory tasks lectures practice handbook book essay examples/cloud examples/prairielearn; do
  (cd "$scope"; "$quarto" add Afonenko-Course-Tools/quarto-reference-catalog@v2.1.0 --no-prompt)
done
"$quarto" add Afonenko-Course-Tools/quarto-project-publish@v3.0.1 --no-prompt
"$quarto" add Afonenko-Course-Tools/quarto-course-print@v0.1.1 --no-prompt
"$quarto" add Afonenko-Course-Tools/quarto-course-moodle@v0.1.1 --no-prompt
(cd examples/cloud; "$quarto" add Afonenko-Course-Tools/quarto-course-cloud@v2.0.1 --no-prompt)
(cd examples/prairielearn; "$quarto" add Afonenko-Course-Tools/quarto-course-prairielearn@v2.0.1 --no-prompt)
for scope in tasks book essay; do
  (cd "$scope"; "$quarto" add Afonenko-Course-Tools/quarto-project-download@v1.0.1 --no-prompt)
done
