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
 * A ref holding the value from the most recently *committed* render.
 *
 * The write happens in an insertion effect, which runs before any layout
 * effect, passive effect or event handler — but never for a render React
 * throws away. Writing during render instead would leak values from renders
 * the user never saw: a transition blocked by a suspending child, or a
 * concurrent render React abandoned and replayed.
 */
export function useLatestRef<T>(value: T): LatestRef<T> {
  const ref = useRef(value);

  useCommitEffect(() => {
    ref.current = value;
  });

  return ref;
}
