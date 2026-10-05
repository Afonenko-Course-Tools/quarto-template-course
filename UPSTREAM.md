# Installed provider provenance

`providers.json` is the source of truth for provider repositories, frozen commits, extension names, and installed scopes. `installed-packages.json` records each provider's `_extensions` Git tree and the full file set, SHA256, size, and installed mode of every package.

`tools/sync-providers.py` creates a local Git archive of each frozen commit, installs it with stock `quarto add`, compares all installed bytes to the archive, and replaces each declared package as a whole. It preserves unrelated BSU themes. `tests/native/packages.py` independently checks every installed scope against the recorded manifest. The manifests provide supply provenance; they do not participate in rendering or impose runtime identity checks.

Core supplies Course capture, Body/resources, Presentation, and Navigation. Reference Catalog resolves explicit current outputs and search. Course Site coordinates native project renders. Download, Print, Moodle, Cloud, and PrairieLearn each use their provider's installed API. The template contains no copied provider domain logic or build coordinator implementation.
