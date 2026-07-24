import {
  CounterProvider,
  useCounterActions,
  useCounterState,
} from "./CounterProvider";

function Counter() {
  const derrived = useCounterState((c) => c.derrived);
  const { increment, decrement, pointless } = useCounterActions();
  console.log("Counter re-rendered");

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 320 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>
        Count: {derrived.count}
      </div>
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
