# Current OriginalCourse consumer

The original five-part course is tested with its authored Book and Essay inputs, named Reveal outputs, mounted PDF, roles, visibility, QRC, archives and local links on stock Quarto 1.10.18 and 1.11.5. Each channel must complete fresh student, full and late phases before acceptance.

Current Source: `21ef5f04897ebd715e4022fbe5ee31906ee82afa`, tree `e48bd39001f3279d9fc86e10a0c92264d91bfd2a`.

The OriginalCourse verifier now checks standard native search separately in the portal, Book and Essay projects. The previous assertion required every mount in the portal's search index, which contradicted the agreed scope of project-local Quarto search. On a75429f, Stable failed with `ACTUAL_MAIN_NATIVE: native search omitted book` after the native assemblies and QRC finished. The failure artifact did not retain the actual search JSON, so its individual hrefs are not claimed here. Fresh stock controls on both channels reproduced the old assertion failure and passed the corrected checks using three independently rendered projects. The native search implementation and provider packages are retained.

The optional single `./` spelling in Book's native portal backlink remains accepted by both existing assertions. Pages retains both original profiles, optional examples, external checks and all assertions with its 360-minute budget; the prior 240-minute run had a confirmed job timeout.

Validation for the new two-file correction:

- Six fresh stock HTML renders and both runtime version checks passed. The old/new exact search and retained visibility blocks passed 20 regression cases per channel, including missing, malformed, wrong-project and closed-marker cases.
- Paired static type checking passed with each bundled runtime/import map. Independent review passed 2590 conditions; the committed whole 858-file Source matched the reviewed bytes and modes.
- All authored QMD/configs and extension payloads are unchanged by this correction. The full Core pin remains `fe576c4eb1d77191b89216ae2e6bbdaef50b28a2`, with 104 files in each root/Book/Essay package.

The earlier a75429f Portal fixture completed all five CI jobs and its official saved-byte aggregate; that remains evidence for that Source and fixture scope. It does not accept the new head or the six OriginalCourse phases.

Fresh local student commands and all six current-head CI phases are required for 21ef5f0. Acceptance remains pending their actual results, whole installations, public-map/receipt lineage and exact late `SOURCE.PUBLICATION_ADDRESS_CHANGED` refusal. No full/late phase can use a prior Source's public parent or private Owner state. This remains a Draft; merge and release are outside this change.
