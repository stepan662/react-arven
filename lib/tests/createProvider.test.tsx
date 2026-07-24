import { useState } from "react";
import { describe, test, expect, vi } from "vitest";
import { act, render, screen } from "@test-utils";
import { createProvider } from "../src/createProvider";

describe("createProvider", () => {
  test("renders provider and exposes state/actions", () => {
    const [Provider, useActions, useStateContext] = createProvider(() => ({
      state: { count: 0 },
      actions: { increment: vi.fn() },
    }));

    const TestComponent = () => {
      const count = useStateContext((s) => s.count);
      const actions = useActions();
      return (
        <div>
          <span>Count: {count}</span>
          <button onClick={actions.increment}>Increment</button>
        </div>
      );
    };

    render(
      <Provider>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByText("Count: 0")).toBeTruthy();
    expect(screen.getByRole("button")).toBeTruthy();
  });

  test("actions pass arguments and return values", () => {
    const add = vi.fn((num: number) => `incremented ${num}`);
    const [Provider, useActions] = createProvider(() => ({
      state: { count: 0 },
      actions: { add },
    }));

    const TestComponent = () => {
      const actions = useActions();
      return <button onClick={() => actions.add(1)}>Add 1</button>;
    };

    render(
      <Provider>
        <TestComponent />
      </Provider>,
    );

    act(() => {
      screen.getByRole("button").click();
    });

    expect(add).toHaveBeenCalledWith(1);
    expect(add).toReturnWith("incremented 1");
  });

  test("actions object is stable", () => {
    const [Provider, useActions, useStateContext] = createProvider(() => {
      const [count, setCount] = useState(0);

      function increment() {
        setCount(count + 1);
      }

      return {
        state: { count },
        actions: { increment },
      };
    });
    let renderCount = 0;
    let actionsRef: ReturnType<typeof useActions> | null = null;

    const TestComponent = () => {
      const actions = useActions();
      const count = useStateContext((s) => s.count);
      renderCount++;
      actionsRef = actions;
      return (
        <div>
          <span>Count: {count}</span>
          <button onClick={() => actions.increment()}>Increment</button>
        </div>
      );
    };

    render(
      <Provider>
        <TestComponent />
      </Provider>,
    );

    expect(renderCount).toBe(1);
    let firstActionsRef = actionsRef;

    act(() => {
      screen.getByRole("button").click();
    });

    let secondActionsRef = actionsRef;

    expect(renderCount).toBe(2);
    expect(screen.getByText("Count: 1")).toBeTruthy();
    expect(firstActionsRef).toBe(secondActionsRef);

    act(() => {
      screen.getByRole("button").click();
    });

    let thirdActionsRef = actionsRef;

    expect(renderCount).toBe(3);
    expect(screen.getByText("Count: 2")).toBeTruthy();
    expect(firstActionsRef).toBe(thirdActionsRef);
  });

  test("unstable actions are made stable", () => {
    const [Provider, useActions, useStateContext] = createProvider(() => {
      const [count, setCount] = useState(0);

      function increment() {
        setCount(count + 1);
      }

      return {
        state: { count },
        actions: { increment },
      };
    });
    let renderCount = 0;

    let incrementRef: (() => void) | null = null;

    const TestComponent = () => {
      const { increment } = useActions();
      const count = useStateContext((s) => s.count);
      renderCount++;
      incrementRef = increment;
      return (
        <div>
          <span>Count: {count}</span>
          <button onClick={() => increment()}>Increment</button>
        </div>
      );
    };

    render(
      <Provider>
        <TestComponent />
      </Provider>,
    );

    expect(renderCount).toBe(1);
    let firstIncrementRef = incrementRef;

    act(() => {
      screen.getByRole("button").click();
    });

    let secondIncrementRef = incrementRef;

    expect(renderCount).toBe(2);
    expect(screen.getByText("Count: 1")).toBeTruthy();
    expect(firstIncrementRef).toBe(secondIncrementRef);
  });

  test("unstable nested actions work", () => {
    const [Provider, useActions, useStateContext] = createProvider(() => {
      const [count, setCount] = useState(0);

      function increment() {
        setCount(count + 1);
      }

      return {
        state: { count },
        actions: { counter: { increment } },
      };
    });
    let renderCount = 0;

    let incrementRef: (() => void) | null = null;

    const TestComponent = () => {
      const {
        counter: { increment },
      } = useActions();
      const count = useStateContext((s) => s.count);
      renderCount++;
      incrementRef = increment;
      return (
        <div>
          <span>Count: {count}</span>
          <button onClick={() => increment()}>Increment</button>
        </div>
      );
    };

    render(
      <Provider>
        <TestComponent />
      </Provider>,
    );

    expect(renderCount).toBe(1);
    let firstIncrementRef = incrementRef;

    act(() => {
      screen.getByRole("button").click();
    });

    let secondIncrementRef = incrementRef;

    expect(renderCount).toBe(2);
    expect(screen.getByText("Count: 1")).toBeTruthy();
    expect(firstIncrementRef).toBe(secondIncrementRef);
  });

  test("renders fallback if controller returns react element", () => {
    const [Provider] = createProvider(({ loading }: { loading?: boolean }) => {
      if (loading) {
        return <div>Loading...</div>;
      }

      return {
        state: { count: 0 },
        actions: { increment: vi.fn() },
      };
    });

    let renderCount = 0;

    const TestComponent = () => {
      renderCount++;
      return <div>Test component</div>;
    };

    render(
      <Provider loading>
        <TestComponent />
      </Provider>,
    );

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(renderCount).toBe(0);
  });

  test("renders nothing if controller returns null", () => {
    const [Provider] = createProvider(({ loading }: { loading?: boolean }) => {
      if (loading) {
        return null;
      }

      return {
        state: { count: 0 },
        actions: { increment: vi.fn() },
      };
    });

    let renderCount = 0;

    const TestComponent = () => {
      renderCount++;
      return <div>Test component</div>;
    };

    render(
      <Provider loading>
        <TestComponent />
      </Provider>,
    );

    expect(screen.queryByText("Test component")).toBeFalsy();
    expect(renderCount).toBe(0);
  });

  test("switches from loading to context", () => {
    const [Provider, useActions] = createProvider(() => {
      const [loading, setLoading] = useState(false);

      const toggleLoading = () => setLoading((prev) => !prev);

      if (loading) {
        return <button onClick={toggleLoading}>Loading... Stop</button>;
      }

      return {
        state: { loading },
        actions: { toggleLoading },
      };
    });

    const TestComponent = () => {
      const { toggleLoading } = useActions();
      return <button onClick={toggleLoading}>Start loading</button>;
    };

    render(
      <Provider>
        <TestComponent />
      </Provider>,
    );

    expect(screen.queryByText("Start loading")).toBeTruthy();
    act(() => {
      screen.getByText("Start loading").click();
    });
    expect(screen.getByText("Loading... Stop")).toBeTruthy();

    act(() => {
      screen.getByText("Loading... Stop").click();
    });
    expect(screen.getByText("Start loading")).toBeTruthy();
  });

  describe("without a provider", () => {
    const makeProvider = () =>
      createProvider(() => {
        const [loading, setLoading] = useState(false);

        const toggleLoading = () => setLoading((prev) => !prev);

        if (loading) {
          return <button onClick={toggleLoading}>Loading... Stop</button>;
        }

        return {
          state: { loading },
          actions: { toggleLoading },
        };
      });

    // React logs render errors itself; keep the reporter readable.
    const renderSilently = (ui: React.ReactElement) => {
      const original = console.error;
      console.error = () => {};
      try {
        render(ui);
      } finally {
        console.error = original;
      }
    };

    test("useStateContext fails", () => {
      const [, , useStateContext] = makeProvider();

      const TestComponent = () => {
        const state = useStateContext((s) => s);
        return <button>State: "{`${state}`}"</button>;
      };

      expect(() => renderSilently(<TestComponent />)).toThrow(
        /useState was called outside of its Provider/,
      );
    });

    test("useActions fails", () => {
      const [, useActions] = makeProvider();

      const TestComponent = () => {
        const actions = useActions();
        return <button>Actions: "{`${actions}`}"</button>;
      };

      expect(() => renderSilently(<TestComponent />)).toThrow(
        /useActions was called outside of its Provider/,
      );
    });
  });
});
