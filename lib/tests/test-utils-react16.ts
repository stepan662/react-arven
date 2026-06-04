import { render as rtlRender, screen } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
// act lives in react-dom/test-utils in React 16
import { act } from "react-dom/test-utils";
import type { ReactElement } from "react";

export { act, screen };

// RTL v12 uses ReactDOM.render by default — no legacyRoot option needed
export function render(
  ui: ReactElement,
  options?: Record<string, unknown>,
): RenderResult {
  return rtlRender(ui, options as any);
}
