/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const target = path.join(__dirname, "..", ".next");
try {
  fs.rmSync(target, { recursive: true, force: true });
  console.log("Removed .next");
} catch {
  // ignore
}
