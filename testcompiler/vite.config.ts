import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
      // react-arven is a symlinked workspace dep, so vite resolves it to its
      // real path under ../lib — which has no "node_modules" segment for the
      // default exclude to match. Without this the compiler rewrites the
      // library's prebuilt dist and injects "react/compiler-runtime", which
      // then resolves against lib's own React 18 and fails.
      include: [/[\\/]testcompiler[\\/]src[\\/]/],
    }),
  ],
});
