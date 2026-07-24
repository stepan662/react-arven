import React, { useState } from "react";
import { describe, test, expect } from "vitest";
import { render, act } from "@test-utils";
import { createProvider } from "../src/createProvider";

function capture<T>(fn: () => T): { value?: T; error?: string } {
  try {
    return { value: fn() };
  } catch (e: any) {
    return { error: e.message };
  }
}

describe("missing actions", () => {
  test("throws when an action is missing from the current shape", () => {
    let setPhase: (n: number) => void;
    const [Provider, useActions] = createProvider(() => {
      const [phase, sp] = useState(0);
      setPhase = sp;
      const actions: any = { always: () => "always" };
      if (phase === 0) actions.early = () => "early";
      return { actions, state: { phase } };
    });

    let held: any;
    function Ui() {
      held = useActions();
      return null;
    }
    render(
      <Provider>
        <Ui />
      </Provider>,
    );

    expect(held.early()).toBe("early");
    act(() => setPhase(1));

    const { error } = capture(() => held.early());
    expect(error).toContain('Action "early" is missing');
    expect(error).toContain("same shape on every render");
    // unaffected actions keep working
    expect(held.always()).toBe("always");
  });

  test("keeps working while the provider renders a fallback", async () => {
    const log: string[] = [];
    let gate: (v: boolean) => void;
    const [Provider, useActions] = createProvider(() => {
      const [loading, setLoading] = useState(false);
      gate = setLoading;
      const actions = {
        save: async () => {
          log.push("save");
          return "saved";
        },
      };
      if (loading) return <div data-testid="fallback" />;
      return { actions, state: { loading } };
    });

    let held: any;
    function Ui() {
      held = useActions();
      return null;
    }
    render(
      <Provider>
        <Ui />
      </Provider>,
    );

    expect(await held.save()).toBe("saved");
    act(() => gate(true));

    // An early return is a rendering state, not a loss of the actions — a
    // promise chain that spans it must not silently yield undefined.
    expect(await held.save()).toBe("saved");
    expect(log).toEqual(["save", "save"]);
  });

  test("reports the full path for nested actions", () => {
    let setPhase: (n: number) => void;
    const [Provider, useActions] = createProvider(() => {
      const [phase, sp] = useState(0);
      setPhase = sp;
      const actions: any = { counter: { inc: () => "inc" } };
      if (phase === 1) actions.counter = {};
      return { actions, state: { phase } };
    });
    let held: any;
    function Ui() {
      held = useActions();
      return null;
    }
    render(
      <Provider>
        <Ui />
      </Provider>,
    );
    act(() => setPhase(1));
    const { error } = capture(() => held.counter.inc());
    expect(error).toContain('"counter.inc"');
  });
});

describe("unmount stays a no-op", () => {
  test("an action still runs after unmount, and its setState is inert", () => {
    const log: string[] = [];
    const [Provider, useActions] = createProvider(() => {
      const [n, setN] = useState(0);
      return {
        actions: {
          bump: () => {
            log.push("ran");
            setN((x) => x + 1);
            return "returned";
          },
        },
        state: { n },
      };
    });

    let held: any;
    function Ui() {
      held = useActions();
      return null;
    }
    function App({ show }: { show: boolean }) {
      return show ? (
        <Provider>
          <Ui />
        </Provider>
      ) : (
        <div />
      );
    }

    const { rerender } = render(<App show />);
    expect(held.bump()).toBe("returned");

    act(() => {
      rerender(<App show={false} />);
    });

    const after = capture(() => held.bump());
    expect(after.error).toBeUndefined();
    expect(after.value).toBe("returned");
    expect(log).toEqual(["ran", "ran"]);
  });

  test("a gated provider that then unmounts still resolves its actions", () => {
    let gate: (v: boolean) => void;
    const [Provider, useActions] = createProvider(() => {
      const [loading, setLoading] = useState(false);
      gate = setLoading;
      const actions = { go: () => "went" };
      if (loading) return <div />;
      return { actions, state: { loading } };
    });

    let held: any;
    function Ui() {
      held = useActions();
      return null;
    }
    function App({ show }: { show: boolean }) {
      return show ? (
        <Provider>
          <Ui />
        </Provider>
      ) : (
        <div />
      );
    }

    const { rerender } = render(<App show />);
    act(() => gate(true));
    act(() => {
      rerender(<App show={false} />);
    });

    const after = capture(() => held.go());
    expect(after.error).toBeUndefined();
    expect(after.value).toBe("went");
  });
});

describe("this binding", () => {
  test("nested actions can call siblings through `this`", () => {
    const [Provider, useActions] = createProvider(() => ({
      actions: {
        group: {
          inner() {
            return "inner";
          },
          outer(this: any) {
            return this.inner();
          },
        },
      },
      state: { x: 1 },
    }));
    let held: any;
    function Ui() {
      held = useActions();
      return null;
    }
    render(
      <Provider>
        <Ui />
      </Provider>,
    );
    expect(held.group.outer()).toBe("inner");
  });
});
