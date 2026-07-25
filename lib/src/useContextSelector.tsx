import {
  createContext as createContextOrig,
  useCallback,
  useContext as useContextOrig,
  useRef,
} from "react";

import { useSyncExternalStoreWithSelector } from "./useSyncExternalStoreWithSelector";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

type Store<T> = {
  value: T;
  subscribe: (listener: () => any) => () => any;
  notify: () => void;
};

interface StoreContext<T> {
  Provider: React.Provider<T>;
  Consumer: React.Consumer<Store<T>>;
}

export function createSelectableContext<T>(): StoreContext<T> {
  const context = createContextOrig<Store<T>>(undefined as any);
  const ProviderOrig = context.Provider;
  // @ts-expect-error
  context.Provider = ({
    value,
    children,
  }: {
    value: T;
    children: React.ReactNode;
  }) => {
    const storeRef = useRef<Store<T> | undefined>(undefined);
    let store = storeRef.current;
    if (!store) {
      const listeners = new Set<() => any>();
      store = {
        value,
        subscribe: (l) => {
          listeners.add(l);
          return () => listeners.delete(l);
        },
        notify: () => listeners.forEach((l) => l()),
      };
      storeRef.current = store;
    }
    // Layout, not passive: subscribers must re-render in the same commit that
    // produced the new value, so the browser never paints the old one.
    useIsomorphicLayoutEffect(() => {
      if (!Object.is(store.value, value)) {
        store.value = value;
        store.notify();
      }
    });
    return <ProviderOrig value={store}>{children}</ProviderOrig>;
  };
  return context as StoreContext<T>;
}

const dummySubscribe = () => () => {};

export type EqualityFn = (a: any, b: any) => boolean;

export function useContextSelector<T, X>(
  context: StoreContext<T>,
  selector: (value: T) => X,
  equalityFn?: EqualityFn,
): X {
  const store = useContextOrig(context as React.Context<Store<T>>);

  // Stable for the life of the store. The selector is passed through as its
  // own argument rather than closed over here, so that changing it invalidates
  // the memo inside useSyncExternalStoreWithSelector — which is what makes a
  // changed selector re-select without needing a ref written during render.
  const getSnapshot = useCallback(() => store?.value, [store]);

  const selected = useSyncExternalStoreWithSelector(
    store?.subscribe ?? dummySubscribe,
    getSnapshot,
    // The store value is assigned during render, so the client snapshot is
    // also correct on the server. Without this, useSyncExternalStore throws
    // "Missing getServerSnapshot" during SSR.
    getSnapshot,
    selector,
    equalityFn,
  );

  // No useDebugValue here: useSyncExternalStoreWithSelector already reports the
  // selected value, which is what you want in DevTools. A constant label would
  // only add a second, less useful entry.
  return selected;
}

export function useStoreContext<T>(context: StoreContext<T>): Store<T> {
  const store = useContextOrig(context as React.Context<Store<T>>);
  return store;
}
