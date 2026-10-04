# Fast ActualMain tests

Run the complete bounded suite with the selected stock Quarto:

```sh
quarto run tests/run.ts --junit-path /tmp/actual-main-fast.xml
quarto run tests/run.ts tests/support/quarto-test-runner_test.ts
quarto run tests/probes/actual-main-transfer-guards.ts
```

The four existing
`tests/probes/actual-main-{receipt,public,split,transfer}-guards.ts` commands
remain compatibility entrypoints. They spawn `Deno.execPath()` with
`deno test --allow-all --cached-only --no-config`, the selected Quarto's
`$QUARTO_SHARE_PATH/deno_std/run_import_map.json`, inherited stock `DENO_DIR`,
and inherited streams; the parent propagates the child's exit. No system Deno or
new dependency is used. Normal operation/resource sanitizers remain enabled.

Filter cases or select one suite:

```sh
quarto run tests/run.ts --filter 'actual-main split' --junit-path /tmp/split.xml
quarto run tests/run.ts tests/diagnostics/actual-main-retention_test.ts
```

Quarto 1.10.18 and 1.11.5 bundle Deno 2.7.14. Each parameterized case is
registered with an ordinary `for` loop and `Deno.test`. JUnit includes filtered
cases as `<skipped/>`; its total includes those skipped cases. Filtered runs are
development checks and never substitute for complete Native evidence.

| Suite                            | Existing logical checks / named tests |
| -------------------------------- | ------------------------------------: |
| receipt contracts                |                                    63 |
| public metadata contracts        |                                    13 |
| split contracts                  |                                    33 |
| public archive/artifact transfer |                                    16 |
| diagnostic storage and ordering  |                                    38 |
| total                            |                                   163 |

The separate launcher regression suite has three real child-process checks:
registered failures return exit 1 and preserve streams; filtering executes the
positive control and writes JUnit; an intentional leaked file is refused by the
normal sanitizer. These do not alter the 163 contract checks.

Synthetic receipt factories live in `tests/support/actual-main-fixture.ts` and
do not execute tests on import. Each call returns independent mutable data. Case
tables keep a stable name, goal, mutation, and expected refusal together.
Receipt, split, metadata, and diagnostic geometry cases require the specific
contract message; filesystem collisions require `Deno.errors.AlreadyExists`.
Archive refusals match the extractor's specific assertion location and refusal
family. The existing producer and contract validators remain separate.

The diagnostic fixture keeps its own 19-tuple / 228-candidate oracle. It does
not import the producer candidate builder or candidate hashing policy. Opaque
bytes, finite closure, sparse/absent rows, forbidden neighbors, real read races,
exclusive write collisions, and awaited cleanup barriers retain their original
assertions. Temporary roots are created within each test and removed in
`finally`.

Optional legacy JSON remains available:

```sh
ACTUAL_MAIN_RETENTION_PURE_OUTPUT=/tmp/fresh-retention \
  quarto run tests/probes/actual-main-transfer-guards.ts
```

`retention-pure-result.json` records only executed diagnostic cases, with
`nativeExecuted: false`. A preexisting result file is refused. The report is
updated after each executed case so partial or failed runs remain diagnostic.
The complete transfer facade or complete `tests/run.ts` records
`publicTransferChecks: 16` only after all public checks and all 38 diagnostic
cases pass. A filtered or direct diagnostic-only run leaves that field at zero.

Fast guards run in the two existing student jobs immediately after Quarto setup,
before PDF installation and Native attempts. Their JUnit files are uploaded
under `actual-main-fast-<version>`. Required job names and the student → full →
late Native chain are unchanged. The final aggregate retains its four
compatibility guards and its source/provider/raw-log checks. JUnit cannot
replace those checks.

## Preserved split case map

The two positive controls are the complete six-job matrix and complete portable
student baseline. The 31 unchanged mutations follow:

