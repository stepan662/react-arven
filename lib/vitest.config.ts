import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    chaiConfig: {
      truncateThreshold: 0,
    },
  },
  resolve: {
    alias: [
      {
        find: "@test-utils",
        replacement: fileURLToPath(
          new URL("./tests/test-utils.ts", import.meta.url),
        ),
      },
    ],
  },
});
