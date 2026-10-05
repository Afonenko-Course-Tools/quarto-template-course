// Shared adapter primitives; no state or diagnostic lifecycle dependency.
export function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`ACTUAL_MAIN_NATIVE: ${message}`);
}
export async function hash(path: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", await Deno.readFile(path)),
    ),
  ].map((n) => n.toString(16).padStart(2, "0")).join("");
}
