import { useState } from "react";
import { createProvider } from "react-arven";

const useCounterController = () => {
  const [count, setCount] = useState({ count: 0 });

  const actions = {
    increment() {
      setCount((prev) => ({ count: prev.count + 1 }));
    },
    decrement() {
      setCount((prev) => ({ count: prev.count - 1 }));
    },
    pointless() {
      setCount((prev) => ({ count: prev.count }));
    },
  };

  const derrived = { count: count.count * count.count };

  return {
    state: {
      count,
      derrived,
    },
    actions,
  };
};

export const [CounterProvider, useCounterActions, useCounterState] =
  createProvider(useCounterController);
