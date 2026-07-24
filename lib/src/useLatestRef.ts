import React, { useRef } from "react";

export type LatestRef<T> = { readonly current: T };

// Typed against React 18+, but supported at runtime down to React 17, where
// insertion effects do not exist. React 17 has no concurrent rendering either,
// so running the callback during render is equivalent there.
const insertionEffect = (
  React as { useInsertionEffect?: (effect: () => void) => void }
).useInsertionEffect;

const useCommitEffect: (effect: () => void) => void =
  insertionEffect ?? ((effect) => effect());

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

  useCommitEffect(() => {
    if (value !== null && value !== undefined) {
      ref.current = value;
    }
  });

  return ref;
}
