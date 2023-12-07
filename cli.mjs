#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [fileName] = process.argv.slice(2);

if (!fileName) {
  console.log("Please provide a file name. Usage: npx zodflow <filename>");
  process.exit(1);
} else {
  execSync("npm install", {
    stdio: "inherit",
    cwd: __dirname,
  });
  spawn("node", [".next/standalone/server.js"], {
    stdio: "inherit",
    cwd: __dirname,
    env: { ...process.env, SCHEMA_PATH: fileName },
  });
}
