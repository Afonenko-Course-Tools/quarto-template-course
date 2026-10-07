# Focused review: native Task installation directories

Scope: `quarto-course` worktree `fix/demo-task-directories-20261007` against
`main`/HEAD `aa91437e41d7f5c9686bfef4efe2c7892c11d67e`. Read-only review of the
three example changes, plus the equivalent producer Taskfiles currently in
Publisher and QRC. No product implementation changes or heavy Core suite rerun.

**Approval: no important findings in this fix.**

The old command-level `dir: slides` did not change the installation working
directory. The new internal `install:slides` task sets `dir: slides` on the task
itself and is called synchronously from `install`, preserving the native Quarto
installation command and its exact `v3.0.0` dependency. The same pattern correctly
installs QRC into Publisher `book`/`materials` and QRC
`book`/`lectures`/`practice`. No custom dependency resolver or additional render
pass was introduced.

Validation:

- Official Task v3.54.0 [schema reference](https://taskfile.dev/docs/reference/schema)
  lists `dir` under Task Properties; the Command Object properties do not include
  it. The docs were inspected directly during review.
- Ran actual installed Task 3.54.0 against unchanged copied Taskfiles in fresh
  temporary directories containing Unicode and spaces. A PATH-local Quarto
  recorder captured every native invocation and actual cwd. Core produced
  `[root, slides]`, Publisher `[root, root, book, materials]`, and QRC
  `[root, root, book, lectures, practice]`; all retained exact pinned versions and
  `--no-prompt`. Fixture/logs: `/tmp/demo-task-review-ojnqniwx/`.
- Inspected `core-task-directories-fixed.log`: real tagged installation finds
  and installs all three bundle extensions in the slides project; native book
  and Reveal rendering succeed, the slides resource tree is copied into the
  book output, and the native build-info command completes.
- Both Core rendered source links now identify `demo-20261007`, whose producer
  SHA can include this demo-only fix; dependencies remain the already published
  immutable `v3.0.0`. The documentation catalog also points at that demo source
  tag. Publisher/QRC source links use their still-unreleased extension tags,
  which can identify their final merged Taskfile fixes.
- BUILD generation retains the full producer commit, explicit dependency
  versions and dirty-state evidence. Final demo archive/BUILD validation must
  remain after the demo PR merge and a clean build from its merged SHA; the
  current local success receipt is not a release provenance receipt.

The existing local real install/render receipt and the cwd regression exercise
cover this narrow fix. A schema-validation framework or another full Core test
run is unnecessary. Windows/macOS command execution was not performed by this
review.
