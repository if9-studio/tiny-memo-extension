import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { LANG_LABELS, LANG_PREFIX, SUPPORTED_LANGS, canonicalUrl, localePath, normalizeLocale } from "../src/brand.mjs";
import { ALL_PAGE_SLUGS } from "../src/render.mjs";
import worker, { resolveCanonicalRedirect } from "../src/worker.mjs";
import { buildSite, outFilePath } from "./build.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");

const EXPECTED_PAGE_COUNT = 16; // 8 languages × 2 routes (/ and /vs-web-clippers)
const NON_HAN_LANGS = new Set(["en", "ko", "de", "fr", "es"]);
const CJK_HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const FLAG_EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]/u;
const PACKAGE_EXT_RE = /\.(zip|crx|xpi|dmg|exe|apk|ipa|pkg|deb)\b/i;

function distHtmlPath(lang, slug) {
  return outFilePath(lang, slug, DIST_DIR);
}

function resolveInternalDistHtml(pathname) {
  if (pathname === "/") return path.join(DIST_DIR, "index.html");
  for (const lang of SUPPORTED_LANGS) {
    const prefix = LANG_PREFIX[lang];
    if (prefix && (pathname === prefix || pathname === `${prefix}/`)) {
      return path.join(DIST_DIR, prefix.slice(1), "index.html");
    }
  }
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  return path.join(DIST_DIR, `${trimmed}.html`);
}

async function listFilesRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function stripWhitelistedMenuEndonyms(html) {
  return html.replace(/<details class="lang-menu"[\s\S]*?<\/details>/g, (menuBlock) => (
    menuBlock
      .replaceAll("简体中文", "ZH_CN_ENDONYM")
      .replaceAll("繁體中文", "ZH_TW_ENDONYM")
      .replaceAll("日本語", "JA_ENDONYM")
  ));
}

test("SUPPORTED_LANGS covers all 8 standard languages and 2 routes (16 pages)", () => {
  assert.deepEqual(SUPPORTED_LANGS, ["en", "ja", "zh-CN", "zh-TW", "ko", "de", "fr", "es"]);
  assert.deepEqual(ALL_PAGE_SLUGS, ["", "vs-web-clippers"]);
  assert.equal(SUPPORTED_LANGS.length * ALL_PAGE_SLUGS.length, EXPECTED_PAGE_COUNT);
});

