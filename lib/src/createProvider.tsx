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
 * Declare the controller as a standalone top-level function named `useSomething`
 * and pass it in by reference, rather than inlining it here. Both
 * `eslint-plugin-react-hooks` and the React Compiler recognise a hook by that
 * shape only: an inline function expression gets no Rules of Hooks checking and
 * none of the compiler's automatic memoization.
 *
 * Returns a tuple of three values:
 * - `Provider` — the React component that wraps your tree and supplies context.
 * - `useActions` — a hook that returns the stable actions object.
 * - `useStateContext` — a hook that accepts a selector and an optional equality
 *   function, and re-renders the consumer only when the selected slice changes.
 *
 * Used outside their Provider both hooks return `null`, which their types do
 * not advertise — see the note above `useActions` below.
 *
 * @param controller - Hook that receives provider props and returns `{ state, actions }`.
 */
export function createProvider<
  ProviderProps,
  R extends
    { state: any; actions: any } | React.ReactElement | null | undefined,
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

    // Memoised so that the store's identity check has something to compare.
    // A fresh object literal here would make that check always fail, and every
    // Provider render — including one caused only by a prop the state does not
    // depend on — would re-run every consumer's selector. `actions` is already
    // stable, so this collapses to "did `state` change identity", which is
    // exactly what the React Compiler stabilises in a compiled provider body.
    // Declared above the early return below: it is a hook, so it has to run on
    // every render, fallback or not.
    const value = React.useMemo(() => ({ state, actions }), [state, actions]);

    if (React.isValidElement(result) || result === null) {
      return result;
    }

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  // Outside a Provider the context is `null`, the way a plain React context
  // falls back to its default value — a component can then be written to render
  // with or without one. The return types deliberately stay narrow: components
  // inside their Provider are the overwhelming case, and making every one of
  // them carry `?.` costs more than the null dereference a genuine mistake
  // produces. Callers who want the honest contract can wrap the hook and type
  // the `null` back in.
  const useActions = (): ActionsType => {
    const store = useStoreContext(Context);

    return (store?.value?.actions ?? null) as ActionsType;
  };

  const useStateContext = function <SelectorReturn>(
    selector: SelectorType<StateType, SelectorReturn>,
    equalityFn: EqualityFn = Object.is,
  ): SelectorReturn {
    const store = useStoreContext(Context);
    const hasStore = !!store;

    // Unwraps the context value before handing the state to the caller's
    // selector. Memoised on `selector` so a hoisted selector keeps a stable
    // identity all the way down; an inline one changes every render either way.
    //
    // Without a Provider the state is `null` and the selector still runs, so
    // `(s) => s.count` throws right there — in the caller's own code, naming
    // the field it wanted. A selector written for both cases (`s?.count`)
    // simply passes the absence through.
    const stateSelector = React.useCallback(
      (contextValue: { state: StateType } | undefined) =>
        selector((hasStore ? contextValue?.state : null) as StateType),
      [selector, hasStore],
    );

    return useContextSelector(Context, stateSelector, equalityFn);
  };

  return [Provider, useActions, useStateContext] as const;
}
