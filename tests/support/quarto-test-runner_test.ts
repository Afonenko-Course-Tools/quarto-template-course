// Integration checks run real children of Quarto's selected bundled Deno.
import { check } from "./contract-cases.ts";
async function launch(args: string[]) {
  return await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-all",
      "--cached-only",
      "--no-config",
      decodeURIComponent(new URL("../run.ts", import.meta.url).pathname),
      ...args,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
}
const child = `Deno.test("launcher child passes", () => {
  console.log("child stdout preserved"); console.error("child stderr preserved");
});
Deno.test("launcher child fails", () => { throw new Error("intentional child assertion"); });`;
Deno.test("quarto launcher: runs registered child tests and returns failing exit", async () => {
  const root = await Deno.makeTempDir({ prefix: "quarto-launcher-" });
  try {
    const path = `${root}/real child_test.ts`;
    await Deno.writeTextFile(path, child);
    const result = await launch([path]);
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);
    check(result.code === 1, `expected child exit 1; received ${result.code}`);
    check(
      stdout.includes("intentional child assertion") &&
        stdout.includes("1 passed | 1 failed"),
      "registered failure must actually execute",
    );
    check(
      stdout.includes("child stdout preserved") &&
        stdout.includes("child stderr preserved"),
      "test runner must inherit both test streams",
    );
    check(stderr.includes("Test failed"), "runner error stderr must propagate");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
Deno.test("quarto launcher: forwards filter and reports skipped cases in JUnit", async () => {
  const root = await Deno.makeTempDir({ prefix: "quarto-launcher-" });
  try {
    const path = `${root}/real child_test.ts`, junit = `${root}/filtered.xml`;
    await Deno.writeTextFile(path, child);
    const result = await launch([
      "--filter",
      "launcher child passes",
      "--junit-path",
      junit,
      path,
    ]);
    const stdout = new TextDecoder().decode(result.stdout);
    check(
      result.code === 0 &&
        stdout.includes("1 passed | 0 failed | 1 filtered out"),
      "filter must execute only the positive control",
    );
    const report = await Deno.readTextFile(junit);
    check(
      report.includes('tests="2"') && report.includes('disabled="1"') &&
        report.includes('failures="0"') &&
        report.includes('name="launcher child passes"'),
      "JUnit must report the passing control and the filtered case",
    );
    check(
      /<testcase name="launcher child fails"[\s\S]*?<skipped\/>/.test(report),
      "filtered failure must be reported as skipped",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
Deno.test("quarto launcher: preserves default resource sanitizers", async () => {
  const root = await Deno.makeTempDir({ prefix: "quarto-launcher-" });
  try {
    const path = `${root}/leak_test.ts`;
    await Deno.writeTextFile(
      path,
      `Deno.test("intentional leaked resource", () => { Deno.openSync(${
        JSON.stringify(path)
      }); });`,
    );
    const result = await launch([path]);
    const output = new TextDecoder().decode(result.stdout) +
      new TextDecoder().decode(result.stderr);
    check(
      result.code !== 0 && output.includes("Leaks detected"),
      "standard resource leak check must refuse the child",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
