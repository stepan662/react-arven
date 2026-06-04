import { describe, test, expect } from "vitest";
import { shallow } from "../src/shallow";

describe("shallow", () => {
  test("returns true for the same reference", () => {
    const value = { foo: "bar" };
    expect(shallow(value, value)).toBe(true);
  });

  test("returns false for different primitive values", () => {
    expect(shallow(1, 2)).toBe(false);
    expect(shallow("a", "b")).toBe(false);
    expect(shallow(false, true)).toBe(false);
  });

  test("returns true for shallowly equal plain objects", () => {
    expect(shallow({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
  });

  test("returns false for plain objects with different values or keys", () => {
    expect(shallow({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallow({ a: 1 }, { b: 1 })).toBe(false);
  });

  test("returns true for shallowly equal iterable values", () => {
    expect(shallow([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(shallow(new Map([["a", 1]]), new Map([["a", 1]]))).toBe(true);
    expect(shallow(new Set([1, 2]), new Set([1, 2]))).toBe(true);
  });

  test("returns false for iterables with different ordering or values", () => {
    expect(shallow([1, 2], [2, 1])).toBe(false);
    expect(shallow(new Map([["a", 1]]), new Map([["a", 2]]))).toBe(false);
    expect(shallow(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });

  test("returns false for values with different prototypes", () => {
    expect(shallow([], {})).toBe(false);
  });

  test("handles null values correctly", () => {
    expect(shallow(null, null)).toBe(true);
    expect(shallow(null, {})).toBe(false);
  });
});
