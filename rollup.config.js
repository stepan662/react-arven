import path from "path";
import { fileURLToPath } from "url";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import filesize from "rollup-plugin-filesize";
import dts from "rollup-plugin-dts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const input = path.resolve(__dirname, "lib/src/index.ts");
const distDir = path.resolve(__dirname, "lib/dist");
const external = ["react", "react-dom", "react/jsx-runtime"];

const out = (file) => path.resolve(distDir, file);

// Everything exported here is a hook or a context, so the whole entry is
// client-only. React Server Components need this directive to exist in the
// *published* file, not just in the source.
const USE_CLIENT = '"use client";';

// Rollup writes `output.banner` before output plugins run, so terser sees the
// directive as part of the chunk and drops it as a redundant statement.
// Re-adding it after minification is the only placement that survives.
const preserveUseClient = () => ({
  name: "preserve-use-client",
  renderChunk(code) {
    return code.startsWith(USE_CLIENT) ? code : `${USE_CLIENT}\n${code}`;
  },
});

const jsBundle = {
  input,
  external,
  plugins: [
    resolve({ extensions: [".js", ".ts", ".tsx"] }),
    commonjs(),
    typescript({
      tsconfig: path.resolve(__dirname, "lib/tsconfig.json"),
      // Declarations come from the dts bundle below, which flattens them into
      // one file per module format.
      declaration: false,
      declarationMap: false,
      rootDir: path.resolve(__dirname, "lib/src"),
      sourceMap: false,
      jsx: "react-jsx",
    }),
    filesize({
      showMinifiedSize: false,
    }),
  ],
  output: [
    {
      file: out("index.mjs"),
      format: "esm",
      banner: USE_CLIENT,
    },
    {
      file: out("index.min.mjs"),
      format: "esm",
      plugins: [terser(), preserveUseClient()],
    },
    {
      file: out("index.cjs"),
      format: "cjs",
      exports: "named",
      banner: USE_CLIENT,
    },
    {
      file: out("index.min.cjs"),
      format: "cjs",
      exports: "named",
      plugins: [terser(), preserveUseClient()],
    },
  ],
};

// One flat declaration file per format. Flattening matters: a multi-file
// declaration emit uses extensionless relative imports, which do not resolve
// under `moduleResolution: "node16"` from inside a .d.mts.
const typeBundle = {
  input,
  external,
  plugins: [dts()],
  output: [
    { file: out("index.d.mts"), format: "esm" },
    { file: out("index.d.cts"), format: "esm" },
    // Kept for the legacy top-level "types" field, which is what
    // moduleResolution: "node"/"node10" consumers read instead of the exports map.
    { file: out("index.d.ts"), format: "esm" },
  ],
};

export default [jsBundle, typeBundle];
