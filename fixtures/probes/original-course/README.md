# Original course regression

This fixture preserves the authored five-member course from Template
`bca2eb3c34a2476de2635e435772743483156043`. Its book4/essay5 inputs, four
Listing declarations, PDF handout, Java resources, private controls and
production adapters are preserved. The explicit canonical metadata migration
is documented in `docs/original-author-migration.md`; three slide display blocks
use native `exm` and keep their solutions explicitly full-only. It is an independent native regression,
not the neutral starter course.

`tests/probes/actual-main-consumer.ts` starts from the complete authenticated
Template checkout, then mounts this fixture at the fresh native root using
`tests/probes/original-course-source.ts`. Installed extensions remain at their
shared root/book/essay/lectures/practice scopes; this fixture contains none.
Within the active Original member directories, only relocated Original authored
files and the shared installed extensions are mounted. Neutral-only authored
files remain authenticated checkout inputs but cannot join Original wildcard
render selections. The native consumer inspects exact historical inputs for all
five members before rendering their original configurations.
The native consumer reinstalls complete frozen provider packages and retains
all current/source/resource/private/late guards. It overlays the finite adapter
payload listed in `tests/probes/actual-main-settings.json`, including the internal
diagnostic modules, only after authenticating all authored bytes.

Run the documented Original consumer, not `quarto render` in this directory:
relative package paths intentionally describe the fresh native root.
`tests/check-original.ts --root <fresh-native-root> --skip-render` retains the
previous product assertions. The full-release/release consumer invokes it
after both genuine public trees exist.

The sibling `five-parts` fixture remains the previous P0 probe. Neither fixture
is included in the neutral product publication.
