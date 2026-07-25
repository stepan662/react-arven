import { useInsertionEffect, useRef } from "react";

export type LatestRef<T> = { readonly current: T };

/**
 * A ref holding the last non-nullish value from a *committed* render.
 *
 * Two guarantees, both of which callers depend on:
 *
 * 1. The write happens in an insertion effect, which runs before any layout
 *    effect, passive effect or event handler — but never for a render React
 *    throws away. Writing during render instead would leak values from renders
 *    the user never saw: a transition blocked by a suspending child, or a
 *    concurrent render React abandoned and replayed.
 *
 * 2. A nullish value never overwrites what the ref already holds. Absence here
 *    means "this render had nothing to offer", not "the value is gone", so
 *    clearing it would only turn later reads into holes.
 */
export function useLatestRef<T>(value: T): LatestRef<T> {
  const ref = useRef(value);

  useInsertionEffect(() => {
    if (value !== null && value !== undefined) {
      ref.current = value;
    }
  });

  return ref;
}
