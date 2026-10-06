# Released Quarto extensions

The template installs published extension releases from the
[Afonenko-Course-Tools](https://github.com/Afonenko-Course-Tools) repositories.
The exact release tags and installation locations are the explicit `quarto add
organization/repository@version` commands in
[tools/install-extensions.sh](tools/install-extensions.sh).

Installed `_extensions` directories, including bundled dependencies and
licenses, are committed with the course source. Each `_extension.yml` reports
the extension's semantic version. A Course repository release contains Core,
Presentation and Navigation at the same bundle version; authored YAML chooses
which contributions are active. Unrelated author themes are preserved.

To update, select a published tag, run the installation script, review the Git
diff and run the native acceptance suite described in [README.md](README.md).
CI installs those same tagged releases with Quarto and checks the committed
extension trees through Git before exercising the course. No provider commit
registry, generated file-digest inventory, local provider checkout or Python
maintenance script is required.

Publishers update `_extension.yml`, validate the PR, merge into `main` and
publish the corresponding `vMAJOR.MINOR.PATCH` release. Published tags are
never moved; a correction is a new version. Ordinary course rendering uses the
committed installed files and does not fetch or update extensions.
