import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
      // Not required to build — resolve.dedupe below already makes the
      // library's injected "react/compiler-runtime" resolve correctly. This is
      // for fidelity: react-arven is symlinked to ../lib, so its real path has
      // no "node_modules" segment and the default exclude misses it. Installed
      // consumers always have it under node_modules, where it is never
      // compiled, so scoping to app source tests what users actually run.
      include: [/[\\/]testcompiler[\\/]src[\\/]/],
    }),
  ],
  resolve: {
    // react-arven is symlinked to ../lib, which has its own React 18 for the
    // multi-version test matrix. Without deduping, the library's bare "react"
    // import resolves there and the bundle ends up with two Reacts — the
    // library calls React 18's hooks while react-dom 19 does the rendering.
    dedupe: ["react", "react-dom"],
  },
});
