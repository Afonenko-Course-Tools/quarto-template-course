# Core v4.0.0 existing draft recovery — 2026-10-08

No remote mutation was performed. Core main and the original two local-tools helpers were not modified.

## Diagnosis

The original dated helper created the draft successfully and then requested `/repos/Afonenko-Course-Tools/quarto-course/releases/tags/v4.0.0`. That endpoint only retrieves published releases, so its 404 is expected for this draft, not evidence that creation failed. The Git tag also does not exist yet. Read-only listing found exactly one intended draft; GET by ID succeeds.

- Release ID: **406364109**
- tag_name: **v4.0.0**
- target_commitish: **d58494171e3020957b64ed229cbc8537751e3beb**
- title: `quarto-course v4.0.0`
- draft true; immutable false; published_at null
- URL: https://github.com/Afonenko-Course-Tools/quarto-course/releases/tag/untagged-94263573623c45b8d65f
- Assets: `quarto-course-v4.0.0.tar.gz` ID 620547170, 114119 bytes, SHA256 40fb5b3e0bee71a9d652c347e7c8d1f89c193473d9029eb374e0b03edbc63bec; `RELEASE.json` ID 620547168, 386 bytes, SHA256 670601d2fc1b42c956207830441ead459a32f23de8c5a4e9113cd190e7067823.

Official references: [tag endpoint only published releases](https://docs.github.com/en/rest/releases/releases#get-a-release-by-tag-name), [asset-ID binary download](https://docs.github.com/en/rest/releases/assets#get-a-release-asset), [release-ID update](https://docs.github.com/en/rest/releases/releases#update-a-release).

## Narrow dated-helper fix

`/tmp/course-release-20261008/publish-verified-release.py` now lists releases with pagination and requires exactly one matching intended draft, checks its exact target, and retrieves that release by ID. Each asset is downloaded via authenticated `gh api .../releases/assets/ASSET_ID -H 'Accept: application/octet-stream'`, verifying the exact name set, uploaded state, byte length, API SHA256 digest, and downloaded bytes. Publication uses PATCH by exact release ID with typed `draft=false` and `make_latest`.

All prior local source/descriptor/install/demo dependency/provenance/tree checks remain. Fresh operations additionally reject existing matching drafts (published tag absence alone was insufficient), and recheck clean source, unchanged draft metadata, absent Git tag, and immutable setting immediately before publication. Existing evidence cannot be overwritten and the fresh-operation helper has no recovery switch.

`helper.patch` is the precise diff from the failed dated helper. `publish-before.py` preserves its pre-fix bytes.

## Recovery verified, publication held

`recover-existing-core-draft.py` has only this repository/tag/SHA/release ID and the two known asset hashes. Default mode is read-only. It checks:

- clean local main at exact d584 SHA and no local or remote tag;
- repository immutable-release setting enabled;
- exact main CI run 37719402877 completed successfully at d584 on main;
- exact original manifest and local asset hashes/sizes;
- native `git archive` reproduced bytes match the original compact asset from this SHA;
- exactly one draft, exact ID/tag/title/body/SHA/unpublished state;
- downloads by asset ID match every original byte hash/size, and draft metadata stays unchanged.

Executed default recovery with exit 0: `VERIFIED EXISTING DRAFT 406364109 NO REMOTE MUTATIONS`. Receipt: `verified-existing-draft.json`. A final independent ID read still confirms draft true, published_at null. No new release, upload, tag, delete, Git fetch/reset, repository edit, or CI dispatch occurred.

## Tests and preservation

`test-draft.py`: observed RED 3 failures for missing ID lookup/download behavior; GREEN 3 passed. Tests cover published-tag avoidance, zero/duplicate/mismatching target fail-closed behavior, and asset-ID byte hash failure. Python compile check passed for both modified dated publisher and scoped recovery. Real GitHub read-only API/download verification also passed. No new dependencies or shared runtime introduced.

Original helpers remain byte-identical:

- local-tools/publish-verified-release.py SHA256 48f0352c414a2925b29b2e1af9ac5fc0cb54570f6e196e1120eb605915998062
- local-tools/build-verified-demo.py SHA256 c544c7db6e6af46d25e07163895d13a6df3c2cb318066b77ed33547c0a3d4c92

Core local HEAD remains d58494171e3020957b64ed229cbc8537751e3beb and status is clean. All called processes finished; no outstanding sessions.

## Exact future commands after root review

Re-run read-only validation:

```bash
python /tmp/release-draft-recovery-20261008/recover-existing-core-draft.py
```

Only after the root explicitly authorizes this reviewed recovery:

```bash
python /tmp/release-draft-recovery-20261008/recover-existing-core-draft.py --publish
```

The latter redoes all checks/downloads before a single publication PATCH, then requires the same ID/tag/SHA, draft false, immutable true, confirms published-tag endpoint identity, downloads/verifies the published assets again, and writes original receipt-directory draft/download/published evidence. It never creates another draft or overwrites assets. Do not rerun fresh publisher for Core v4.0.0.
