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

    const prevValue = React.useRef<SelectorReturn | undefined>(undefined);

    const stableSelector = React.useCallback(
      (contextValue: any) => {
        const state = contextValue?.state;
        const newValue = selector(state);

        if (equalityFn(prevValue.current, newValue)) {
          return prevValue.current as SelectorReturn;
        }

        prevValue.current = newValue;
        return newValue;
      },
      [selector, equalityFn],
    );

    return useContextSelector(Context, stableSelector);
  };

  return [Provider, useActions, useStateContext] as const;
}
