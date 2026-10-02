// Нативные negative probes: отдельные test-only finalizers, без изменения consumer predicates.
import {
  assert,
  attemptPath,
  command,
  current,
  event,
  files,
  hash,
  join,
  load,
  save,
} from "./resources/common.ts";
import { sha } from "../_extensions/Afonenko-Course-Tools/course-core/owner-preflight/owner.ts";
export const ownerFault = {
  async finalize(ctx: any) {
    const attempt = await load(ctx);
    const options = JSON.parse(
      await Deno.readTextFile(join(ctx.sourceRoot, "_probe/selection.json")),
    );
    if (options.fail === "source-mutation") {
      await Deno.writeTextFile(
        join(attempt.handle.root, "assets/public.txt"),
        "changed after render\n",
      );
    }
    if (options.fail === "config-mutation") {
      await Deno.writeTextFile(
        join(attempt.handle.root, "_quarto-student.yml"),
        "course:\n  view: full\n",
      );
    }
    if (options.fail === "session-mutation") {
      await Deno.writeTextFile(attempt.handle.sessionPath, "{}\n");
    }
    if (options.fail === "missing-observation") {
      const observations =
        (await files(join(attempt.handle.root, ".course-owner"))).filter((p) =>
          p.split("/").at(-1)?.startsWith("result-") && p.endsWith(".json")
        );
      assert(observations.length > 0, "TEST_OBSERVATION_NOT_FOUND");
      await Deno.remove(observations.at(-1)!);
    }
  },
};
export const zipFault = {
  async finalize(ctx: any) {
    const { attempt, index } = await current(ctx),
      options = JSON.parse(
        await Deno.readTextFile(join(ctx.sourceRoot, "_probe/selection.json")),
      );
    if (
      ["renamed-private-zip", "renamed-service-zip", "renamed-runtime-zip"]
        .includes(options.fail)
    ) {
      const source = options.fail === "renamed-private-zip"
        ? join(attempt.handle.root, "materials/instructor/README.txt")
        : options.fail === "renamed-runtime-zip"
        ? join(
          attempt.handle.root,
          "_extensions/Afonenko-Course-Tools/course-presentation/disclosure.js",
        )
        : attempt.body!.packagePath;
      await command("python3", [
        "-c",
        "import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],'w') as z: z.write(sys.argv[2],'renamed/public.txt')",
        join(ctx.stage, "renamed-carrier.bin"),
        source,
      ], ctx.root);
    }
    if (options.fail === "renamed-core-transport") {
      const owned = [];
      for (const service of attempt.services) {
        if (
          service.role === "owner-session" && !index.files.some((f) =>
            f.sha256 === service.sha256
          ) && await hash(service.path) === service.sha256
        ) owned.push(service);
      }
      assert(owned.length, "TEST_CURRENT_UNINDEXED_CORE_TRANSPORT_REQUIRED");
      console.log(
        `Test current Core producer file: ${owned[0].path} SHA ${await hash(
          owned[0].path,
        )}`,
      );
      await Deno.copyFile(
        owned[0].path,
        join(ctx.stage, "renamed-evidence.json"),
      );
    }
    if (options.fail === "renamed-runtime-plain") {
      await Deno.copyFile(
        join(
          attempt.handle.root,
          "_extensions/Afonenko-Course-Tools/course-presentation/disclosure.js",
        ),
        join(ctx.stage, "renamed-runtime.js"),
      );
    }
  },
};
// Runs after successful finish; the production current() must refuse before Print.
async function mutateBody(ctx: any, failure: string) {
  const receiptBytes = await Deno.readFile(attemptPath(ctx)),
    attempt = await load(ctx);
  assert(attempt.body, "TEST_CURRENT_BODY_REQUIRED");
  let path: string | undefined;
  if (failure === "body-private-mutation") {
    path = attempt.body.packagePath;
  }
  if (failure === "body-public-mutation") path = attempt.body.publicPath;
  if (failure === "body-receipt-mutation") {
    path = attempt.body.receiptPath;
  }
  if (failure === "body-source-mutation") {
    path = join(attempt.handle.root, "corpus.qmd");
  }
  if (failure === "body-module-mutation") {
    path = join(
      attempt.handle.root,
      "_extensions/Afonenko-Course-Tools/course-core/owner-preflight/owner.ts",
    );
  }
  const source = "corpus.qmd", key = `${attempt.handle.profile}:${source}`;
  if (
    [
      "body-actual-mutation",
      "body-header-mutation",
      "body-baseline-mutation",
      "body-seal-mutation",
    ].includes(failure)
  ) {
    const session = JSON.parse(
      await Deno.readTextFile(attempt.handle.sessionPath),
    );
    path = failure === "body-actual-mutation"
      ? join(
        attempt.handle.root,
        ".course-owner/render",
        attempt.handle.profile,
        `${await sha(source)}.json`,
      )
      : failure === "body-header-mutation"
      ? session.identities[key]
      : failure === "body-baseline-mutation"
      ? session.captures[key]
      : join(
        attempt.handle.root,
        ".course-owner/body",
        `seal-${await sha(key)}.json`,
      );
    assert(
      path && await Deno.stat(path),
      "TEST_NATIVE_SEALED_INPUT_REQUIRED",
    );
  }
  if (failure === "body-generated-mutation") {
    const receipt = JSON.parse(
      await Deno.readTextFile(attempt.body.receiptPath),
    );
    const resource = receipt.resources.find((r: any) =>
      r.source.includes("figure-html")
    );
    assert(resource, "TEST_CURRENT_GENERATED_RESOURCE_REQUIRED");
    path = join(attempt.handle.root, resource.source);
  }
  let original: Uint8Array | undefined;
  if (failure === "body-index-mutation") {
    path = join(attempt.handle.root, ".course-owner/resources.json");
  }
  if (path) {
    original = await Deno.readFile(path);
    if (failure === "body-index-mutation") {
      const index = JSON.parse(new TextDecoder().decode(original));
      index.invocationId += "-changed";
      await Deno.writeTextFile(path, JSON.stringify(index));
    } else await Deno.writeTextFile(path, "changed after native finish\n");
  }
  if (failure === "body-handle-index") {
    attempt.body.indexHash = "0".repeat(64);
  }
  if (failure === "body-handle-attempt") {
    attempt.body.attemptId += "-wrong";
  }
  await save(ctx, attempt);
  return async () => {
    if (path && original) await Deno.writeFile(path, original);
    await Deno.writeFile(attemptPath(ctx), receiptBytes);
  };
}
const bodyCases: Record<string, string> = {
  "body-private-mutation": "RESOURCE.BYTES_CHANGED",
  "body-public-mutation": "RESOURCE.BYTES_CHANGED",
  "body-receipt-mutation": "RESOURCE.BYTES_CHANGED",
  "body-actual-mutation": "RESOURCE.BYTES_CHANGED",
  "body-header-mutation": "SOURCE.HEADER_IDENTITY_CHANGED",
  "body-baseline-mutation": "SOURCE.BASELINE_CHANGED",
  "body-seal-mutation": "RESOURCE.BYTES_CHANGED",
  "body-index-mutation": "RESOURCE.INDEX_CHANGED",
  "body-generated-mutation": "RESOURCE.BYTES_CHANGED",
  "body-source-mutation": "SOURCE.FROZEN_INPUT_CHANGED",
  "body-module-mutation": "SOURCE.FROZEN_INPUT_CHANGED",
  "body-handle-index": "BODY.HANDLE_INVALID",
  "body-handle-attempt": "BODY.HANDLE_INVALID",
};
// One real finished owner. Every guard is exercised before Print, with exact recovery.
export const bodyFault = {
  async finalize(ctx: any) {
    const options = JSON.parse(
      await Deno.readTextFile(join(ctx.sourceRoot, "_probe/selection.json")),
    );
    if (options.fail === "body-integrity-batch") {
      for (const [failure, code] of Object.entries(bodyCases)) {
        const restore = await mutateBody(ctx, failure);
        let refused = false;
        try {
          await current(ctx);
        } catch (e) {
          refused = String(e).includes(code);
        } finally {
          await restore();
        }
        assert(refused, `TEST_CURRENT_BODY_REFUSAL ${failure}: ${code}`);
        await current(ctx);
        await event(ctx, "body-integrity-checked", { failure, code });
        console.log(`PASS current body refusal ${failure}: ${code}`);
      }
      // The normal next delivery.finalize must fail before PDF/ZIP and commit.
      await mutateBody(ctx, "body-private-mutation");
    } else await mutateBody(ctx, options.fail);
  },
};
