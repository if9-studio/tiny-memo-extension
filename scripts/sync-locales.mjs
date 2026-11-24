#!/usr/bin/env node
// Syncs single-source Locales/*.json to Chrome MV3 _locales/*/messages.json and i18n-catalog.js.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export const LOCALE_TO_CHROME_DIR = {
  en: "en",
  ja: "ja",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
  ko: "ko",
  de: "de",
  fr: "fr",
  es: "es",
};

export const SUPPORTED_LOCALES = Object.keys(LOCALE_TO_CHROME_DIR);

export async function loadLocalesCatalog(rootDir = ROOT) {
  const catalog = {};
  for (const locale of SUPPORTED_LOCALES) {
    const raw = await readFile(path.join(rootDir, "Locales", `${locale}.json`), "utf8");
    catalog[locale] = JSON.parse(raw);
  }
  return catalog;
}

export function buildChromeMessagesJson(dict) {
  const manifest = dict.manifest || {};
  return {
    extName: {
      message: manifest.extName || "Tiny Memo",
      description: "Extension name shown in Chrome Web Store and extensions page.",
    },
    extDescription: {
      message: manifest.extDescription || "",
      description: "Extension description shown in Chrome Web Store and extensions page.",
    },
    actionDefaultTitle: {
      message: manifest.actionDefaultTitle || "Tiny Memo",
      description: "Tooltip title for the browser action button.",
    },
    commandAddSelection: {
      message: manifest.commandAddSelection || "",
      description: "Keyboard shortcut command description for adding selected text.",
    },
  };
}

export function renderCatalogScript(catalog) {
  const serialized = JSON.stringify(catalog, null, 2);
  return `// Auto-generated from Locales/*.json by scripts/sync-locales.mjs. Do not edit manually.\n(function (globalScope) {\n  globalScope.__TINY_MEMO_CATALOG__ = ${serialized};\n})(typeof globalThis !== "undefined" ? globalThis : self);\n`;
}

export async function syncLocales(rootDir = ROOT) {
  const catalog = await loadLocalesCatalog(rootDir);

  for (const locale of SUPPORTED_LOCALES) {
    const chromeDir = LOCALE_TO_CHROME_DIR[locale];
    const outDir = path.join(rootDir, "_locales", chromeDir);
    await mkdir(outDir, { recursive: true });
    const messages = buildChromeMessagesJson(catalog[locale]);
    await writeFile(path.join(outDir, "messages.json"), JSON.stringify(messages, null, 2) + "\n", "utf8");
  }

  await writeFile(path.join(rootDir, "i18n-catalog.js"), renderCatalogScript(catalog), "utf8");
  return { locales: SUPPORTED_LOCALES.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const res = await syncLocales();
  console.log(`Synced ${res.locales} locales to _locales/ and i18n-catalog.js.`);
}
