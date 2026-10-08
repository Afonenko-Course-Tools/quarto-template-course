# Existing Core draft recovery review — 2026-10-08

**Approved.** No blocking findings in the supplied recovery script and helper patch.

The recovery binds publication to repository `Afonenko-Course-Tools/quarto-course`, release ID `406364109`, tag `v4.0.0`, and commit `d58494171e3020957b64ed229cbc8537751e3beb`. Before its single publication PATCH it validates clean exact local main, successful exact-source main CI, enabled immutable releases, absent local/remote tag, original manifest and local hashes/sizes, reproduced native archive bytes, unique matching draft identity/title/notes/unpublished state, and downloaded asset bytes/digests. The mutation has no create, upload, overwrite, or delete route. Post-publication checks require the same immutable published release and reverify its downloaded assets.

The dated helper correction uses release-ID lookup/download/update consistently, and prevents a fresh publisher from treating an existing draft as absence. Existing provenance gates remain intact in the presented diff.

Nonblocking operational limitation: full release-JSON equality can reject a valid unchanged draft if GitHub updates a mutable field such as an asset download count. This fails closed before publication in draft verification; a post-publication equality failure can report failure after publication. If that happens, inspect the exact ID and existing receipts instead of rerunning publication or the fresh publisher. This does not permit wrong-source or wrong-ID publication.

Scope: read-only review of the three supplied files only; no remote calls, tests, source edits, or publication performed by this reviewer. The supplied recovery report records successful read-only validation, three regression tests, and compilation checks; those were not independently rerun.
