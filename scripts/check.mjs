#!/usr/bin/env node
// Unified verification gate for Tiny Memo extension i18n + site build + SEO/static checks.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

run("node", ["site/tools/build.mjs"], {
  TINY_MEMO_BUILD_OFFLINE: process.env.TINY_MEMO_BUILD_OFFLINE ?? "1",
});
run("node", ["--test", "tests/i18n-seo.test.mjs", "site/tools/site.test.mjs"], {
  TINY_MEMO_BUILD_OFFLINE: process.env.TINY_MEMO_BUILD_OFFLINE ?? "1",
});
