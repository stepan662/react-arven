import React from "react";
import { describe, test, expect } from "vitest";
import { act, render, screen } from "@test-utils";
import { createProvider } from "../src/createProvider";

describe("value propagation", () => {
  test("a changed selector closure re-selects without a store notification", () => {
    const [Provider, , useStateContext] = createProvider(() => {
      const [items] = React.useState({ a: "Alpha", b: "Beta" });
      return { state: { items }, actions: {} };
    });

    // The selector closes over a prop. Changing that prop must re-select even
    // though the store itself never changed and so never notified.
    const Item = ({ id }: { id: "a" | "b" }) => {
      const name = useStateContext((s) => s.items[id]);
      return <div data-testid="name">{name}</div>;
    };

    const Switcher = () => {
      const [id, setId] = React.useState<"a" | "b">("a");
      return (
        <>
          <button onClick={() => setId("b")}>switch</button>
          <Item id={id} />
        </>
      );
    };

    render(
      <Provider>
        <Switcher />
      </Provider>,
    );

    expect(screen.getByTestId("name").textContent).toBe("Alpha");

    act(() => {
      screen.getByRole("button").click();
    });

    expect(screen.getByTestId("name").textContent).toBe("Beta");
  });

  test("a changed equality function re-selects without a store notification", () => {
    const [Provider, , useStateContext] = createProvider(() => {
      const [items] = React.useState([1, 2, 3]);
      return { state: { items }, actions: {} };
    });

    const Sum = ({ upTo }: { upTo: number }) => {
      const total = useStateContext((s) =>
        s.items.slice(0, upTo).reduce((a, b) => a + b, 0),
      );
      return <div data-testid="sum">{total}</div>;
    };

    const Wrapper = () => {
      const [upTo, setUpTo] = React.useState(1);
      return (
        <>
          <button onClick={() => setUpTo(3)}>more</button>
          <Sum upTo={upTo} />
        </>
      );
    };

    render(
      <Provider>
        <Wrapper />
      </Provider>,
    );

    expect(screen.getByTestId("sum").textContent).toBe("1");

    act(() => {
      screen.getByRole("button").click();
    });

    expect(screen.getByTestId("sum").textContent).toBe("6");
  });

  test("subscribers update before the browser can paint", async () => {
    const [Provider, useActions, useStateContext] = createProvider(() => {
      const [count, setCount] = React.useState(0);
      return { state: { count }, actions: { setCount } };
    });

    const Consumer = () => {
      const count = useStateContext((s) => s.count);
      return <div data-testid="count">{count}</div>;
    };

    const Control = () => {
      const { setCount } = useActions();
      return <button onClick={() => setCount(1)}>go</button>;
    };

    render(
      <Provider>
        <Consumer />
        <Control />
      </Provider>,
    );

    // Deliberately not wrapped in act(): act() drains passive effects, which
    // is exactly what would hide a propagation that runs one commit late. The
    // act *environment* also diverts sync work to the act queue, so it has to
    // come off for React's real discrete-event flushing to happen here.
    const globals = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const wasActEnvironment = globals.IS_REACT_ACT_ENVIRONMENT;
    globals.IS_REACT_ACT_ENVIRONMENT = false;

    try {
      screen.getByRole("button").click();

      // React flushes work scheduled from a layout effect in a microtask at
      // the latest — still before paint. Passive effects land a task later,
      // which is a frame the user can see.
      await Promise.resolve();

      expect(screen.getByTestId("count").textContent).toBe("1");
    } finally {
      globals.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
    }
  });
});
