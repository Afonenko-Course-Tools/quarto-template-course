// Canonical paths, stable file identities, byte hashes and exclusive writes.
import { dirname, isAbsolute, join, relative, resolve } from "stdlib/path";
import { assert } from "../common.ts";

export function pathInside(root: string, path: string) {
  const r = relative(root, path);
  return r === "" || (!isAbsolute(r) && r !== ".." && !r.startsWith("../") &&
    !r.startsWith("..\\"));
}
export function literalRelative(path: unknown): path is string {
  return typeof path === "string" && !!path && !isAbsolute(path) &&
    !path.includes("\\") &&
    path.split("/").every((part) =>
      part !== "" && part !== "." && part !== ".."
    );
}
export function absoluteLiteral(path: unknown): path is string {
  return typeof path === "string" && isAbsolute(path) && resolve(path) === path;
}
export function message(error: unknown): string {
  return error instanceof Error && typeof error.message === "string"
    ? error.message
    : "diagnostic filesystem failure";
}
export async function diagnosticDigest(
  bytes: Uint8Array,
  algorithm = "SHA-256",
) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest(algorithm, new Uint8Array(bytes)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0")).join("");
}

export async function safeDirectory(path: string, createParents = false) {
  assert(absoluteLiteral(path), "noncanonical diagnostic directory");
  const parsed = path.split("/").filter(Boolean);
  let current = "/";
  for (const part of parsed) {
    current = join(current, part);
    let info: Deno.FileInfo;
    try {
      info = await Deno.lstat(current);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound) || !createParents) {
        throw error;
      }
      await Deno.mkdir(current);
      info = await Deno.lstat(current);
    }
    assert(
      info.isDirectory && !info.isSymlink,
      "diagnostic directory link or alias",
    );
  }
  assert(
    await Deno.realPath(path) === path,
    "diagnostic directory canonical alias",
  );
}
export async function safeRegular(path: string, root: string) {
  assert(
    absoluteLiteral(path) && pathInside(root, path) && path !== root,
    "diagnostic file escapes declared root",
  );
  await safeDirectory(dirname(path));
  const info = await Deno.lstat(path);
  assert(
    info.isFile && !info.isSymlink && (info.nlink === null || info.nlink === 1),
    "diagnostic file is not an unlinked regular file",
  );
  assert(await Deno.realPath(path) === path, "diagnostic file canonical alias");
  return info;
}
export function fingerprint(info: Deno.FileInfo) {
  return JSON.stringify([
    info.dev,
    info.ino,
    info.size,
    info.nlink,
    info.mtime?.getTime(),
    info.ctime?.getTime(),
  ]);
}
export async function exclusiveBytes(path: string, bytes: Uint8Array) {
  const file = await Deno.open(path, { write: true, createNew: true });
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const written = await file.write(bytes.subarray(offset));
      assert(written > 0, "diagnostic write made no progress");
      offset += written;
    }
  } finally {
    file.close();
  }
}
