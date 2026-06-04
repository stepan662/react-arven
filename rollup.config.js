import path from "path";
import { fileURLToPath } from "url";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import filesize from "rollup-plugin-filesize";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  input: path.resolve(__dirname, "lib/src/index.ts"),
  external: ["react", "react-dom", "react/jsx-runtime"],
  plugins: [
    resolve({ extensions: [".js", ".ts", ".tsx"] }),
    commonjs(),
    typescript({
      tsconfig: path.resolve(__dirname, "lib/tsconfig.json"),
      declaration: true,
      declarationDir: path.resolve(__dirname, "lib/dist"),
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
      file: path.resolve(__dirname, "lib/dist/index.esm.js"),
      format: "esm",
    },
    {
      file: path.resolve(__dirname, "lib/dist/index.esm.min.js"),
      format: "esm",
      plugins: [terser()],
    },
    {
      file: path.resolve(__dirname, "lib/dist/index.cjs.js"),
      format: "cjs",
      exports: "named",
    },
    {
      file: path.resolve(__dirname, "lib/dist/index.cjs.min.js"),
      format: "cjs",
      exports: "named",
      plugins: [terser()],
    },
  ],
};
