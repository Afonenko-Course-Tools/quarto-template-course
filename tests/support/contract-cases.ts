/** Each mutation carries the specific contract refusal it must reach. */
export interface RefusalCase<T> {
  name: string;
  goal: string;
  mutate: (fixture: T) => void;
  expectedRefusal: string;
}
export function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function expectRefusal(
  action: () => unknown,
  expected: string,
  goal: string,
) {
  let error: unknown;
  try {
    action();
  } catch (caught) {
    error = caught;
  }
  check(
    error instanceof Error && error.message === expected,
    `${goal}: expected ${JSON.stringify(expected)}, received ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}
