import { defineWorkspace } from "vitest/config";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const react16 = resolve(__dir, "../testapp16/node_modules");
const react17 = resolve(__dir, "../testapp17/node_modules");

export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: { name: "react19" },
  },
  {
    extends: "./vitest.config.ts",
    test: { name: "react17" },
    resolve: {
      alias: [
        {
          find: "@test-utils",
          replacement: resolve(__dir, "tests/test-utils-react17.ts"),
        },
        {
          find: "@testing-library/react",
          replacement: resolve(react17, "@testing-library/react"),
        },
        {
          find: "react-dom/test-utils",
          replacement: resolve(react17, "react-dom/test-utils.js"),
        },
        {
          find: "react-dom",
          replacement: resolve(react17, "react-dom"),
        },
        {
          find: "react",
          replacement: resolve(react17, "react"),
        },
      ],
    },
  },
  {
    extends: "./vitest.config.ts",
    test: { name: "react16" },
    resolve: {
      alias: [
        {
          find: "@test-utils",
          replacement: resolve(__dir, "tests/test-utils-react16.ts"),
        },
        {
          find: "@testing-library/react",
          replacement: resolve(react16, "@testing-library/react"),
        },
        {
          find: "react-dom/test-utils",
          replacement: resolve(react16, "react-dom/test-utils.js"),
        },
        {
          find: "react-dom",
          replacement: resolve(react16, "react-dom"),
        },
        {
          find: "react",
          replacement: resolve(react16, "react"),
        },
      ],
    },
  },
]);
