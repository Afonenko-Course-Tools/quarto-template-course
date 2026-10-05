// PURE storage/ordering fixtures only. These are not Native acceptance evidence.
import { dirname, isAbsolute, join } from "stdlib/path";
import { assert, hash } from "../probes/actual-main-evidence.ts";
import {
  armFailureDiagnostics,
  readFailureDiagnostics,
  retainFailureDiagnostics,
} from "../../fixtures/probes/actual-main/state.ts";
import type { RefusalCase } from "../support/contract-cases.ts";
import {
  fixture,
  regularExists,
  write,
} from "../support/actual-main-retention-fixture.ts";
const retentionResults: {
  name: string;
  status: "pass" | "fail";
  error?: string;
}[] = [];
let outputCreated = false;
function pure(name: string, check: (root: string) => Promise<void>) {
  Deno.test(`PURE actual-main failure retention: ${name}`, async () => {
    const root = await Deno.makeTempDir({
      prefix: "actual-main-retention-pure-",
    });
    try {
      await check(root);
      retentionResults.push({ name, status: "pass" });
    } catch (error) {
      retentionResults.push({
        name,
        status: "fail",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      try {
        const output = Deno.env.get("ACTUAL_MAIN_RETENTION_PURE_OUTPUT");
        if (output) {
          await Deno.mkdir(output, { recursive: true });
          await Deno.writeTextFile(
            join(output, "retention-pure-result.json"),
            JSON.stringify(
              {
                protocol: 1,
                scope: "PURE real-file storage and fixture ordering",
                nativeExecuted: false,
                // The parent launcher fills this only after the complete public suite succeeds.
                publicTransferChecks: 0,
                cases: retentionResults,
                passed: retentionResults.filter((r) =>
                  r.status === "pass"
                ).length,
                failed: retentionResults.filter((r) =>
                  r.status === "fail"
                ).length,
              },
              null,
              2,
            ) + "\n",
            { createNew: !outputCreated },
          );
          outputCreated = true;
        }
      } finally {
        await Deno.remove(root, { recursive: true });
      }
    }
  });
}
async function manifest(
  result: { manifestPath: string; manifestSha256: string },
) {
  assert(
    await hash(result.manifestPath) === result.manifestSha256,
    "PURE manifest SHA mismatch",
  );
  return JSON.parse(await Deno.readTextFile(result.manifestPath));
}
async function verifyRows(
  f: Awaited<ReturnType<typeof fixture>>,
  result: { manifestPath: string; manifestSha256: string },
) {
  const value = await manifest(result);
  assert(
    value.protocol === 1 && value.scope === "diagnostic-only" &&
      value.attemptId === f.attemptId &&
      value.requestSha256 === f.armed.requestSha256,
    "PURE closed diagnostic manifest anchors",
  );
  assert(
    value.label === f.request.label && value.phase === f.request.phase &&
      JSON.stringify(value.run) === JSON.stringify(f.request.run) &&
      JSON.stringify(value.anchors) === JSON.stringify(f.request.anchors) &&
      value.context.root === f.ctx.root &&
      value.context.sourceRoot === f.ctx.sourceRoot &&
      JSON.stringify(value.context.profiles) ===
        JSON.stringify(f.ctx.profiles) &&
      JSON.stringify(value.context.members) === JSON.stringify(f.ctx.members),
    "PURE request lineage and actual root/member/profile context remain exact",
  );
  assert(
    value.candidates.length === 228 && value.counts.total === 228,
    "PURE exact 228 candidate rows",
  );
  const rows = new Map(
    value.candidates.map((row: any) => [row.sourcePath, row]),
  );
  assert(rows.size === 228, "PURE unique finite candidate rows");
  for (const candidate of f.candidates) {
    const row: any = rows.get(candidate.sourcePath),
      bytes = f.content.get(candidate.sourcePath);
    assert(
      row && row.profile === candidate.profile &&
        row.sourceRelative === candidate.sourceRelative,
      "PURE exact candidate path/profile/source oracle",
    );
    if (bytes) {
      assert(
        row.status === "retained" && row.bytes === bytes.length,
        "PURE actual produced candidate must be retained",
      );
      const path = isAbsolute(row.destination)
        ? row.destination
        : join(dirname(result.manifestPath), row.destination);
      assert(
        !row.destination.split(/[\\/]/).some((p: string) => p.startsWith(".")),
        "PURE retained upload filenames must be nonhidden",
      );
      const copied = await Deno.readFile(path);
      assert(
        copied.length === bytes.length && copied.every((b, i) =>
          b === bytes[i]
        ) && await hash(path) === row.sha256,
        "PURE byte-exact opaque witness/input/observation/log retention",
      );
    } else {
      assert(
        row.status === "absent-at-notification" && row.bytes === undefined &&
          row.sha256 === undefined,
        "PURE absent candidate cannot become placeholder or proof",
      );
      if (row.destination) {
        assert(
          !await regularExists(
            join(dirname(result.manifestPath), row.destination),
          ),
          "PURE absent candidate planned destination cannot contain a placeholder",
        );
      }
    }
  }
  assert(
    value.counts.retained === f.content.size &&
      value.counts.absent === 228 - f.content.size && value.counts.errors === 0,
    "PURE finite count closure",
  );
  assert(
    !JSON.stringify(value).includes("PRIVATE AUTHORITY MUST NOT BE COPIED"),
    "PURE no forbidden neighbor contents",
  );
  return value;
}
async function refusedBeforeCopy(
  f: Awaited<ReturnType<typeof fixture>>,
  ctx = f.ctx,
  supplied = f.armed,
  expectedRefusal = "ACTUAL_MAIN_NATIVE: diagnostic directory link or alias",
) {
  let error: unknown;
  try {
    await retainFailureDiagnostics(ctx, supplied);
  } catch (e) {
    error = e;
  }
  assert(
    error instanceof Error && error.message === expectedRefusal,
    `PURE expected ${expectedRefusal}; received ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  assert(
    !await regularExists(join(f.directory, f.attemptId, "manifest.json")),
    "PURE invalid request/context must refuse before manifest/copy",
  );
  try {
    await Deno.lstat(join(f.directory, f.attemptId));
    assert(
      false,
      "PURE invalid request/context must refuse before destination creation",
    );
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
}
async function partial(
  f: Awaited<ReturnType<typeof fixture>>,
  hooks?: Parameters<typeof retainFailureDiagnostics>[2],
) {
  let error: unknown;
  try {
    await retainFailureDiagnostics(f.ctx, f.armed, hooks);
  } catch (e) {
    error = e;
  }
  assert(
    error instanceof Error && /retention incomplete/.test(error.message),
    "PURE per-candidate refusal must report secondary retention incomplete",
  );
  const manifestPath = join(f.directory, f.attemptId, "manifest.json"),
    result = { manifestPath, manifestSha256: await hash(manifestPath) };
  const value = await manifest(result);
  assert(
    value.candidates.length === 228 && value.counts.total === 228 &&
      value.counts.errors >= 1 && value.counts.retained >= 1,
    "PURE partial manifest preserves complete finite inventory and successful copies",
  );
  for (
    const row of value.candidates.filter((r: any) => r.status === "retained")
  ) {
    const path = isAbsolute(row.destination)
      ? row.destination
      : join(dirname(manifestPath), row.destination);
    assert(
      await hash(path) === row.sha256,
      "PURE partial retained files remain exact",
    );
  }
  return { value, result, error };
}
pure("all 228 finite files and opaque witness bytes", async (retentionRoot) => {
  const f = await fixture(retentionRoot, "student", true),
    result = await retainFailureDiagnostics(f.ctx, f.armed);
  await verifyRows(f, result);
  const files = await Array.fromAsync(
    Deno.readDir(join(f.directory, f.attemptId, "files")),
  );
  assert(
    files.length === 228 && files.every((entry) => entry.isFile),
    "PURE exclusive regular finite file copies only",
  );
});
pure(
  "preparation without adapter state, sparse rows survive Source cleanup",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot),
      result = await retainFailureDiagnostics(f.ctx, f.armed);
    assert(
      !await regularExists(
        join(
          f.project,
          ".project-publish/builds",
          f.attemptId,
          "actual-main-adapter.json",
        ),
      ),
      "PURE no saved adapter state",
    );
    await Deno.remove(
      join(f.project, ".project-publish/builds", f.attemptId),
      { recursive: true },
    );
    await verifyRows(f, result);
    const inventory: any = await readFailureDiagnostics(f.armed);
    assert(
      inventory.status === "retained" && inventory.attempts.length === 1 &&
        inventory.attempts[0].attemptId === f.attemptId &&
        inventory.attempts[0].manifestSha256 === result.manifestSha256 &&
        inventory.attempts[0].retainedCount === f.content.size &&
        inventory.attempts[0].absentCount === 228 - f.content.size,
      "PURE separate diagnostic inventory survives Source cleanup",
    );
  },
);
for (const profile of ["student", "full"] as const) {
  for (const namespace of [undefined, "book", "essay"] as const) {
    pure(
      `${profile} actual ${namespace || "portal"} failure geometry`,
      async (retentionRoot) => {
        const f = await fixture(retentionRoot, profile);
        f.ctx.failure = {
          phase: "render",
          operation: namespace ? "member-render" : "portal-render",
          error: {
            name: "Error",
            message: "PURE metadata-returned child refusal",
          },
        };
        f.ctx.format = "html";
        f.ctx.output = namespace
          ? join(f.sourceRoot, namespace, "_site")
          : f.ctx.portal.output;
        if (namespace) f.ctx.namespace = namespace;
        const value = await verifyRows(
          f,
          await retainFailureDiagnostics(f.ctx, f.armed),
        );
        assert(
          value.profile === profile &&
            value.context.namespace === namespace &&
            value.context.output === f.ctx.output &&
            value.context.failure.operation === f.ctx.failure.operation,
          "PURE actual namespace/output/failure facts",
        );
      },
    );
  }
}
pure(
  "successful fixture attempt produces no failure manifest",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot),
      value: any = await readFailureDiagnostics(f.armed);
    assert(
      value.status === "not-notified" && value.attempts.length === 0 &&
        await regularExists(f.armed.requestPath),
      "PURE armed success has request only",
    );
    assert(
      !await regularExists(join(f.directory, f.attemptId, "manifest.json")),
      "PURE successful attempt no failure manifest",
    );
  },
);
pure("request SHA mismatch before candidate access", async (retentionRoot) => {
  const f = await fixture(retentionRoot);
  await refusedBeforeCopy(f, f.ctx, {
    ...f.armed,
    requestSha256: "0".repeat(64),
  }, "ACTUAL_MAIN_NATIVE: diagnostic request SHA/stability mismatch");
});
type RetentionFixture = Awaited<ReturnType<typeof fixture>>;
const geometryCases: RefusalCase<RetentionFixture>[] = [
  {
    name: "root",
    goal: "require the registered original project root",
    mutate: (f) => {
      f.ctx.root = join(f.base, "unregistered-project");
    },
    expectedRefusal:
      "ACTUAL_MAIN_NATIVE: diagnostic context root/attempt/source/profile mismatch",
  },
  {
    name: "source-root",
    goal: "require the current attempt Source directory",
    mutate: (f) => {
      f.ctx.sourceRoot = join(
        f.project,
        ".project-publish/builds",
        "wrong-attempt",
        "sources",
      );
    },
    expectedRefusal:
      "ACTUAL_MAIN_NATIVE: diagnostic context root/attempt/source/profile mismatch",
  },
  {
    name: "attempt",
    goal: "require a literal current attempt identifier",
    mutate: (f) => {
      f.ctx.attemptId = "escape/attempt";
    },
    expectedRefusal:
      "ACTUAL_MAIN_NATIVE: diagnostic context root/attempt/source/profile mismatch",
  },
  {
    name: "profiles",
    goal: "require the armed audience",
    mutate: (f) => {
      f.ctx.profiles = ["full"];
    },
    expectedRefusal:
      "ACTUAL_MAIN_NATIVE: diagnostic context root/attempt/source/profile mismatch",
  },
  {
    name: "member-path",
    goal: "require the registered member path",
    mutate: (f) => {
      f.ctx.members[0].path = join(f.sourceRoot, "essay");
    },
    expectedRefusal: "ACTUAL_MAIN_NATIVE: diagnostic member context mismatch",
  },
  {
    name: "member-mount",
    goal: "require the registered member mount",
    mutate: (f) => {
      f.ctx.members[0].mount = "wrong-book";
    },
    expectedRefusal: "ACTUAL_MAIN_NATIVE: diagnostic member context mismatch",
  },
  {
    name: "member-format",
    goal: "require the registered member format",
    mutate: (f) => {
      f.ctx.members[0].format = "pdf";
    },
    expectedRefusal: "ACTUAL_MAIN_NATIVE: diagnostic member context mismatch",
  },
  {
    name: "missing-member",
    goal: "require all five registered members",
    mutate: (f) => {
      f.ctx.members.pop();
    },
    expectedRefusal: "ACTUAL_MAIN_NATIVE: diagnostic member context mismatch",
  },
  {
    name: "portal-input",
    goal: "require the root portal input",
    mutate: (f) => {
      f.ctx.portal.input = join(f.sourceRoot, "book/index.qmd");
    },
    expectedRefusal: "ACTUAL_MAIN_NATIVE: diagnostic portal context mismatch",
  },
  {
    name: "portal-control",
    goal: "require the portal control",
    mutate: (f) => {
      f.ctx.portal.control = join(f.sourceRoot, "_quarto.yml");
    },
    expectedRefusal: "ACTUAL_MAIN_NATIVE: diagnostic portal context mismatch",
  },
  {
    name: "portal-output",
    goal: "require current portal output geometry",
    mutate: (f) => {
      f.ctx.portal.output = join(f.base, "outside-output");
    },
    expectedRefusal: "ACTUAL_MAIN_NATIVE: diagnostic portal context mismatch",
  },
];
for (const scenario of geometryCases) {
  pure(
    `wrong actual ${scenario.name} geometry before copy`,
    async (retentionRoot) => {
      const f = await fixture(retentionRoot);
      scenario.mutate(f);
      await refusedBeforeCopy(f, f.ctx, f.armed, scenario.expectedRefusal);
    },
  );
}
pure(
  "escaping registered source refuses even with matching request SHA",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot),
      request = JSON.parse(await Deno.readTextFile(f.armed.requestPath));
    request.sourceInputs.student.book[0] = "book/../escape.qmd";
    await Deno.writeTextFile(
      f.armed.requestPath,
      JSON.stringify(request) + "\n",
    );
    await refusedBeforeCopy(f, f.ctx, {
      ...f.armed,
      requestSha256: await hash(f.armed.requestPath),
    }, "ACTUAL_MAIN_NATIVE: invalid diagnostic finite source registry");
  },
);
for (const link of ["symlink", "hardlink"] as const) {
  pure(`${link} request refuses before copy`, async (retentionRoot) => {
    const f = await fixture(retentionRoot),
      actual = join(f.base, "request-linked.json");
    await Deno.rename(f.armed.requestPath, actual);
    if (link === "symlink") await Deno.symlink(actual, f.armed.requestPath);
    else await Deno.link(actual, f.armed.requestPath);
    await refusedBeforeCopy(
      f,
      f.ctx,
      f.armed,
      "ACTUAL_MAIN_NATIVE: diagnostic file is not an unlinked regular file",
    );
  });
}
pure(
  "diagnostic sink cannot alias original or Source",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot);
    for (
      const sink of [
        join(f.project, "diagnostics"),
        join(f.sourceRoot, "diagnostics"),
      ]
    ) {
      let error: unknown;
      try {
        await armFailureDiagnostics(f.request, sink);
      } catch (e) {
        error = e;
      }
      assert(
        error instanceof Error &&
          error.message ===
            "ACTUAL_MAIN_NATIVE: diagnostic sink aliases protected root",
        "PURE diagnostic sink must remain outside original and Source",
      );
    }
  },
);
pure("symlink sink ancestor refuses before copy", async (retentionRoot) => {
  const f = await fixture(retentionRoot),
    actual = join(f.base, "actual-diagnostics");
  await Deno.rename(f.directory, actual);
  await Deno.symlink(actual, f.directory);
  await refusedBeforeCopy(f);
});
pure(
  "preexisting attempt destination cannot overwrite",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot),
      sentinel = join(f.directory, f.attemptId, "sentinel.txt");
    await write(sentinel, "existing evidence\n");
    let error: unknown;
    try {
      await retainFailureDiagnostics(f.ctx, f.armed);
    } catch (e) {
      error = e;
    }
    assert(
      error instanceof Deno.errors.AlreadyExists &&
        await Deno.readTextFile(sentinel) === "existing evidence\n",
      "PURE preexisting destination refused and unchanged",
    );
    assert(
      !await regularExists(join(f.directory, f.attemptId, "manifest.json")),
      "PURE stale attempt cannot gain a new manifest",
    );
  },
);
pure(
  "duplicate notification cannot overwrite first evidence",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot),
      first = await retainFailureDiagnostics(f.ctx, f.armed),
      before = await hash(first.manifestPath);
    let error: unknown;
    try {
      await retainFailureDiagnostics(f.ctx, f.armed);
    } catch (e) {
      error = e;
    }
    assert(
      error instanceof Deno.errors.AlreadyExists &&
        await hash(first.manifestPath) === before,
      "PURE repeated attempt refuses and preserves original manifest",
    );
    await verifyRows(f, first);
  },
);
for (const kind of ["directory", "symlink", "hardlink"] as const) {
  pure(
    `candidate ${kind} is secondary refusal with partial preservation`,
    async (retentionRoot) => {
      const f = await fixture(retentionRoot), bad = f.candidates[0].sourcePath;
      await Deno.remove(bad);
      if (kind === "directory") await Deno.mkdir(bad);
      else {
        const outside = join(f.base, "outside-diagnostic-source.txt");
        await write(outside, "must not become copied diagnostic bytes\n");
        if (kind === "symlink") await Deno.symlink(outside, bad);
        else await Deno.link(outside, bad);
      }
      const { value } = await partial(f),
        row = value.candidates.find((r: any) => r.sourcePath === bad);
      assert(
        row?.status === "error" && row.bytes === undefined &&
          row.sha256 === undefined &&
          (row.destination === undefined || !await regularExists(
            join(f.directory, f.attemptId, row.destination),
          )),
        "PURE nonregular/linked source never produces an accepted copy",
      );
      const inventory: any = await readFailureDiagnostics(f.armed);
      assert(
        inventory.status === "retention-error" &&
          inventory.attempts.length === 1 &&
          inventory.attempts[0].errorCount >= 1,
        "PURE partial notification remains a diagnostic error in separate inventory",
      );
    },
  );
}
pure(
  "real source mutation after read is unstable and preserves other rows",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot);
    let changed: string | undefined;
    const { value } = await partial(f, {
      afterRead: async (candidate) => {
        if (!changed) {
          changed = candidate.sourcePath;
          await Deno.writeTextFile(
            candidate.sourcePath,
            "actual changed Source bytes\n",
          );
        }
      },
    });
    const row = value.candidates.find((r: any) => r.sourcePath === changed);
    assert(
      row?.status === "unstable" && row.bytes === undefined &&
        row.sha256 === undefined &&
        (row.destination === undefined ||
          !await regularExists(
            join(f.directory, f.attemptId, row.destination),
          )),
      "PURE changing candidate cannot be retained as stable proof",
    );
  },
);
pure(
  "produced candidate disappearing after read is unstable, not absent",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot);
    let removed: string | undefined, error: unknown;
    try {
      await retainFailureDiagnostics(f.ctx, f.armed, {
        afterRead: async (candidate) => {
          if (!removed) {
            removed = candidate.sourcePath;
            await Deno.remove(candidate.sourcePath);
          }
        },
      });
    } catch (e) {
      error = e;
    }
    const value = JSON.parse(
      await Deno.readTextFile(
        join(f.directory, f.attemptId, "manifest.json"),
      ),
    );
    const row = value.candidates.find((r: any) => r.sourcePath === removed);
    console.log(
      `PURE disappearance after actual read: ${row?.status}; retained=${value.counts.retained}; errors=${value.counts.errors}; secondaryError=${
        error instanceof Error
      }`,
    );
    assert(
      removed && error instanceof Error &&
        /retention incomplete/.test(error.message) &&
        row?.status === "unstable" && row.bytes === undefined &&
        row.sha256 === undefined &&
        row.destination === undefined && value.counts.errors >= 1 &&
        value.counts.retained >= 1,
      "PURE observed produced bytes disappearing during retention must be unstable secondary refusal with partial evidence",
    );
    const inventory: any = await readFailureDiagnostics(f.armed);
    assert(
      inventory.status === "retention-error",
      "PURE disappearance cannot become an accepted absent-only notification",
    );
  },
);
pure(
  "exclusive destination collision preserves sentinel and partial manifest",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot);
    let collision: string | undefined;
    const { value } = await partial(f, {
      afterRead: async (candidate) => {
        if (!collision) {
          collision = candidate.destinationPath;
          await write(collision, "preexisting collision\n");
        }
      },
    });
    assert(
      collision &&
        await Deno.readTextFile(collision) === "preexisting collision\n" &&
        value.candidates.some((r: any) => r.status === "error"),
      "PURE exclusive write cannot replace collision bytes",
    );
  },
);
pure(
  "selected Source hash drift is recorded without suppressing copies",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot), path = "book/index.qmd";
    await Deno.writeTextFile(
      join(f.sourceRoot, path),
      "actual selected Source drift\n",
    );
    const value = await verifyRows(
        f,
        await retainFailureDiagnostics(f.ctx, f.armed),
      ),
      row = value.selectedHashes.find((r: any) => r.path === path);
    assert(
      row && row.expected === f.request.selectedHashes[path] &&
        row.observed === await hash(join(f.sourceRoot, path)) &&
        row.expected !== row.observed,
      "PURE selected Source expected/observed drift retained",
    );
  },
);
pure(
  "publication finalize retains actual stage facts",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot);
    f.ctx.failure = {
      phase: "publication",
      operation: "finalize",
      error: { name: "Error", message: "PURE actual finalize refusal" },
    };
    f.ctx.stage = join(f.project, ".project-publish", `publish-${f.attemptId}`);
    await Deno.mkdir(f.ctx.stage, { recursive: true });
    const value = await verifyRows(
      f,
      await retainFailureDiagnostics(f.ctx, f.armed),
    );
    assert(
      value.context.stage === f.ctx.stage &&
        value.context.failure.operation === "finalize",
      "PURE actual stage context retained",
    );
  },
);
pure(
  "deferred PURE retention resolves before simulated cleanup",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot),
      primary = new Error("PURE primary child refusal");
    let release!: () => void,
      entered!: () => void,
      first = true,
      cleaned = false;
    const barrier = new Promise<void>((resolve) => {
        release = resolve;
      }),
      inside = new Promise<void>((resolve) => {
        entered = resolve;
      });
    let result:
      | Awaited<ReturnType<typeof retainFailureDiagnostics>>
      | undefined;
    const attempt = (async (retentionRoot) => {
      try {
        result = await retainFailureDiagnostics(f.ctx, f.armed, {
          afterRead: async (retentionRoot) => {
            if (first) {
              first = false;
              entered();
              await barrier;
            }
          },
        });
      } finally {
        await Deno.remove(
          join(f.project, ".project-publish/builds", f.attemptId),
          { recursive: true },
        );
        cleaned = true;
      }
      throw primary;
    })();
    const settled = attempt.then(() => "settled", () => "settled"),
      phase = await Promise.race([inside.then(() => "entered"), settled]);
    try {
      assert(
        phase === "entered" && !cleaned &&
          await regularExists(f.candidates[0].sourcePath),
        "PURE awaited retention holds cleanup while actual Source exists",
      );
    } finally {
      release();
    }
    let error: unknown;
    try {
      await attempt;
    } catch (e) {
      error = e;
    }
    assert(
      error === primary && cleaned && result,
      "PURE original refusal propagates after retention and cleanup",
    );
    await verifyRows(f, result);
  },
);
pure(
  "PURE caller keeps primary refusal with retention and cleanup errors",
  async (retentionRoot) => {
    const f = await fixture(retentionRoot),
      primary = new Error("PURE primary refusal"),
      cleanupError = new Error("PURE cleanup refusal after Source removal"),
      bad = f.candidates[0].sourcePath;
    await Deno.remove(bad);
    await Deno.mkdir(bad);
    const errors: unknown[] = [primary];
    try {
      await retainFailureDiagnostics(f.ctx, f.armed);
    } catch (e) {
      errors.push(e);
    }
    await Deno.remove(
      join(f.project, ".project-publish/builds", f.attemptId),
      { recursive: true },
    );
    errors.push(cleanupError);
    // This fixture models the accepted provider's ordering, not its implementation.
    const failure = new AggregateError(errors, primary.message, {
      cause: primary,
    });
    assert(
      failure.cause === primary && failure.errors[0] === primary &&
        failure.errors.length === 3 && failure.errors[2] === cleanupError,
      "PURE fixture primary-first/cause and cleanup remain present",
    );
    const value = JSON.parse(
      await Deno.readTextFile(
        join(f.directory, f.attemptId, "manifest.json"),
      ),
    );
    assert(
      value.counts.errors >= 1 && value.counts.retained >= 1,
      "PURE partial evidence survives cleanup with secondary errors",
    );
  },
);
