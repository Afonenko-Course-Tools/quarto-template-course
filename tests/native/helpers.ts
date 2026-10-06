import { dirname, fromFileUrl, resolve } from "stdlib/path";
import { create } from "../../_extensions/Afonenko-Course-Tools/course-moodle/vendor/xmlbuilder2.js";
import { assertWellFormed } from "./xml-wellformed.ts";

export const ROOT = resolve(dirname(fromFileUrl(import.meta.url)), "../..");
export const quarto = () => Deno.env.get("QUARTO") || "quarto";
export function assert(
  condition: unknown,
  message = "Native acceptance assertion failed",
): asserts condition {
  if (!condition) throw Error(message);
}
export async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}
export async function remove(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}
export async function command(args: string[], cwd: string): Promise<void> {
  console.log("RUN", cwd, ...args);
  const started = performance.now();
  const result = await new Deno.Command(quarto(), {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  console.log(
    "ELAPSED",
    JSON.stringify({
      cwd,
      args,
      seconds: Math.round(performance.now() - started) / 1000,
      exit: result.code,
    }),
  );
  assert(
    result.success,
    `Quarto command failed (${result.code}): ${args.join(" ")}`,
  );
}
export async function capture(
  args: string[],
  cwd: string,
): Promise<Deno.CommandOutput> {
  return await new Deno.Command(quarto(), {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();
}
export const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
export function workspaceArg(args = Deno.args): string {
  assert(args.length === 1, "Usage: quarto run tests/native/<case>.ts PATH");
  return resolve(args[0]);
}

export interface XmlElement {
  name: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  text: string;
}
interface DomElement {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  attributes: ArrayLike<{ name: string; value: string }>;
  childNodes: ArrayLike<DomElement>;
}
export function parseXml(source: string): XmlElement {
  assertWellFormed(source);
  const root =
    (create(source).node as unknown as { documentElement: DomElement })
      .documentElement;
  function element(node: DomElement): XmlElement {
    const children = Array.from(node.childNodes);
    return {
      name: node.nodeName,
      attributes: Object.fromEntries(
        Array.from(
          node.attributes,
          (attribute) => [attribute.name, attribute.value],
        ),
      ),
      children: children.filter((child) => child.nodeType === 1).map(element),
      text: children.filter((child) =>
        child.nodeType === 3 || child.nodeType === 4
      ).map((child) => child.textContent || "").join(""),
    };
  }
  return element(root);
}
