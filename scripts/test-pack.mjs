#!/usr/bin/env node
/**
 * Smoke-tests the npm package before publishing:
 *   1. Packs lib/ into pack-test/ (tarball + extracted package/)
 *   2. Verifies every file-referencing field in package.json points to a real file
 *   3. Syntax-checks all dist bundles with `node --check`
 *   4. Confirms the "use client" banner survived minification
 *   5. Confirms expected exports appear in every .d.ts flavour
 *   6. Runs publint and are-the-types-wrong against the packed output
 *
 * Output is left in pack-test/ for inspection (gitignored).
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const libDir = join(rootDir, "lib");
const packTestDir = join(rootDir, "pack-test");

let failures = 0;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failures++;
}

function checkFile(label, relPath, packageDir) {
  if (existsSync(join(packageDir, relPath))) {
    pass(`${label}: ${relPath}`);
  } else {
    fail(`${label}: "${relPath}" — not found in package`);
  }
}

function walkExports(value, packageDir, path = "exports") {
  if (typeof value === "string") {
    checkFile(path, value, packageDir);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walkExports(v, packageDir, `${path}["${k}"]`);
    }
  }
}

// Reset output dir
if (existsSync(packTestDir)) rmSync(packTestDir, { recursive: true });
mkdirSync(packTestDir);

try {
  // 1. Pack directly into pack-test/
  console.log("Packing lib/ ...");
  const raw = execSync(`npm pack --json --pack-destination "${packTestDir}"`, {
    cwd: libDir,
  })
    .toString()
    .trim();
  const info = JSON.parse(raw);
  const entry = Array.isArray(info) ? info[0] : info;
  const tarballPath = join(packTestDir, entry.filename);
  console.log(
    `Packed: pack-test/${entry.filename}  (${entry.entryCount} files, ${(entry.size / 1024).toFixed(1)} kB)\n`,
  );

  // 2. Extract and remove the tarball
  execSync(`tar -xzf "${tarballPath}" -C "${packTestDir}"`);
  rmSync(tarballPath);
  const packageDir = join(packTestDir, "package");

  const pkg = JSON.parse(
    readFileSync(join(packageDir, "package.json"), "utf-8"),
  );

  // 3. File references
  console.log("Checking package.json file references...");
  for (const field of [
    "main",
    "module",
    "browser",
    "types",
    "unpkg",
    "jsdelivr",
  ]) {
    if (pkg[field]) checkFile(field, pkg[field], packageDir);
  }
  if (pkg.exports) walkExports(pkg.exports, packageDir);

  // 4. `files` entries
  console.log("\nChecking `files` entries...");
  for (const f of pkg.files ?? []) {
    if (existsSync(join(packageDir, f))) {
      pass(`"${f}" present`);
    } else {
      fail(`"${f}" — missing from package`);
    }
  }

  // 5. Syntax-check dist JS. The extension decides how `node --check` parses
  // each file, so this also catches ESM emitted into a CJS-interpreted file.
  console.log("\nSyntax-checking dist bundles...");
  const distDir = join(packageDir, "dist");
  const bundles = readdirSync(distDir).filter(
    (f) => f.endsWith(".mjs") || f.endsWith(".cjs") || f.endsWith(".js"),
  );
  if (bundles.length === 0) fail("no dist bundles found");
  for (const file of bundles) {
    try {
      execSync(`node --check "${join(distDir, file)}"`, { stdio: "pipe" });
      pass(file);
    } catch (e) {
      fail(`${file} — ${e.stderr?.toString().trim()}`);
    }
  }

  // 6. "use client" must survive minification, or React Server Components
  // consumers get a hard error on import.
  console.log('\nChecking "use client" directive...');
  for (const file of bundles) {
    const head = readFileSync(join(distDir, file), "utf-8").slice(0, 40);
    if (/^["']use client["']/.test(head)) {
      pass(file);
    } else {
      fail(`${file} — missing "use client" banner`);
    }
  }

  // 7. Expected exports in every .d.ts flavour
  console.log("\nChecking declarations for expected exports...");
  const declarations = readdirSync(distDir).filter((f) => /\.d\.[mc]?ts$/.test(f));
  if (declarations.length === 0) fail("no declaration files found");
  for (const file of declarations) {
    const dts = readFileSync(join(distDir, file), "utf-8");
    const missing = ["createProvider", "shallow"].filter(
      (name) => !dts.includes(name),
    );
    if (missing.length === 0) {
      pass(file);
    } else {
      fail(`${file} — missing ${missing.join(", ")}`);
    }
  }

  // 8. publint — exports-map ordering, format/extension mismatches
  console.log("\nRunning publint...");
  try {
    execSync(`npx --no-install publint --strict`, {
      cwd: packageDir,
      stdio: "pipe",
    });
    pass("publint clean");
  } catch (e) {
    fail(`publint:\n${e.stdout?.toString().trim()}`);
  }

  // 9. are-the-types-wrong — resolution under node10/node16/bundler
  console.log("\nRunning are-the-types-wrong...");
  try {
    execSync(`npx --no-install attw --pack . --format table-flipped`, {
      cwd: packageDir,
      stdio: "pipe",
    });
    pass("attw clean");
  } catch (e) {
    fail(`attw:\n${e.stdout?.toString().trim()}`);
  }
} catch (err) {
  console.error("\nFatal:", err.message);
  failures++;
}

console.log("");
if (failures > 0) {
  console.error(
    `Pack test FAILED (${failures} issue${failures > 1 ? "s" : ""})`,
  );
  process.exit(1);
} else {
  console.log(`Pack test PASSED  (output in pack-test/)`);
}
