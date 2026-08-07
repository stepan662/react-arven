![React Arven logo](https://raw.githubusercontent.com/stepan662/react-arven/refs/heads/main/logos/logo.svg)

# React Arven

[![npm](https://img.shields.io/npm/v/react-arven)](https://www.npmjs.com/package/react-arven)
[![Minzipped Size](https://img.shields.io/bundlephobia/minzip/react-arven)](https://www.npmjs.com/package/react-arven)
[![license](https://img.shields.io/npm/l/react-arven)](https://github.com/stepan662/react-arven/blob/main/LICENSE)

A lightweight, fully typed React context helper with **stable action references** and **subscribable context**.

## Why React Arven?

It lets you use React Context the way you would hope it worked by default, without the usual performance gotchas. Have your state where you need it and provide it down to the children effortlessly.

|                          | React Arven | plain `useContext`     | Zustand | constate               | use-context-selector   |
| ------------------------ | ----------- | ---------------------- | ------- | ---------------------- | ---------------------- |
| Hooks inside store       | Yes         | Yes                    | No      | Yes                    | Yes                    |
| Granular re-renders      | Yes         | No                     | Yes     | Partial*               | Yes                    |
| Stable action refs       | Yes         | Manual (`useCallback`) | Yes     | Manual (`useCallback`) | Manual (`useCallback`) |
| Scoped to component tree | Yes         | Yes                    | No      | Yes                    | Yes                    |

\* constate achieves granular re-renders by splitting your hook into multiple separate contexts — one per value. This works well but requires you to restructure your code around it. React Arven uses selectors on a single context instead.

> Full motivation behind this library on my [blog](https://granat.blog/posts/2026-07-24-react-arven/)

## Installation

Install react-arven with npm, yarn or pnpm:

```sh
npm i react-arven
```

Compatible with React 18+.

## Usage

### Create provider

Your store is just a hook that returns state and actions. Wrap it with `createProvider` and you'll get a Provider component and two hooks.

```tsx
import { createProvider } from "react-arven";

function useCounterStore() {
  const [count, setCount] = useState(0);

  function increment() {
    // No useCallback necessary!
    setCount((val) => val + 1);
  }

  return {
    actions: { increment },
    state: { count },
  };
}

export const [CounterProvider, useCounterActions, useCounterState] =
  createProvider(useCounterStore);
```

1. `actions` - is an object with functions, to modify the state, accessible through `useCounterActions`
2. `state` - is a subscribable state, which you can access through `useCounterState`

You can name your provider and hooks whatever you like. I recommend a convention similar to this one.

Both hooks are typed automatically through type inference, if you use TypeScript.

### Use provider in your app

Use the provider component, to provide context to children.

```tsx
function CounterApp() {
  return (
    <CounterProvider>
      <Counter />
    </CounterProvider>
  );
}
```

### Use state and actions

Now you can use hooks returned from the `createProvider` to use state and actions.

```tsx
function Counter() {
  const count = useCounterState((s) => s.count); // selecting only what is needed
  const { increment } = useCounterActions();
  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

### TypeScript

The hooks returned by `createProvider` are fully typed — no manual annotations needed. Types are inferred directly from what you return in the provider body:

```tsx
function useCounterStore() {
  const [count, setCount] = useState(0);
  function increment() {
    setCount((val) => val + 1);
  }

  return {
    actions: { increment },
    state: { count },
  };
}

const [CounterProvider, useCounterActions, useCounterState] =
  createProvider(useCounterStore);

// useCounterState: (selector: (state: { count: number }) => T) => T
// useCounterActions: () => { increment: () => void }
```

If you use `createProvider` with props, the provider component is typed accordingly:

```tsx
type Props = { itemId: number }

function useItemDataStore({ itemId }: Props) { ... }

const [ItemDataProvider] = createProvider(useItemDataStore);

// ItemDataProvider expects: { itemId: number, children: React.ReactNode }
```

### Actions object

This library lets you avoid the `useCallback` hook in the provider. Internally, it creates a stable object that mirrors the structure of your `actions`, where each function delegates to your actual implementation. This means that even if the actions object is recreated on every render, components using it won't re-render unnecessarily.

> **Note:** The actions object must have the same structure on every render and is intended for functions only — do not put data in it.

### State object

State object is passed to children "as-is", however you are expected to only select what you need through the selector function. The library will only re-render when the returned value differs (based on `Object.is`).

So this way you can have very big state, but still be performant and avoid unnecessary re-renders.

### Early return

If you know your state is not complete while you are waiting for some async data, you can return a fallback component instead of state and actions.

```tsx
import { createProvider } from "react-arven";

function useCounterStore() {
  const { data, refetch } = useSomeFetchFunction(....);

  if (!data) {
    return <LoadingFallback />
  }

  return {
    actions: { refetch },
    state: { data },
  };
}

const [CounterProvider, useCounterActions, useCounterState] =
  createProvider(useCounterStore);
```

If you return a React component from the `createProvider` function, the library will just render the component without providing context and rendering children.

This way you can make sure your children will never receive `data` as undefined.

> **Note:** Don't use hooks after early return statement — [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) still apply! Declaring the
> body as a standalone `useCounterStore` rather than inlining it is what lets
> `eslint-plugin-react-hooks` catch this for you.

### Provider with props

You can pass props to your provider the same way as to any other React component and then use them in the provider body, you can also pass them through context.

```tsx
type Props = {
  itemId: number
}

function useItemDataStore({ itemId }: Props) {
  const { data, refetch } = useSomeFetchFunction(`/api/item/${itemId}`);

  return {
    actions: { refetch },
    state: { data, itemId },
  };
}

const [ItemDataProvider, ...] = createProvider(useItemDataStore);

// Usage:

function MyApp() {
  return (
    <ItemDataProvider itemId={42}>
      <ItemComponent />
    </ItemDataProvider>
  )
}
```

## Performance

### Selecting derived objects from state

The provider body re-runs on every state change. This means that a derived object or array computed inline gets a new reference each time — which is normal React behaviour. As long as you select primitive values from state in your components, this is completely fine, since primitives are compared by value:

```tsx
const count = useCounterState((s) => s.count); // ✓ safe
const filteredCount = useCounterState((s) => s.filtered.length); // ✓ safe
```

The problem arises when you select the whole derived object or array. Because re-render decisions are based on `Object.is`, the component will re-render on every state change even if the data hasn't changed:

```tsx
const filtered = useItemsState((s) => s.filtered); // ⚠ new reference every render
```

In that case, stabilize the reference in the provider with `useMemo`:

```tsx
const filtered = useMemo(
  () => items.filter((x) => x > threshold),
  [items, threshold],
);

return {
  state: { filtered },
};
```

With the [React Compiler](#react-compiler) enabled you don't have to write that
`useMemo` at all — the compiler stabilizes derived values in the provider body
for you.

### React Compiler

The [React Compiler](https://react.dev/learn/react-compiler) memoizes the
internals of components and hooks automatically. It only does that for functions
it can recognise as one, and its rule is syntactic: a top-level function whose
name starts with `use` (a declaration or an arrow assigned to a `const`). A
function expression passed straight into a call — including into
`createProvider` — is not a compilation unit, so nothing inside it is optimized.

That is why the examples above declare the provider body separately:

```tsx
// ✓ compiled — `derived` keeps its reference while `count` doesn't change
function useCounterStore() {
  const [count, setCount] = useState(0);

  function increment() {
    setCount((val) => val + 1);
  }

  const derived = { doubled: count * 2 };

  return {
    actions: { increment },
    state: { count, derived },
  };
}

const [CounterProvider, useCounterActions, useCounterState] =
  createProvider(useCounterStore);
```

```tsx
// ⚠ not compiled — the body is an argument, so the compiler skips it
const [CounterProvider, useCounterActions, useCounterState] = createProvider(
  () => {
    ...
  },
);
```

The two forms behave identically at runtime; the difference is only how much
memoization you get for free. In the compiled form, derived objects and arrays
in the provider body are stabilized automatically, so selecting them whole
(`useItemsState((s) => s.filtered)`) no longer re-renders on every state change
and the `useMemo` from the previous section becomes unnecessary.

Actions never needed the compiler — `createProvider` already gives them stable
references through its [actions object](#actions-object).

The compiler is not required by React Arven, and neither form of the provider
body needs it to work. On React 19 its output runs as-is; on React 18 it
additionally needs `target: '18'` and the `react-compiler-runtime` package — see
[the React Compiler docs](https://react.dev/reference/react-compiler/target).

### Using `shallow`

If you need to transform data in the state selector, use the shallow function to perform comparison on object properties instead of the top-level object.

```tsx
import { shallow } from 'react-arven'

function Counter() {
  const { count, label } = useCounterState(
    s => ({
      count: s.count,
      label: s.label
    }),
    shallow
  )

  ...
}
```

This way you'll make sure your component doesn't re-render every time. This functionality is inspired by the Zustand library.


## Components without a provider

Called outside of their provider, the context is `null` — the same way a plain React context falls back to its default value. This makes it possible to write a component that renders with or without the provider above it, as long as its selector can cope with the absence:

```tsx
function Counter() {
  const count = useCounterState((s) => s?.count); // note the `?.`
  const actions = useCounterActions();

  if (actions === null) {
    return <div>No counter here</div>;
  }

  return <button onClick={actions.increment}>Count: {count}</button>;
}
```

`useCounterActions` returns `null`, and the state selector is called with `null` as its state. A selector that is not written for it — `s => s.count` — therefore throws right there, in your own code, naming the field it wanted. That is deliberate: a missing provider shows up immediately at the call site instead of leaking an `undefined` deeper into the tree.

> **Note:** The `null` is **not** part of the return type. Types stay narrow so that components inside their provider — the usual case — don't have to carry `?.` everywhere.

If you want the `null` in the types somewhere, wrap the hook and annotate the return value — no cast needed:

```tsx
type CounterActions = ReturnType<typeof useCounterActions>;

function useOptionalCounterActions(): CounterActions | null {
  return useCounterActions();
}

function useOptionalCount(): number | undefined {
  return useCounterState((s) => s?.count);
}
```
