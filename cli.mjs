#!/usr/bin/env node
import { spawn } from "node:child_process/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [fileName] = process.argv.slice(2);

if (!fileName) {
  console.log("Please provide a file name. Usage: npx zodflow <filename>");
  process.exit(1);
} else {
  spawn("npm", ["install"], {
    stdio: "inherit",
    cwd: __dirname,
  }).then(() =>
    spawn("npm", ["run", "dev"], {
      stdio: "inherit",
      cwd: __dirname,
      env: { ...process.env, NEXT_PUBLIC_SCHEMA_PATH: fileName },
    })
  );
}
