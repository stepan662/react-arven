import React, { ReactNode } from "react";
import {
  createSelectableContext,
  useContextSelector,
  useStoreContext,
} from "./useContextSelector";
import { ValidateActions } from "./ValidateActions";
import { ActionMap, useStableActions } from "./useStableActions";

type SelectorType<S, R> = (state: S) => R;

export type ReturnType<S, A> = {
  state: S;
  actions: A;
};

export type EqualityFn = (a: any, b: any) => boolean;

type PropsWithChildren<P = unknown> = P & { children?: ReactNode | undefined };

type ExtractControllerData<T> = T extends {
  state: infer S;
  actions: infer A extends ActionMap;
}
  ? { state: S; actions: A }
  : never;

/**
 * Creates a React context provider with selector-based subscriptions.
 *
 * The `controller` is a hook-like function that receives the provider's props
 * and returns `{ state, actions }`. It may also return a React element (or
 * `null`/`undefined`) to act as a pure render gate — in that case no context
 * is provided and the element is rendered as-is.
 *
 * Returns a tuple of three values:
 * - `Provider` — the React component that wraps your tree and supplies context.
 * - `useActions` — a hook that returns the stable actions object.
 * - `useStateContext` — a hook that accepts a selector and an optional equality
 *   function, and re-renders the consumer only when the selected slice changes.
 *
 * @param controller - Hook that receives provider props and returns `{ state, actions }`.
 */
export function createProvider<
  ProviderProps,
  R extends
    | { state: any; actions: any }
    | React.ReactElement
    | null
    | undefined,
>(
  controller: (
    props: ProviderProps,
  ) => R &
    (R extends { actions: infer A }
      ? { actions: ValidateActions<A> }
      : unknown),
) {
  type Data = ExtractControllerData<R>;
  type StateType = Data["state"];
  type ActionsType = Data["actions"];

  const Context = createSelectableContext<{
    state: StateType;
    actions: ActionsType;
  }>();

  const Provider = ({
    children,
    ...props
  }: PropsWithChildren<ProviderProps>): React.ReactElement | null => {
    const result = controller(props as any);

    const state =
      (result as Partial<ReturnType<StateType, ActionsType>>)?.state ??
      undefined;
    const _actions =
      (result as Partial<ReturnType<StateType, ActionsType>>)?.actions ??
      undefined;

    const actions = useStableActions(_actions);

    if (React.isValidElement(result) || result === null) {
      return result;
    }

    const value = { state, actions };

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const requireStore = (hook: string) => {
    const store = useStoreContext(Context);

    if (!store) {
      throw new Error(
        `[react-arven] ${hook} was called outside of its Provider.`,
      );
    }

    return store;
  };

  const useActions = () => {
    return requireStore("useActions").value?.actions;
  };

  const useStateContext = function <SelectorReturn>(
    selector: SelectorType<StateType, SelectorReturn>,
    equalityFn: EqualityFn = Object.is,
  ) {
    requireStore("useState");

    // Unwraps the context value before handing the state to the caller's
    // selector. Memoised on `selector` so a hoisted selector keeps a stable
    // identity all the way down; an inline one changes every render either way.
    const stateSelector = React.useCallback(
      (contextValue: { state: StateType } | undefined) =>
        selector(contextValue?.state as StateType),
      [selector],
    );

    return useContextSelector(Context, stateSelector, equalityFn);
  };

  return [Provider, useActions, useStateContext] as const;
}
