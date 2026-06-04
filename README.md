![React Arven logo](https://raw.githubusercontent.com/stepan662/react-arven/refs/heads/main/logos/logo.svg)

# React Arven

[![npm](https://img.shields.io/npm/v/react-arven)](https://www.npmjs.com/package/react-arven)
[![bundle size](https://img.shields.io/npm/unpacked-size/react-arven)](https://www.npmjs.com/package/react-arven)
[![license](https://img.shields.io/npm/l/react-arven)](https://github.com/stepan662/react-arven/blob/main/LICENSE)

A lightweight, fully typed React context helper with **stable action references** and **subscribable context**.

## Why React Arven?

Plain `useContext` re-renders every consumer on every state change, which pushes you toward splitting contexts, memoizing selectors, and wrapping every action in `useCallback`. Libraries like Zustand or Jotai solve this but live outside the React component tree — you lose the ability to use hooks naturally inside the store.

React Arven sits in the middle: it gives you a hook-friendly provider body (just write hooks as you normally would), granular re-renders via selector subscriptions, and stable action references — without any extra boilerplate.

| | React Arven | plain `useContext` | Zustand | constate | use-context-selector |
|---|---|---|---|---|---|
| Hooks inside store | Yes | Yes | No | Yes | Yes |
| Granular re-renders | Yes | No | Yes | Partial* | Yes |
| Stable action refs | Yes | Manual (`useCallback`) | Yes | Manual (`useCallback`) | Manual (`useCallback`) |
| Scoped to component tree | Yes | Yes | No | Yes | Yes |

\* constate achieves granular re-renders by splitting your hook into multiple separate contexts — one per value. This works well but requires you to restructure your code around it. React Arven uses selectors on a single context instead.

## Installation

Install react-arven with npm, yarn or pnpm:

```sh
npm i react-arven
```

## Usage

### Create provider

You create a provider component, you can use hooks there as in a regular React component. Instead of rendering HTML, we return an object with actions and state properties.

```tsx
import { createProvider } from "react-arven";

const [CounterProvider, useCounterActions, useCounterState] = createProvider(() => {
  const [count, setCount] = useState(0);

  function increment() {          // No useCallback necessary!
    setCount(val => val + 1)
  }

  return {
    actions: { increment },
    state: { count },
  };
});
```

1. `actions` - is an object with functions, to modify the state, accessible through `useCounterActions`
2. `state` - is a subscribable state, which you can access through `useCounterState`

You can name your provider and hooks whatever you like. I recommend convention similar to this one.

Both hooks are typed automatically through type inference, if you use TypeScript.

### Use provider in your app

Use the provider component, to provide context to children.

```tsx
function CounterApp() {
  return (
    <CounterProvider>
      <Counter />
    </CounterProvider>
  )
}
```

### Use state and actions

Now you can use hooks returned from the `createProvider` to use state and actions.

```tsx
function Counter() {
  const count = useCounterState(s => s.count)   // selecting only what is needed
  const { increment } = useCounterActions()
  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={increment}>Increment</button>
    </div>
  )
}
```

### TypeScript

The hooks returned by `createProvider` are fully typed — no manual annotations needed. Types are inferred directly from what you return in the provider body:

```tsx
const [CounterProvider, useCounterActions, useCounterState] = createProvider(() => {
  const [count, setCount] = useState(0);
  function increment() { setCount(val => val + 1) }

  return {
    actions: { increment },
    state: { count },
  };
});

// useCounterState: (selector: (state: { count: number }) => T) => T
// useCounterActions: () => { increment: () => void }
```

If you use `createProvider` with props, the provider component is typed accordingly:

```tsx
type Props = { itemId: number }

const [ItemDataProvider] = createProvider(({ itemId }: Props) => { ... });

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

const [CounterProvider, useCounterActions, useCounterState] = createProvider(() => {
  const { data, refetch } = useSomeFetchFunction(....);

  if (!data) {
    return <LoadingFallback />
  }

  return {
    actions: { refetch },
    state: { data },
  };
});
```

If you return a React component from the `createProvider` function, the library will just render the component without providing context and rendering children.

This way you can make sure your children will never receive `data` as undefined.

> **Note:** Don't use hooks after early return statement — [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) still apply!

### Provider with props

You can pass props to your provider the same way as to any other React component and then use them in the provider body, you can also pass them through context.

```tsx
type Props = {
  itemId: number
}

const [ItemDataProvider, ...] = createProvider(({ itemId }: Props) => {
  const { data, refetch } = useSomeFetchFunction(`/api/item/${itemId}`);

  return {
    actions: { refetch },
    state: { data, itemId },
  };
});

// Usage:

function MyApp() {
  return (
    <ItemDataProvider itemId={42}>
      <ItemComponent />
    </ItemDataProvider>
  )
}
```

### Using `shallow`

If you need to transform data in the state selector, use the shallow function to perform comparison on object properties instead of the top-level object.

```tsx
import { shallow } from 'react-arven'

function Counter() {
  const { count, label } = useCounterState(
    s => ({
      count: s.count,
      label: c.label
    }),
    shallow
  )

  ...
}
```

This way you'll make sure your component doesn't re-render every time. This functionality is inspired by the Zustand library.
