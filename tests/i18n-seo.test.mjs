import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  LOCALE_TO_CHROME_DIR,
  SUPPORTED_LOCALES,
  buildChromeMessagesJson,
  loadLocalesCatalog,
  renderCatalogScript,
} from "../scripts/sync-locales.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PLURAL_ONE_LOCALES = new Set(["en", "de", "fr", "es"]);
const NON_HAN_LOCALES = ["en", "ko", "de", "fr", "es"];
const CJK_HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const FLAG_EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]/u;

function flattenStrings(obj, prefix = "") {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") {
      out[full] = val;
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(out, flattenStrings(val, full));
    }
  }
  return out;
}

function extractPlaceholders(str) {
  return [...String(str).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort();
}

function stripAllowedEndonyms(text) {
  return String(text)
    .replaceAll("简体中文", "")
    .replaceAll("繁體中文", "")
    .replaceAll("日本語", "");
}

function loadI18nRuntime(overrides = {}) {
  const context = {
    URLSearchParams,
    console,
    ...overrides,
  };
  context.globalThis = context;
  context.self = context;
  return context;
}

test("1. Locales/*.json 8-language keys, *One plural siblings, placeholders, and zero Han leaks", async () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["en", "ja", "zh-CN", "zh-TW", "ko", "de", "fr", "es"]);
  const catalog = await loadLocalesCatalog(ROOT);

  const enFlat = flattenStrings(catalog.en);
  const enBaseKeys = Object.keys(enFlat).filter((k) => !k.endsWith("One")).sort();
  const enOneKeys = Object.keys(enFlat).filter((k) => k.endsWith("One")).sort();

  assert.ok(enBaseKeys.length >= 50, `Expected >= 50 base keys, got ${enBaseKeys.length}`);
  assert.ok(enOneKeys.length >= 2, `Expected >= 2 *One keys, got ${enOneKeys.length}`);

  for (const locale of SUPPORTED_LOCALES) {
    const flat = flattenStrings(catalog[locale]);
    const baseKeys = Object.keys(flat).filter((k) => !k.endsWith("One")).sort();
    const oneKeys = Object.keys(flat).filter((k) => k.endsWith("One")).sort();

    assert.deepEqual(baseKeys, enBaseKeys, `Locales/${locale}.json base keys mismatch`);
    if (PLURAL_ONE_LOCALES.has(locale)) {
      assert.deepEqual(oneKeys, enOneKeys, `Locales/${locale}.json *One keys mismatch`);
    } else {
      assert.deepEqual(oneKeys, [], `Locales/${locale}.json must not define *One keys`);
    }

    assert.equal(catalog[locale].manifest?.extName, "Tiny Memo", `${locale} manifest.extName must be Tiny Memo`);
    assert.equal(catalog[locale].common?.appName, "Tiny Memo", `${locale} common.appName must be Tiny Memo`);

    for (const [k, v] of Object.entries(flat)) {
      assert.ok(v.trim().length > 0, `Empty translation in Locales/${locale}.json: ${k}`);
      assert.equal(v, v.trim(), `Leading/trailing whitespace in Locales/${locale}.json: ${k}`);
      assert.deepEqual(
        extractPlaceholders(v),
        extractPlaceholders(enFlat[k]),
        `Placeholder mismatch in Locales/${locale}.json at ${k}`
      );
      assert.ok(!FLAG_EMOJI_RE.test(v), `Flag emoji found in Locales/${locale}.json at ${k}`);
    }
  }

  for (const locale of NON_HAN_LOCALES) {
    const raw = await readFile(path.join(ROOT, "Locales", `${locale}.json`), "utf8");
    assert.equal(raw.match(CJK_HAN_RE), null, `Unexpected Han character in Locales/${locale}.json`);
  }

  const zhTwRaw = await readFile(path.join(ROOT, "Locales", "zh-TW.json"), "utf8");
  assert.ok(!zhTwRaw.includes("繁体"), "Simplified 繁体 leaked into Locales/zh-TW.json");
});

