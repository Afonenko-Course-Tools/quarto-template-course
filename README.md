# Native Quarto course template

The course is a normal Quarto website. Its landing page composes five independently renderable parts: theory, tasks, lectures, practice, and handbook. Tasks contain canonical exercises; the other parts link to them through Reference Catalog. Books, Reveal slides, includes, listings, navigation, and execution remain native Quarto features.

Install Quarto 1.10.18 or 1.11.5 and CUE v0.17.1, then run:

```sh
quarto render . --profile student
quarto render . --profile full
quarto preview --profile student --no-watch-inputs
```

The outputs are `_site-student` and `_site-full`. Each part has separate profile output directories. Repeated renders retain `.quarto` and `_freeze`; the site coordinator collects only the successful current native render and fresh assets. A failed build returns a nonzero exit; fix the source and rerun the same command. The full profile includes teacher material and is not deployed by the workflow.

`course-site.projects` in `_quarto.yml` declares the five native projects, their formats, and mounts. Root hooks coordinate the site. Each Course part explicitly runs Core pre/post hooks; Download follows Core where enabled, QRC follows Download, and site collection runs last. A part can be rendered directly from its directory. Quarto determines selected-file and preview scope; the coordinator follows its public full-render flag.

The repository contains complete installed extension packages. `providers.json` pins their source commits; `installed-packages.json` records every installed file and SHA256 digest. `python3 tests/native/packages.py` verifies all copies. Maintainers with sibling provider checkouts can refresh whole frozen packages with `python3 tools/sync-providers.py`; this uses `git archive` and ordinary `quarto add`, then checks the full installed file set and bytes.

The original author course remains in `fixtures/probes/original-course`, with its books, essays, PDF handout, Java starter projects, private controls, and themes. Its acceptance fixture overlays the corresponding complete installed packages without changing its authored sources. See [the migration notes](docs/original-author-migration.md).

Optional native examples are `examples/cloud`, `examples/prairielearn`, and `examples/exports`. The export example produces current Core Body packages for Print and Moodle. Print consumes the public package and emits a PDF with attachments; Moodle consumes the teacher package and an explicit binding and emits XML with attachments. Export generation does not deploy a VM or submit work to an LMS.

```sh
python3 tests/native/packages.py
quarto run tests/native/config.ts
python3 tests/native/run.py all --workspace /tmp/course-native
python3 tests/native/exports.py /tmp/course-native/neutral
python3 tests/native/lifecycle.py /tmp/course-native/neutral
python3 tests/native/preview.py /tmp/course-native/neutral
```

Set `QUARTO` to select a specific local executable. Use separate cache directories for the two Quarto versions, and retain each directory across repeated renders. The suite checks student → full → student, native books/slides/PDF, local links, catalogs and search, actual resources, optional adapters, exports, failed-build retry, current output selection, and preview. GitHub Actions runs both fixed versions on pull requests and `main`.

Publication is optional. After configuring GitHub Pages for the repository with **GitHub Actions** as its source, set the repository Actions variable `COURSE_PUBLISH_PAGES` to `true`. Successful `main` builds then upload and deploy the student site through standard GitHub Pages actions. With the variable unset, all native validation still runs and publication is skipped. Pull requests never publish.
