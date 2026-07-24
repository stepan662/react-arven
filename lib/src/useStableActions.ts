import { useRef } from "react";
import { LatestRef, useLatestRef } from "./useLatestRef";

export type ActionMap = {
  [key: string]: ((...args: any[]) => any) | ActionMap;
};

/**
 * Mirrors the shape of `shape` with a tree of wrapper functions that resolve
 * their implementation through `latest` at call time. The returned object can
 * therefore be created once and still delegate to the newest closures.
 *
 * `shape` and `latest` are separate because the shape is needed during render,
 * while the ref only catches up when that render commits.
 */
export function createStableActions<
  A extends NonNullable<ActionMap> | undefined,
>(shape: A, latest: LatestRef<ActionMap | undefined>): A | undefined {
  if (!shape) {
    return undefined;
  }

  const wrap = (
    node: ActionMap,
    resolve: () => any,
    path: string[] = [],
  ): ActionMap => {
    const stableNode: ActionMap = {};

    Object.keys(node).forEach((key) => {
      const value = node[key];
      // Each wrapper resolves through its parent, so a call walks the tree
      // once instead of re-reducing a path array.
      const resolveChild = () => resolve()?.[key];

      if (typeof value === "function") {
        stableNode[key] = (...args: any[]) => resolveChild()?.(...args);
      } else if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        stableNode[key] = wrap(value as ActionMap, resolveChild, [
          ...path,
          key,
        ]);
      } else {
        throw new Error(
          `[react-arven] Invalid action at "${[...path, key].join(".")}". Only functions/objects.`,
        );
      }
    });

    return stableNode;
  };

  return wrap(shape, () => latest.current) as A;
}

export function useStableActions<A extends NonNullable<ActionMap> | undefined>(
  actions: A,
): A {
  const latestActions = useLatestRef<ActionMap | undefined>(actions);
  const stableActions = useRef<A>();

  if (!stableActions.current && actions) {
    stableActions.current = createStableActions(actions, latestActions);
  }

  return stableActions.current!;
}
