#!/usr/bin/env node
import { spawn } from "node:child_process";

const [fileName] = process.argv.slice(2);

if (!fileName) {
  console.log("Please provide a file name. Usage: npx zodflow <filename>");
  process.exit(1);
} else {
  spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_SCHEMA_PATH: fileName },
  });
}
