import React, { Suspense, useState } from "react";
import { describe, test, expect } from "vitest";
import { render, screen, act } from "@test-utils";
import { createProvider } from "../src/createProvider";

// React 16/17 have no concurrent features; fall back to a plain call so the
// shared tests still exercise the non-transition path there.
const startTransition: (fn: () => void) => void =
  (React as any).startTransition ?? ((fn: () => void) => fn());
const hasTransitions = typeof (React as any).startTransition === "function";

function createResource() {
  let resolve!: () => void;
  let done = false;
  const promise = new Promise<void>((r) => {
    resolve = () => {
      done = true;
      r();
    };
  });
  return {
    read() {
      if (!done) throw promise;
      return "loaded";
    },
    resolve: async () => {
      await act(async () => {
        resolve();
        await promise;
      });
    },
  };
}

describe("suspense", () => {
  test("consumer inside a boundary sees updates made while it was suspended", async () => {
    const res = createResource();
    const [Provider, useActions, useValue] = createProvider(() => {
      const [count, setCount] = useState(0);
      return { actions: { inc: () => setCount((c) => c + 1) }, state: { count } };
    });

    function Display({ id }: { id: string }) {
      const count = useValue((s) => s.count);
      return <div data-testid={id}>{count}</div>;
    }
    function Controls() {
      const { inc } = useActions();
      return <button data-testid="inc" onClick={inc} />;
    }
    function Suspending() {
      res.read();
      return <Display id="inside" />;
    }

    render(
      <Provider>
        <Controls />
        <Display id="outside" />
        <Suspense fallback={<div data-testid="fb" />}>
          <Suspending />
        </Suspense>
      </Provider>,
    );

    expect(screen.getByTestId("fb")).toBeTruthy();
    act(() => {
      screen.getByTestId("inc").click();
      screen.getByTestId("inc").click();
    });
    expect(screen.getByTestId("outside").textContent).toBe("2");

    await res.resolve();
    expect(screen.getByTestId("inside").textContent).toBe("2");
  });

  test("provider inside a boundary that never commits", async () => {
    const res = createResource();
    const [Provider, useActions, useValue] = createProvider(() => {
      const [count, setCount] = useState(0);
      return { actions: { inc: () => setCount((c) => c + 1) }, state: { count } };
    });

    function Suspending() {
      res.read();
      return null;
    }

    render(
      <Suspense fallback={<div data-testid="fb" />}>
        <Provider>
          <Consumer />
          <Suspending />
        </Provider>
      </Suspense>,
    );

    function Consumer() {
      const count = useValue((s) => s.count);
      const { inc } = useActions();
      return (
        <button data-testid="v" onClick={inc}>
          {count}
        </button>
      );
    }

    expect(screen.getByTestId("fb")).toBeTruthy();
    await res.resolve();
    expect(screen.getByTestId("v").textContent).toBe("0");
    act(() => {
      screen.getByTestId("v").click();
    });
    expect(screen.getByTestId("v").textContent).toBe("1");
  });

  test("the provider body itself can suspend", async () => {
    const res = createResource();
    const [Provider, useActions, useValue] = createProvider(() => {
      const data = res.read();
      const [n, setN] = useState(0);
      return { actions: { inc: () => setN((v) => v + 1) }, state: { data, n } };
    });

    function Child() {
      const data = useValue((s) => s.data);
      const n = useValue((s) => s.n);
      const { inc } = useActions();
      return (
        <button data-testid="c" onClick={inc}>{`${data}:${n}`}</button>
      );
    }

    render(
      <Suspense fallback={<div data-testid="fb" />}>
        <Provider>
          <Child />
        </Provider>
      </Suspense>,
    );

    expect(screen.getByTestId("fb")).toBeTruthy();
    await res.resolve();
    expect(screen.getByTestId("c").textContent).toBe("loaded:0");
    act(() => {
      screen.getByTestId("c").click();
    });
    expect(screen.getByTestId("c").textContent).toBe("loaded:1");
  });

  test("consumers never disagree with each other", async () => {
    const [Provider, useActions, useValue] = createProvider(() => {
      const [count, setCount] = useState(0);
      return { actions: { inc: () => setCount((c) => c + 1) }, state: { count } };
    });

    function Display({ id }: { id: string }) {
      const count = useValue((s) => s.count);
      return <div data-testid={id}>{count}</div>;
    }
    function App() {
      const [show, setShow] = useState(false);
      const { inc } = useActions();
      return (
        <>
          <button
            data-testid="go"
            onClick={() => {
              inc();
              setShow(true);
            }}
          />
          <Display id="a" />
          {show ? <Display id="b" /> : null}
        </>
      );
    }

    render(
      <Provider>
        <App />
      </Provider>,
    );
    act(() => {
      screen.getByTestId("go").click();
    });
    expect(screen.getByTestId("a").textContent).toBe("1");
    expect(screen.getByTestId("b").textContent).toBe("1");
  });

  test("actions do not capture state from a render that never commits", async () => {
    const res = createResource();
    const reported: number[] = [];
    const [Provider, useActions, useValue] = createProvider(() => {
      const [v, setV] = useState(1);
      return {
        actions: {
          bump: () => setV((x) => x + 1),
          report: () => reported.push(v),
        },
        state: { v },
      };
    });

    function Suspending() {
      res.read();
      return null;
    }
    function App() {
      const { bump, report } = useActions();
      const v = useValue((s) => s.v);
      const [show, setShow] = useState(false);
      return (
        <>
          <div data-testid="v">{v}</div>
          <button
            data-testid="go"
            onClick={() =>
              startTransition(() => {
                bump();
                setShow(true);
              })
            }
          />
          <button data-testid="report" onClick={report} />
          <Suspense fallback={<div data-testid="fb" />}>
            {show ? <Suspending /> : null}
          </Suspense>
        </>
      );
    }

    render(
      <Provider>
        <App />
      </Provider>,
    );

    act(() => {
      screen.getByTestId("go").click();
    });
    act(() => {
      screen.getByTestId("report").click();
    });

    // Whatever the transition is doing, an action must agree with the UI the
    // user is actually looking at.
    const onScreen = Number(screen.getByTestId("v").textContent);
    expect(reported).toEqual([onScreen]);
    if (hasTransitions) {
      // the transition is still blocked by the suspending child
      expect(onScreen).toBe(1);
    }

    await res.resolve();
    act(() => {
      screen.getByTestId("report").click();
    });
    expect(reported[reported.length - 1]).toBe(2);
    expect(screen.getByTestId("v").textContent).toBe("2");
  });
});