test("pre-launch build produces 16 localized pages with zero leaks, valid SEO/JSON-LD, 0 CJK leaks, and zero dead links", async () => {
  process.env.TINY_MEMO_BUILD_OFFLINE = "1";
  process.env.TINY_MEMO_FORCE_RELEASE_LIVE = "0";
  const res = await buildSite();
  assert.equal(res.pageCount, EXPECTED_PAGE_COUNT);
  assert.equal(res.releaseLive, false);

  const allDistFiles = await listFilesRecursive(DIST_DIR);
  const inspectedFiles = allDistFiles.filter((f) => /\.(html|js|xml|txt|css)$/i.test(f));
  assert.ok(inspectedFiles.length >= EXPECTED_PAGE_COUNT + 5);

  for (const file of inspectedFiles) {
    const content = await readFile(file, "utf8");
    assert.ok(!PACKAGE_EXT_RE.test(content), `package ext (.zip/.crx/.xpi/.dmg/.exe/...) leaked in ${file}`);
    assert.ok(!content.includes("dl.if9.cool"), `dl.if9.cool leaked in ${file}`);
    assert.ok(!content.includes("ext.if9.cool"), `ext.if9.cool leaked in ${file}`);
    assert.ok(!FLAG_EMOJI_RE.test(content), `flag emoji found in ${file}`);
  }

  const css = await readFile(path.join(DIST_DIR, "assets/site.css"), "utf8");
  assert.ok(!/text-transform\s*:\s*uppercase/i.test(css), "site.css must not use text-transform: uppercase");
  for (const m of css.matchAll(/font-weight\s*:\s*(\d+)/g)) {
    assert.ok(Number(m[1]) <= 600, `font-weight ${m[1]} exceeds 600 in site.css`);
  }

  const htmlByPath = new Map();
  const titles = new Set();
  const descriptions = new Set();

  for (const lang of SUPPORTED_LANGS) {
    for (const slug of ALL_PAGE_SLUGS) {
      const file = distHtmlPath(lang, slug);
      await access(file);
      const html = await readFile(file, "utf8");
      htmlByPath.set(file, { html, lang, slug });

      assert.match(html, new RegExp(`<html lang="${lang}" data-release-state="waitlist">`));
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const descMatch = html.match(/<meta name="description" content="([^"]+)">/);
      assert.ok(titleMatch && descMatch, `missing title/description in ${file}`);
      assert.ok(!titles.has(titleMatch[1]), `duplicate title in ${file}`);
      assert.ok(!descriptions.has(descMatch[1]), `duplicate description in ${file}`);
      titles.add(titleMatch[1]);
      descriptions.add(descMatch[1]);

      const selfUrl = canonicalUrl(lang, slug);
      const enUrl = canonicalUrl("en", slug);
      assert.ok(html.includes(`<link rel="canonical" href="${selfUrl}">`), `bad canonical in ${file}`);
      for (const altLang of SUPPORTED_LANGS) {
        assert.ok(html.includes(`hreflang="${altLang}" href="${canonicalUrl(altLang, slug)}"`), `missing hreflang=${altLang} in ${file}`);
      }
      assert.ok(html.includes(`hreflang="x-default" href="${enUrl}"`), `bad x-default in ${file}`);

      assert.ok(html.includes('stroke-width="1.75"'), `missing Globe stroke-width in ${file}`);
      assert.ok(html.includes('<circle cx="12" cy="12" r="10"/>'), `missing Globe circle in ${file}`);
      for (const l of SUPPORTED_LANGS) {
        assert.ok(html.includes(`href="${localePath(l, slug)}" hreflang="${l}" lang="${l}"`), `missing menu item ${l} in ${file}`);
        assert.ok(html.includes(LANG_LABELS[l]), `missing Endonym ${LANG_LABELS[l]} in ${file}`);
      }

      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(ldMatch, `missing JSON-LD in ${file}`);
      const parsed = JSON.parse(ldMatch[1]);
      assert.ok(Array.isArray(parsed) && parsed.length >= 2, `invalid JSON-LD array in ${file}`);
      const appItem = parsed.find((item) => item["@type"] === "SoftwareApplication");
      const faqItem = parsed.find((item) => item["@type"] === "FAQPage");
      assert.ok(appItem, `missing SoftwareApplication JSON-LD in ${file}`);
      assert.equal(appItem.applicationCategory, "BrowserApplication", `bad applicationCategory in ${file}`);
      assert.equal(appItem.inLanguage, lang, `bad SoftwareApplication inLanguage in ${file}`);
      assert.equal(appItem.publisher?.["@id"], "https://if9.cool/#organization", `missing org @id in ${file}`);
      assert.equal(appItem.downloadUrl, undefined, `pre-launch must not expose downloadUrl in ${file}`);
      assert.ok(faqItem, `missing FAQPage JSON-LD in ${file}`);
      assert.equal(faqItem.inLanguage, lang, `bad FAQPage inLanguage in ${file}`);
      assert.ok(html.includes("IF9 Studio LLC"), `missing IF9 Studio LLC in ${file}`);
      assert.ok(html.includes("Tiny Memo"), `missing unified brand Tiny Memo in ${file}`);
      assert.ok(html.includes('class="seo-network"'), `missing seo-network footer in ${file}`);

      if (lang === "zh-TW") {
        assert.ok(!html.includes("繁体"), `simplified 繁体 leaked into zh-TW page ${file}`);
      }
      if (NON_HAN_LANGS.has(lang)) {
        const cleaned = stripWhitelistedMenuEndonyms(html);
        const badMatch = cleaned.match(CJK_HAN_RE);
        assert.equal(badMatch, null, `unexpected CJK Han "${badMatch?.[0] ?? ""}" in ${lang} page ${file}`);
      }
    }
  }

  for (const [file, { html }] of htmlByPath) {
    for (const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
      assert.ok(m[1].startsWith("/assets/"), `bad img src ${m[1]} in ${file}`);
      await access(path.join(DIST_DIR, m[1].slice(1)));
    }
    for (const m of html.matchAll(/\bhref="([^"]+)"/g)) {
      const href = m[1];
      if (/^(https?:|mailto:|tel:)/.test(href)) continue;
      if (href.startsWith("#")) {
        assert.ok(html.includes(`id="${decodeURIComponent(href.slice(1))}"`), `missing #${href.slice(1)} in ${file}`);
        continue;
      }
      if (href.startsWith("/assets/")) {
        await access(path.join(DIST_DIR, href.slice(1)));
        continue;
      }
      if (href.startsWith("/")) {
        const [pathname, hash] = href.split("#");
        const target = htmlByPath.get(resolveInternalDistHtml(pathname));
        assert.ok(target, `dead link ${href} in ${file}`);
        if (hash) assert.ok(target.html.includes(`id="${decodeURIComponent(hash)}"`), `missing hash ${href} in ${file}`);
      }
    }
  }

  for (const lang of SUPPORTED_LANGS) {
    const landing = await readFile(distHtmlPath(lang, ""), "utf8");
    assert.ok(landing.includes("data-waitlist-form"), `missing waitlist form in ${lang} landing`);
    assert.ok(landing.includes('data-app="tiny-memo"'), `missing data-app=tiny-memo in ${lang} landing`);
    assert.ok(landing.includes('data-platform="extension"'), `missing data-platform=extension in ${lang} landing`);
    const hubPrefix = LANG_PREFIX[lang];
    assert.ok(landing.includes(`https://if9.cool${hubPrefix}/legal/terms`), `missing terms link in ${lang}`);
    assert.ok(landing.includes(`https://if9.cool${hubPrefix}/legal/privacy`), `missing privacy link in ${lang}`);
    assert.ok(landing.includes(`https://if9.cool${hubPrefix}/legal/refund`), `missing refund link in ${lang}`);
    assert.ok(landing.includes(`https://if9.cool${hubPrefix}/products/tiny-memo`), `missing hub product link in ${lang}`);
  }
});

