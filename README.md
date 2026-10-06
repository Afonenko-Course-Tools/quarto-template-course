# Native Quarto course template

The course is a normal Quarto website. Its landing page composes five independently renderable parts: theory, tasks, lectures, practice, and handbook. Tasks contain canonical exercises; the other parts link to them through Reference Catalog. Books, Reveal slides, includes, listings, navigation, and execution remain native Quarto features.

Start from the versioned template checkout:

```sh
git clone --branch v1.0.0 --depth 1 https://github.com/Afonenko-Course-Tools/quarto-template-course.git my-course
cd my-course
```

Install Quarto 1.10.18 or 1.11.5 and CUE v0.17.1, then run:

```sh
quarto render . --profile student
quarto render . --profile full
quarto preview --profile student --no-watch-inputs
```

The outputs are `_site-student` and `_site-full`. Each part has separate profile output directories. Repeated renders retain `.quarto` and `_freeze`; the site coordinator collects only the successful current native render and fresh assets. A failed build returns a nonzero exit; fix the source and rerun the same command. The full profile includes teacher material and is not deployed by the workflow.

`course-site.projects` in `_quarto.yml` declares the five native projects, their formats, and mounts. Root hooks coordinate the site. Each Course part explicitly runs Core pre/post hooks; Download follows Core where enabled, QRC follows Download, and site collection runs last. A part can be rendered directly from its directory. Quarto determines selected-file and preview scope; the coordinator follows its public full-render flag.

Reveal sources use `##` for a section and `###` for its slides. A section heading may introduce content or stand alone as a divider; Course Navigation takes the group name from that heading. Existing `sec-*` IDs remain the link targets. Under `format.revealjs`, `shift-heading-level-by: -1` maps these authoring levels to native Reveal H1/H2, `slide-level: 2` creates the slide structure, and `navigation-mode: linear` moves through slides in order. The shift is scoped to Reveal so book and handout headings retain their own levels. No custom section attribute is required.

The repository contains installed extension releases in `_extensions`, committed with the course source. Refresh them with `bash tools/install-extensions.sh`: the script contains explicit `quarto add organization/repository@version --no-prompt` commands for the root, parts and examples. It requires Quarto and Bash, with no Python, local provider checkouts, custom package registry or file-hash manifest. The Course release installs Core, Presentation and Navigation together; authored YAML selects the filters and plugins that are used.

To upgrade, choose a published release tag in the install script, run it, inspect the Git diff and run the native acceptance suite. CI repeats the tagged installation and checks that it reproduces the committed `_extensions` through Git. Release tags are never moved. Extension publishers update `version` in `_extension.yml`, merge the tested PR into `main`, and publish the matching `vMAJOR.MINOR.PATCH` tag. The template itself is released as `v1.0.0`.

The original author course remains in `fixtures/probes/original-course`, with its books, essays, PDF handout, Java starter projects, private controls, and themes. Its acceptance fixture overlays the corresponding complete installed packages without changing its authored sources. See [the migration notes](docs/original-author-migration.md).

Optional native examples are `examples/cloud`, `examples/prairielearn`, and `examples/exports`. The export example produces current Core Body packages for Print and Moodle. Print consumes the public package and emits a PDF with attachments; Moodle consumes the teacher package and an explicit binding and emits XML with attachments. Export generation does not deploy a VM or submit work to an LMS.

```sh
bash tools/install-extensions.sh
quarto run tests/native/config.ts
quarto run tests/native/run.ts all --workspace /tmp/course-native
quarto run tests/native/exports.ts /tmp/course-native/neutral
quarto run tests/native/lifecycle.ts /tmp/course-native/neutral
quarto run tests/native/preview.ts /tmp/course-native/neutral
```

Set `QUARTO` to select a specific local executable. Use separate cache directories for the two Quarto versions, and retain each directory across repeated renders. The suite checks student → full → student, native books/slides/PDF, local links, catalogs and search, actual resources, optional adapters, exports, failed-build retry, current output selection, and preview. GitHub Actions runs both fixed versions on pull requests and `main`.

Publication is optional. After configuring GitHub Pages for the repository with **GitHub Actions** as its source, set the repository Actions variable `COURSE_PUBLISH_PAGES` to `true`. Successful `main` builds then upload and deploy the student site through standard GitHub Pages actions. With the variable unset, all native validation still runs and publication is skipped. Pull requests never publish.
