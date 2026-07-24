import {
  createContext as createContextOrig,
  useCallback,
  useContext as useContextOrig,
  useDebugValue,
  useEffect,
  useRef,
} from "react";

import { useSyncExternalStore } from "./useSyncExternalStorePolyfill";

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
    useEffect(() => {
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

export function useContextSelector<T, X>(
  context: StoreContext<T>,
  selector: (value: T) => X,
) {
  const store = useContextOrig(context as React.Context<Store<T>>);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const getSnapshot = useCallback(
    () => selectorRef.current(store?.value),
    [store],
  );
  const selected = useSyncExternalStore(
    store?.subscribe ?? dummySubscribe,
    getSnapshot,
    // The store value is assigned during render, so the client snapshot is
    // also correct on the server. Without this, useSyncExternalStore throws
    // "Missing getServerSnapshot" during SSR.
    getSnapshot,
  );
  useDebugValue("react-arven");
  return selected;
}

export function useStoreContext<T>(context: StoreContext<T>): Store<T> {
  const store = useContextOrig(context as React.Context<Store<T>>);
  return store;
}