| Mutation / stable case name                        | Required refusal                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| missing original job                               | `ACTUAL_MAIN_SPLIT: required six original native jobs/receipts`                           |
| duplicate original job                             | `ACTUAL_MAIN_SPLIT: required six original native jobs/receipts`                           |
| old compound phase is not a split matrix           | `ACTUAL_MAIN_SPLIT: required six original native jobs/receipts`                           |
| failed actual phase                                | `ACTUAL_MAIN_RECEIPT: required phase did not succeed`                                     |
| source bytes forged consistently                   | `ACTUAL_MAIN_RECEIPT: Template bytes differ from exact aggregation checkout`              |
| current provider ref changed                       | `ACTUAL_MAIN_RECEIPT: provider ref core`                                                  |
| member install missing                             | `ACTUAL_MAIN_RECEIPT: missing, duplicated or misplaced actual member package proof`       |
| single phase executes duplicate labels             | `ACTUAL_MAIN_RECEIPT: wrong original-course labels or fixture25 double count`             |
| full does not import genuine student tree          | `ACTUAL_MAIN_SPLIT: positive changed opposite public profile`                             |
| public full lineage receipt changed                | `ACTUAL_MAIN_SPLIT: full imported wrong public lineage`                                   |
| public manifest has permission handle              | `ACTUAL_MAIN_SPLIT: safe source/install manifest: unknown/private/missing fields`         |
| public baseline has private index                  | `ACTUAL_MAIN_SPLIT: public baseline: unknown/private/missing fields`                      |
| public nested source has permission payload        | `ACTUAL_MAIN_SPLIT: safe source: unknown/private/missing fields`                          |
| public package carries permission metadata         | `ACTUAL_MAIN_SPLIT: safe package: unknown/private/missing fields`                         |
| public map carries private owner dir               | `ACTUAL_MAIN_SPLIT: private state is not public retention input`                          |
| public baseline differs from actual native receipt | `ACTUAL_MAIN_SPLIT: public lineage differs from actual completed job`                     |
| missing raw baseline receipt digest                | `ACTUAL_MAIN_SPLIT: public baseline receipt SHA`                                          |
| wrong imported channel                             | `ACTUAL_MAIN_SPLIT: wrong same-run/channel/source public input or private proof transfer` |
| full imported private state                        | `ACTUAL_MAIN_SPLIT: wrong same-run/channel/source public input or private proof transfer` |
| late imports old native artifact instead public    | `ACTUAL_MAIN_SPLIT: wrong same-run/channel/source public input or private proof transfer` |
| late starts different genuine maps                 | `ACTUAL_MAIN_SPLIT: late baseline is not genuine public bytes`                            |
| unrelated late nonzero                             | `ACTUAL_MAIN_SPLIT: unrelated/nonobserved native refusal`                                 |
| late reused current owner index                    | `ACTUAL_MAIN_SPLIT: late permission index reused`                                         |
| late mutated before child finish                   | `ACTUAL_MAIN_SPLIT: wrong current mutation ordering`                                      |
| late changed prior publication                     | `ACTUAL_MAIN_SPLIT: late altered prior publications`                                      |
| temporary public late events                       | `ACTUAL_MAIN_SPLIT: late created temporary public files`                                  |
| unknown alternate completed labels                 | `ACTUAL_MAIN_SPLIT: not the required completed public labels`                             |
| positive attempts reused                           | `ACTUAL_MAIN_SPLIT: positive native attempt reused`                                       |
| wrong actual native input coverage                 | `ACTUAL_MAIN_RECEIPT: original book4/essay5 native source subset or drift`                |
| private state transfer fields added                | `ACTUAL_MAIN_SPLIT: imported public lineage: unknown/private/missing fields`              |
| completed public PDF omitted                       | `ACTUAL_MAIN_SPLIT: positive archive differs from complete current trees`                 |

## Preserved transfer case map

The transfer facade executes all 54 existing logical cases. The public suite has
these 12 archive cases:

`valid`, `symlink`, `hardlink`, `traversal`, `private`, `extra`, `missing`,
`duplicate`, `alias`, `map-drift`, `archive-drift`, `stale-destination`.

And these four downstream artifact cases:

`native-log`, `private-index`, `missing-public-receipt`, `symlink-receipt`.

The diagnostic suite preserves these 38 independent or procedural cases:

1. all 228 finite files and opaque witness bytes
2. preparation without adapter state, sparse rows survive Source cleanup
3. student actual portal failure geometry
4. student actual book failure geometry
5. student actual essay failure geometry
6. full actual portal failure geometry
7. full actual book failure geometry
8. full actual essay failure geometry
9. successful fixture attempt produces no failure manifest
10. request SHA mismatch before candidate access
11. wrong actual root geometry before copy
12. wrong actual source-root geometry before copy
13. wrong actual attempt geometry before copy
14. wrong actual profiles geometry before copy
15. wrong actual member-path geometry before copy
16. wrong actual member-mount geometry before copy
17. wrong actual member-format geometry before copy
18. wrong actual missing-member geometry before copy
19. wrong actual portal-input geometry before copy
20. wrong actual portal-control geometry before copy
21. wrong actual portal-output geometry before copy
22. escaping registered source refuses even with matching request SHA
23. symlink request refuses before copy
24. hardlink request refuses before copy
25. diagnostic sink cannot alias original or Source
26. symlink sink ancestor refuses before copy
27. preexisting attempt destination cannot overwrite
28. duplicate notification cannot overwrite first evidence
29. candidate directory is secondary refusal with partial preservation
30. candidate symlink is secondary refusal with partial preservation
31. candidate hardlink is secondary refusal with partial preservation
32. real source mutation after read is unstable and preserves other rows
33. produced candidate disappearing after read is unstable, not absent
34. exclusive destination collision preserves sentinel and partial manifest
35. selected Source hash drift is recorded without suppressing copies
36. publication finalize retains actual stage facts
37. deferred PURE retention resolves before simulated cleanup
38. PURE caller keeps primary refusal with retention and cleanup errors
