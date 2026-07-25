import {
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

// Adapted from React's own `use-sync-external-store/shim/with-selector`.
// Copyright (c) Meta Platforms, Inc. and affiliates. MIT licensed.
// https://github.com/facebook/react/tree/main/packages/use-sync-external-store
//
// Vendored rather than depended on: the published package is CJS behind a
// process.env.NODE_ENV branch, so bundling it pulls in both the development
// and production copies, and react-arven ships a single build that cannot
// pick one. React ships `useSyncExternalStore` itself, but not the selector
// and equality memo around it, so this part stays ours at every version.
//
// Two properties are the whole point of this file, and both are easy to
// destroy by "simplifying" it:
//
// 1. `selector` and `isEqual` are useMemo deps. That is what makes a changed
//    selector produce a different snapshot function, so it re-selects without
//    a ref written during render. A ref would go stale on a render React
//    abandons, and a notification arriving before the next committed render
//    would then compare through the wrong selector and drop the update.
//
// 2. The cross-render equality cache lives in `inst` and is written only in a
//    passive effect — i.e. only for renders that commit. A render React throws
//    away therefore cannot poison it.

type Inst<Selection> = { hasValue: boolean; value: Selection | null };

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
  const instRef = useRef<Inst<Selection> | null>(null);
  let inst: Inst<Selection>;
  if (instRef.current === null) {
    inst = { hasValue: false, value: null };
    instRef.current = inst;
  } else {
    inst = instRef.current;
  }

  const [getSelection, getServerSelection] = useMemo(() => {
    // Per-memo memoisation, discarded whenever the deps below change. Safe to
    // write during render because it never outlives the render pass that
    // created it — unlike `inst`, which is committed in the effect.
    let hasMemo = false;
    let memoizedSnapshot: Snapshot;
    let memoizedSelection: Selection;

    const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const firstSelection = selector(nextSnapshot);

        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value as Selection;
          if (isEqual(currentSelection, firstSelection)) {
            memoizedSelection = currentSelection;
            return currentSelection;
          }
        }

        memoizedSelection = firstSelection;
        return firstSelection;
      }

      const prevSnapshot = memoizedSnapshot;
      const prevSelection = memoizedSelection;

      if (Object.is(prevSnapshot, nextSnapshot)) {
        return prevSelection;
      }

      const nextSelection = selector(nextSnapshot);

      if (isEqual !== undefined && isEqual(prevSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return prevSelection;
      }

      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    };

    const getSnapshotWithSelector = () => memoizedSelector(getSnapshot());
    const getServerSnapshotWithSelector =
      getServerSnapshot === undefined
        ? undefined
        : () => memoizedSelector(getServerSnapshot());

    return [getSnapshotWithSelector, getServerSnapshotWithSelector] as const;
  }, [getSnapshot, getServerSnapshot, selector, isEqual]);

  const value = useSyncExternalStore(
    subscribe,
    getSelection,
    getServerSelection,
  );

  useEffect(() => {
    inst.hasValue = true;
    inst.value = value;
  }, [value]);

  useDebugValue(value);

  return value;
}
