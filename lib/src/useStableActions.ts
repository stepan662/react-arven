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

      if (typeof value === "function") {
        stableNode[key] = (...args: any[]) => {
          const parent = resolve();
          const fn = parent?.[key];

          if (typeof fn !== "function") {
            throw new Error(
              `[react-arven] Action "${[...path, key].join(".")}" is missing from the current actions. The actions object must have the same shape on every render.`,
            );
          }

          // Called via the parent so `this` refers to the latest namespace.
          return fn.apply(parent, args);
        };
      } else if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        // Nested namespaces resolve through their parent, so a call walks the
        // tree once instead of re-reducing a path array.
        stableNode[key] = wrap(value as ActionMap, () => resolve()?.[key], [
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
  // A render that returns a fallback provides no actions, but the provider
  // still owns them — and useLatestRef ignores that absence, so a caller
  // holding a stale reference reaches a real function rather than a hole.
  const latestActions = useLatestRef<ActionMap | undefined>(actions);
  const stableActions = useRef<A>();

  if (!stableActions.current && actions) {
    stableActions.current = createStableActions(actions, latestActions);
  }

  return stableActions.current!;
}
