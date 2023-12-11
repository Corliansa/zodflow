#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import fs from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [fileName] = process.argv.slice(2);

if (!fileName) {
  console.log("Please provide a file name. Usage: npx zodflow <filename>");
  process.exit(1);
}
const schemaPath = path.join(__dirname, ".next/tmp_schema.mjs");
await build({
  entryPoints: [fileName],
  outfile: schemaPath,
  bundle: true,
  format: "esm",
  external: ["zod"],
});
const schemas = await import(schemaPath);
const { getInitialData } = await import(
  path.join(__dirname, ".next/standalone/helpers.mjs")
);
const initialData = getInitialData(schemas);
const initialDataPath = path.join(__dirname, ".next/tmp_initialData.json");
await fs.writeFile(path.join(initialDataPath), JSON.stringify(initialData));
await fs.rm(schemaPath);

spawn("node", [".next/standalone/server.js"], {
  stdio: "inherit",
  cwd: __dirname,
  env: { ...process.env, SCHEMA_PATH: initialDataPath },
});