test("2. _locales/*/messages.json and i18n-catalog.js are 100% synced with Locales/*.json, and manifest.json is valid MV3", async () => {
  const catalog = await loadLocalesCatalog(ROOT);

  for (const [locale, chromeDir] of Object.entries(LOCALE_TO_CHROME_DIR)) {
    const msgPath = path.join(ROOT, "_locales", chromeDir, "messages.json");
    const actual = JSON.parse(await readFile(msgPath, "utf8"));
    const expected = buildChromeMessagesJson(catalog[locale]);
    assert.deepEqual(actual, expected, `_locales/${chromeDir}/messages.json out of sync with Locales/${locale}.json`);
  }

  const actualCatalogScript = await readFile(path.join(ROOT, "i18n-catalog.js"), "utf8");
  const expectedCatalogScript = renderCatalogScript(catalog);
  assert.equal(actualCatalogScript, expectedCatalogScript, "i18n-catalog.js out of sync with Locales/*.json");

  const manifest = JSON.parse(await readFile(path.join(ROOT, "manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.default_locale, "en");
  assert.equal(manifest.name, "__MSG_extName__");
  assert.equal(manifest.description, "__MSG_extDescription__");
  assert.equal(manifest.action?.default_title, "__MSG_actionDefaultTitle__");
  assert.equal(manifest.commands?.["add-selection-shortcut"]?.description, "__MSG_commandAddSelection__");

  await access(path.join(ROOT, manifest.background.service_worker));
  await access(path.join(ROOT, manifest.action.default_popup));
  for (const cs of manifest.content_scripts) {
    for (const file of cs.js) {
      await access(path.join(ROOT, file));
    }
  }
});

test("3. Extension source files have zero hardcoded Han characters, zero forbidden icons, canonical v2 icons, and valid CSS/JS", async () => {
  const extSourceFiles = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "content_script.js",
    "inline_button_handler.js",
    "background.js",
    "i18n.js",
  ];

  const forbiddenIconRe = /\b(Languages|Sparkles|Bot|Brain|Edit2|Edit3|SquarePen|PenLine|Settings2|AlertTriangle|AlertCircle|CheckCircle|Grid2X2|Grid3x3)\b/;

  for (const rel of extSourceFiles) {
    const content = await readFile(path.join(ROOT, rel), "utf8");
    assert.ok(!FLAG_EMOJI_RE.test(content), `Flag emoji found in ${rel}`);
    const cleaned = stripAllowedEndonyms(content);
    const badHan = cleaned.match(CJK_HAN_RE);
    assert.equal(badHan, null, `Unexpected Han character "${badHan?.[0] ?? ""}" in ${rel}`);
    if (!rel.endsWith(".css") && !rel.endsWith(".json")) {
      assert.equal(content.match(forbiddenIconRe), null, `Forbidden non-canonical icon in ${rel}`);
    }
    if (rel.endsWith(".js")) {
      new vm.Script(content, { filename: rel });
    }
  }

  const popupHtml = await readFile(path.join(ROOT, "popup.html"), "utf8");
  assert.ok(popupHtml.includes('data-lang-value="system" id="optLangSystem"'), "popup.html must put System first in languageMenu");
  for (const [locale, label] of [
    ["en", "English"],
    ["ja", "日本語"],
    ["zh-CN", "简体中文"],
    ["zh-TW", "繁體中文"],
    ["ko", "한국어"],
    ["de", "Deutsch"],
    ["fr", "Français"],
    ["es", "Español"],
  ]) {
    assert.ok(popupHtml.includes(`data-lang-value="${locale}" lang="${locale}"`), `Missing lang attr ${locale} in popup.html`);
    assert.ok(popupHtml.includes(`<span class="lang-option-label">${label}</span>`), `Missing endonym option ${locale} in popup.html`);
  }
  assert.ok(popupHtml.includes('<circle cx="12" cy="12" r="10" />'), "Missing Globe icon in popup.html");
  assert.ok(popupHtml.includes('stroke-width="1.75"'), "Missing v2 stroke-width=1.75 in popup.html");
  assert.ok(popupHtml.includes('stroke-width="2"'), "Missing Plan C Check stroke-width=2 in popup.html");

  const i18nJs = await readFile(path.join(ROOT, "i18n.js"), "utf8");
  for (const fn of ["globeSvg", "settingsSvg", "hashSvg", "pencilSvg", "trash2Svg", "arrowUpRightSvg", "if9WordSvg"]) {
    assert.ok(i18nJs.includes(`function ${fn}`), `Missing ${fn} in i18n.js`);
  }

  const popupCss = await readFile(path.join(ROOT, "popup.css"), "utf8");
  assert.ok(!/text-transform\s*:\s*uppercase/i.test(popupCss), "popup.css must not use text-transform: uppercase");
  assert.ok(popupCss.includes("tabular-nums"), "popup.css must use tabular-nums for note counts");
  for (const m of popupCss.matchAll(/font-weight\s*:\s*(\d+)/g)) {
    assert.ok(Number(m[1]) <= 600, `font-weight ${m[1]} exceeds 600 in popup.css`);
  }
});

test("4. Runtime i18n engine handles locale normalization, System->en fallback, single-pass placeholders, *One plurals, and overrides", async () => {
  const catalogSrc = await readFile(path.join(ROOT, "i18n-catalog.js"), "utf8");
  const i18nSrc = await readFile(path.join(ROOT, "i18n.js"), "utf8");

  const ctx = loadI18nRuntime({
    navigator: { languages: ["ar-SA", "th-TH"], language: "ar-SA" },
  });
  vm.runInNewContext(catalogSrc, ctx);
  vm.runInNewContext(i18nSrc, ctx);

  const api = ctx.TinyMemoI18n;
  assert.equal(api.EXT_LANGUAGE_LABELS["zh-TW"], "繁體中文");
  assert.equal(api.normalizeLocale("zh-HK"), "zh-TW");
  assert.equal(api.normalizeLocale("zh-MO"), "zh-TW");
  assert.equal(api.normalizeLocale("zh-Hant-TW"), "zh-TW");
  assert.equal(api.normalizeLocale("zh"), "zh-CN");
  assert.equal(api.normalizeLocale("zh-SG"), "zh-CN");
  assert.equal(api.normalizeLocale("de-AT"), "de");
  assert.equal(api.normalizeLocale("fr-CA"), "fr");
  assert.equal(api.normalizeLocale("es-MX"), "es");

  // Unknown system languages fall back to en, never Chinese
  assert.equal(api.resolveBrowserLanguage(["ar-SA", "th-TH", "ru-RU"]), "en");
  assert.equal(await api.getActiveLanguage(), "en");

  // Explicit override takes priority
  assert.equal(await api.getActiveLanguage({ override: "ja" }), "ja");

  // Single-pass replacement prevents secondary interpolation
  assert.equal(
    api.formatMessage("A={a}, B={b}", { a: "{b}", b: "BAD" }),
    "A={b}, B=BAD"
  );

  // *One singular vs plural resolution
  const tEn = api.createTranslator("en", ctx.__TINY_MEMO_CATALOG__);
  const tDe = api.createTranslator("de", ctx.__TINY_MEMO_CATALOG__);
  const tJa = api.createTranslator("ja", ctx.__TINY_MEMO_CATALOG__);
  assert.equal(tEn("popup.notesCount", { count: 1 }), "1 note");
  assert.equal(tEn("popup.notesCount", { count: 2 }), "2 notes");
  assert.equal(tDe("popup.notesCount", { count: 1 }), "1 Notiz");
  assert.equal(tDe("popup.notesCount", { count: 3 }), "3 Notizen");
  assert.equal(tJa("popup.notesCount", { count: 1 }), "1 件");
});
