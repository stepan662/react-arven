import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

// This app exists to prove react-arven survives the React Compiler, so the
// interesting half of this config is eslint-plugin-react-hooks' recommended
// set: it runs the compiler's own diagnostics (purity, immutability,
// incompatible-library, set-state-in-render, ...) over code that consumes the
// library. `vite build` only proves the app compiles; these rules are what
// actually check the library plays by the compiler's rules.
export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // `configs.recommended` is still the legacy eslintrc shape in v7 and
      // ESLint 10 rejects it; the flat namespace is the one to use here.
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
