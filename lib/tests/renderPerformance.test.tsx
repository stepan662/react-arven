import React from "react";
import { describe, test, expect } from "vitest";
import { act, render, screen } from "@test-utils";
import { createProvider } from "../src/createProvider";
import { shallow } from "../src/shallow";

describe("render performance", () => {
  test("no unnecessary re-renders on unrelated state change", () => {
    let countRenders = 0;
    let otherRenders = 0;

    const [Provider, useActions, useStateContext] = createProvider(() => {
      const [count, setCount] = React.useState(0);
      const [other, setOther] = React.useState("unchanged");

      return {
        state: { count, other },
        actions: { setCount, setOther },
      };
    });

    const CountComponent = () => {
      countRenders++;
      const count = useStateContext((s) => s.count);
      return <div>Count: {count}</div>;
    };

    const OtherComponent = () => {
      otherRenders++;
      const other = useStateContext((s) => s.other);
      return <div>Other: {other}</div>;
    };

    const ControlComponent = () => {
      const { setOther } = useActions();
      return <button onClick={() => setOther("updated")}>Update other</button>;
    };

    render(
      <Provider>
        <CountComponent />
        <OtherComponent />
        <ControlComponent />
      </Provider>,
    );

    countRenders = 0;
    otherRenders = 0;

    act(() => {
      screen.getByRole("button").click();
    });

    expect(countRenders).toBe(0);
    expect(otherRenders).toBe(1);
  });

  test("re-renders only when selected state changes", () => {
    let countRenders = 0;
    let otherRenders = 0;

    const [Provider, useActions, useStateContext] = createProvider(() => {
      const [count, setCount] = React.useState(0);
      const [other, setOther] = React.useState("test");

      return {
        state: { count, other },
        actions: { setCount, setOther },
      };
    });

    const CountComponent = () => {
      countRenders++;
      const count = useStateContext((s) => s.count);
      return <div>Count: {count}</div>;
    };

    const OtherComponent = () => {
      otherRenders++;
      const other = useStateContext((s) => s.other);
      return <div>Other: {other}</div>;
    };

    const ControlComponent = () => {
      const { setCount } = useActions();
      return (
        <button onClick={() => setCount((prev) => prev + 1)}>
          Update count
        </button>
      );
    };

    render(
      <Provider>
        <CountComponent />
        <OtherComponent />
        <ControlComponent />
      </Provider>,
    );

    countRenders = 0;
    otherRenders = 0;

    act(() => {
      screen.getByRole("button").click();
    });

    expect(countRenders).toBe(1);
    expect(otherRenders).toBe(0);
  });

  test("actions are stable references", () => {
    let firstActions: any;
    let stableRef: any;

    const [Provider, useActions] = createProvider(() => {
      const [count, setCount] = React.useState(0);
      return {
        state: { count },
        actions: { setCount },
      };
    });

    const ActionComponent = () => {
      const actions = useActions();
      if (!firstActions) firstActions = actions;
      stableRef = actions;
      return (
        <button onClick={() => actions.setCount((prev: number) => prev + 1)}>
          Increment
        </button>
      );
    };

    render(
      <Provider>
        <ActionComponent />
      </Provider>,
    );

    act(() => {
      screen.getByRole("button").click();
    });

    expect(stableRef).toBe(firstActions);
  });

  test("uses shallow equality to avoid rerenders for unchanged selected object values", () => {
    let counterOneRenders = 0;
    let counterTwoRenders = 0;

    const [Provider, useActions, useStateContext] = createProvider(() => {
      const [counterOne, setCounterOne] = React.useState(0);
      const [counterTwo, setCounterTwo] = React.useState(0);

      return {
        state: { counterOne, counterTwo },
        actions: {
          incrementCounterOne: () => setCounterOne((prev) => prev + 1),
          incrementCounterTwo: () => setCounterTwo((prev) => prev + 1),
        },
      };
    });

    const CounterOne = () => {
      counterOneRenders++;
      const selected = useStateContext(
        (s) => ({ count: s.counterOne }),
        shallow,
      );
      const { incrementCounterOne } = useActions();
      return (
        <div>
          <div>Counter One: {selected.count}</div>
          <button onClick={() => incrementCounterOne()}>
            Update counter one
          </button>
        </div>
      );
    };

    const CounterTwo = () => {
      counterTwoRenders++;
      const selected = useStateContext(
        (s) => ({ count: s.counterTwo }),
        shallow,
      );
      const { incrementCounterTwo } = useActions();
      return (
        <div>
          <div>Counter Two: {selected.count}</div>
          <button onClick={() => incrementCounterTwo()}>
            Update counter two
          </button>
        </div>
      );
    };

    render(
      <Provider>
        <CounterOne />
        <CounterTwo />
      </Provider>,
    );

    expect(counterOneRenders).toBe(1);
    expect(counterTwoRenders).toBe(1);

    act(() => {
      screen.getByText("Update counter one").click();
    });

    expect(counterOneRenders).toBe(2);
    expect(counterTwoRenders).toBe(1);
  });

  test("a provider render that leaves state identity intact does not fan out", () => {
    let selectorRuns = 0;

    // Stands in for a compiled provider body: `state` keeps its reference
    // while `count` is unchanged, so a render caused only by `label` must not
    // reach the consumers at all.
    const [Provider, , useStateContext] = createProvider(
      ({ label }: { label: string }) => {
        const [count, setCount] = React.useState(0);
        const state = React.useMemo(() => ({ count }), [count]);
        void label;
        return { state, actions: { setCount } };
      },
    );

    const Consumer = () => {
      useStateContext((s) => {
        selectorRuns++;
        return s.count;
      });
      return null;
    };

    const App = () => {
      const [label, setLabel] = React.useState("a");
      // Held stable so the only route to the consumer is the store fan-out,
      // not an ordinary parent re-render handing it a new element.
      const children = React.useMemo(() => <Consumer />, []);
      return (
        <>
          <button onClick={() => setLabel((l) => l + "!")}>relabel</button>
          <Provider label={label}>{children}</Provider>
        </>
      );
    };

    render(<App />);
    selectorRuns = 0;

    act(() => {
      screen.getByText("relabel").click();
    });

    expect(selectorRuns).toBe(0);
  });

  test("a state change still reaches consumers", () => {
    let selectorRuns = 0;

    const [Provider, useActions, useStateContext] = createProvider(() => {
      const [count, setCount] = React.useState(0);
      const state = React.useMemo(() => ({ count }), [count]);
      return { state, actions: { increment: () => setCount((c) => c + 1) } };
    });

    const Consumer = () => {
      const count = useStateContext((s) => {
        selectorRuns++;
        return s.count;
      });
      return <div>Count: {count}</div>;
    };

    const Control = () => {
      const { increment } = useActions();
      return <button onClick={increment}>increment</button>;
    };

    render(
      <Provider>
        <Consumer />
        <Control />
      </Provider>,
    );
    selectorRuns = 0;

    act(() => {
      screen.getByText("increment").click();
    });

    expect(selectorRuns).toBeGreaterThan(0);
    expect(screen.getByText("Count: 1")).toBeTruthy();
  });
});
