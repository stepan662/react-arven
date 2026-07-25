// @vitest-environment node
//
// Deliberately not jsdom. `useIsomorphicLayoutEffect` picks its effect from
// `typeof window`, so under jsdom a server render still takes the
// useLayoutEffect branch — which React warns about and which no real server
// ever does. Running without a DOM is both the faithful environment and the
// only one that actually covers the server branch of that guard.
import React, { useState } from "react";
import { describe, test, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createProvider } from "../src/createProvider";
import { shallow } from "../src/shallow";

describe("server rendering", () => {
  test("renders state on the server", () => {
    const [Provider, , useValue] = createProvider(() => {
      const [count] = useState(7);
      return { actions: {}, state: { count, label: "hi" } };
    });

    function Child() {
      const count = useValue((s) => s.count);
      return <div>{count}</div>;
    }

    expect(
      renderToString(
        <Provider>
          <Child />
        </Provider>,
      ),
    ).toContain("7");
  });

  test("renders with a shallow-compared selector", () => {
    const [Provider, , useValue] = createProvider(() => {
      return { actions: {}, state: { a: 1, b: 2 } };
    });

    function Child() {
      const { a, b } = useValue((s) => ({ a: s.a, b: s.b }), shallow);
      return <div>{`${a}-${b}`}</div>;
    }

    expect(
      renderToString(
        <Provider>
          <Child />
        </Provider>,
      ),
    ).toContain("1-2");
  });

  test("actions are callable on the server render pass", () => {
    const calls: string[] = [];
    const [Provider, useActions] = createProvider(() => ({
      actions: { ping: () => calls.push("ping") },
      state: { x: 1 },
    }));

    function Child() {
      const { ping } = useActions();
      // not a realistic pattern, but proves the ref is seeded during render
      // rather than only in a commit effect (which never runs on the server)
      if (calls.length === 0) ping();
      return <div>{calls.length}</div>;
    }

    expect(
      renderToString(
        <Provider>
          <Child />
        </Provider>,
      ),
    ).toContain("1");
  });

  test("early-return fallback renders on the server", () => {
    const [Provider] = createProvider(() => <span>loading</span>);

    expect(
      renderToString(
        <Provider>
          <div>never</div>
        </Provider>,
      ),
    ).toContain("loading");
  });
});
