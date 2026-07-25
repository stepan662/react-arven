import { defineWorkspace } from "vitest/config";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

/**
 * Runs the suite against each supported React major, by pointing the module
 * resolver at the copy installed in the matching test app.
 */
const project = (name: string, appDir: string) => {
  const modules = resolve(__dir, `../${appDir}/node_modules`);

  return {
    extends: "./vitest.config.ts",
    test: { name },
    resolve: {
      // Order matters: the more specific react-dom entry points must precede
      // the bare "react-dom", which is matched as a prefix.
      alias: [
        {
          find: "@testing-library/react",
          replacement: resolve(modules, "@testing-library/react"),
        },
        {
          find: "react-dom/client",
          replacement: resolve(modules, "react-dom/client.js"),
        },
        {
          find: "react-dom/server",
          replacement: resolve(modules, "react-dom/server.browser.js"),
        },
        { find: "react-dom", replacement: resolve(modules, "react-dom") },
        { find: "react", replacement: resolve(modules, "react") },
      ],
    },
  };
};

export default defineWorkspace([
  project("react19", "testapp19"),
  project("react18", "testapp18"),
]);
