#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [fileName] = process.argv.slice(2);

if (!fileName) {
  console.log("Please provide a file name. Usage: npx zodflow <filename>");
  process.exit(1);
} else {
  const schemaPath = path.join(__dirname, ".next/standalone/schema.mjs");
  build({
    entryPoints: [fileName],
    outfile: schemaPath,
    bundle: true,
    format: "esm",
    external: ["zod"],
  }).then(() => {
    spawn("node", [".next/standalone/server.js"], {
      stdio: "inherit",
      cwd: __dirname,
      env: { ...process.env, SCHEMA_PATH: schemaPath },
    });
  });
}