test("sitemap.xml, robots.txt, llms.txt, _redirects, and site.js syntax are valid", async () => {
  const sitemap = await readFile(path.join(DIST_DIR, "sitemap.xml"), "utf8");
  for (const lang of SUPPORTED_LANGS) {
    for (const slug of ALL_PAGE_SLUGS) {
      assert.ok(sitemap.includes(`<loc>${canonicalUrl(lang, slug)}</loc>`), `missing sitemap url ${lang}/${slug}`);
    }
  }
  const robots = await readFile(path.join(DIST_DIR, "robots.txt"), "utf8");
  assert.match(robots, /Sitemap: https:\/\/tiny-memo\.if9\.cool\/sitemap\.xml/);
  const llms = await readFile(path.join(DIST_DIR, "llms.txt"), "utf8");
  assert.ok(llms.includes("IF9 Studio LLC") && llms.includes("https://tiny-memo.if9.cool/vs-web-clippers"));
  const js = await readFile(path.join(DIST_DIR, "assets/site.js"), "utf8");
  new vm.Script(js, { filename: "site.js" });
  assert.ok(js.includes("app=tiny-memo&platform=extension"), "site.js must query tiny-memo extension release-status");
  assert.ok(js.includes("orderLocales"), "site.js must implement orderLocales");
});

test("Worker performs single-hop 301 canonical redirects with zero Set-Cookie and zero Vary", async () => {
  const cases = [
    ["https://tiny-memo.if9.cool/en", "https://tiny-memo.if9.cool/"],
    ["https://tiny-memo.if9.cool/en/", "https://tiny-memo.if9.cool/"],
    ["https://tiny-memo.if9.cool/en/vs-web-clippers", "https://tiny-memo.if9.cool/vs-web-clippers"],
    ["https://tiny-memo.if9.cool/zh", "https://tiny-memo.if9.cool/zh-cn/"],
    ["https://tiny-memo.if9.cool/zh-CN/vs-web-clippers", "https://tiny-memo.if9.cool/zh-cn/vs-web-clippers"],
    ["https://tiny-memo.if9.cool/zh-TW", "https://tiny-memo.if9.cool/zh-tw/"],
    ["https://tiny-memo.if9.cool/?lang=ja", "https://tiny-memo.if9.cool/ja/"],
    ["https://tiny-memo.if9.cool/vs-web-clippers?lang=de", "https://tiny-memo.if9.cool/de/vs-web-clippers"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(resolveCanonicalRedirect(input), expected);
    const res = await worker.fetch(new Request(input), { ASSETS: { fetch: async () => new Response("ok") } });
    assert.equal(res.status, 301);
    assert.equal(res.headers.get("Location"), expected);
    assert.equal(res.headers.get("Set-Cookie"), null);
    assert.equal(res.headers.get("Vary"), null);
  }
  assert.equal(resolveCanonicalRedirect("https://tiny-memo.if9.cool/"), null);
  assert.equal(resolveCanonicalRedirect("https://tiny-memo.if9.cool/ja/"), null);
  assert.equal(resolveCanonicalRedirect("https://tiny-memo.if9.cool/vs-web-clippers"), null);
  assert.equal(normalizeLocale("zh-Hant-TW"), "zh-TW");
  assert.equal(normalizeLocale("ko-KR"), "ko");
});
