import React from "react";
import { createProvider, shallow } from "react-arven";

const [CounterProvider, useCounterActions, useCounterState] = createProvider(
  () => {
    const [state, setState] = React.useState({ count: 0 });

    const actions = {
      increment() {
        setState((prev) => ({ count: prev.count + 1 }));
      },
      decrement() {
        setState((prev) => ({ count: prev.count - 1 }));
      },
      pointless() {
        setState((prev) => ({ count: prev.count }));
      },
    };

    return {
      state,
      actions,
    };
  },
);

function Counter() {
  const state = useCounterState((state) => ({ ...state }), shallow);
  const { increment, decrement, pointless } = useCounterActions();

  console.log("Counter rendered");
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 320 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Count: {state.count}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={decrement}>-</button>
        <button onClick={increment}>+</button>
        <button onClick={pointless}>pointless</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <CounterProvider>
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <h1>react-arven testapp</h1>
        <p>
          This app imports the package as a workspace dependency and uses its
          provider hook.
        </p>
        <Counter />
      </div>
    </CounterProvider>
  );
}
