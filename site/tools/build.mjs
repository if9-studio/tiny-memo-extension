#!/usr/bin/env node
// Zero-dependency static site builder for tiny-memo-web (16 localized pages + sitemap.xml + robots.txt + llms.txt + _redirects + assets/).
import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANG_PREFIX, SUPPORTED_LANGS } from "../src/brand.mjs";
import {
  ALL_PAGE_SLUGS,
  renderComparePage,
  renderLandingPage,
  renderLlmsTxt,
  renderRedirects,
  renderRobotsTxt,
  renderSitemapXml,
} from "../src/render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_ROOT = path.resolve(__dirname, "..");
const ASSETS_SRC = path.join(WEBSITE_ROOT, "assets");
const PUBLIC_SRC = path.join(WEBSITE_ROOT, "public");
const DIST_DIR = path.join(WEBSITE_ROOT, "dist");

function peerOriginHref(origin, lang) {
  const prefix = LANG_PREFIX[lang] ?? "";
  return prefix ? `${origin}${prefix}` : `${origin}/`;
}

export function buildStaticPeerFallback(lang) {
  return [
    { title: "AI Omni-Archive (AOA)", href: peerOriginHref("https://aoa.if9.cool", lang) },
    { title: "Memo Omni-Archive (MOA)", href: peerOriginHref("https://moa.if9.cool", lang) },
    { title: "MasCopy", href: peerOriginHref("https://mascopy.if9.cool", lang) },
    { title: "Mioo", href: peerOriginHref("https://mioo.if9.cool", lang) },
  ];
}

async function fetchJsonWithTimeout(url, timeoutMs = 3000) {
  if (process.env.TINY_MEMO_BUILD_OFFLINE === "1") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadReleaseStatus() {
  if (process.env.TINY_MEMO_FORCE_RELEASE_LIVE === "1") {
    return {
      releaseLive: true,
      downloadUrl: process.env.TINY_MEMO_FORCE_DOWNLOAD_URL || "",
    };
  }
  if (process.env.TINY_MEMO_FORCE_RELEASE_LIVE === "0") {
    return { releaseLive: false, downloadUrl: "" };
  }
  const data = await fetchJsonWithTimeout(
    "https://if9.cool/api/public/release-status?app=tiny-memo&platform=extension"
  );
  return {
    releaseLive: data?.live === true,
    downloadUrl: typeof data?.downloadUrl === "string" && data.downloadUrl.startsWith("https://") ? data.downloadUrl : "",
  };
}

async function loadSeoNetworkByLang() {
  const entries = await Promise.all(
    SUPPORTED_LANGS.map(async (lang) => {
      const data = await fetchJsonWithTimeout(
        `https://if9.cool/api/seo-network?lang=${encodeURIComponent(lang)}&exclude=tiny-memo`
      );
      const items = Array.isArray(data?.products)
        ? data.products
        : Array.isArray(data?.items)
          ? data.items
          : [];
      return [lang, items.length > 0 ? items : buildStaticPeerFallback(lang)];
    })
  );
  return Object.fromEntries(entries);
}

export function outFilePath(lang, slug = "", distDir = DIST_DIR) {
  const dirPrefix = (LANG_PREFIX[lang] ?? "").replace(/^\/+/, "");
  if (!slug) {
    return dirPrefix ? path.join(distDir, dirPrefix, "index.html") : path.join(distDir, "index.html");
  }
  return dirPrefix ? path.join(distDir, dirPrefix, `${slug}.html`) : path.join(distDir, `${slug}.html`);
}

async function writeDistFile(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

export async function buildSite() {
  const [{ releaseLive, downloadUrl }, networkByLang] = await Promise.all([
    loadReleaseStatus(),
    loadSeoNetworkByLang(),
  ]);

  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });
  await cp(ASSETS_SRC, path.join(DIST_DIR, "assets"), { recursive: true });
  if (existsSync(PUBLIC_SRC)) {
    await cp(PUBLIC_SRC, DIST_DIR, { recursive: true });
  }

  const writes = [];
  for (const lang of SUPPORTED_LANGS) {
    const networkItems = networkByLang[lang] ?? buildStaticPeerFallback(lang);
    writes.push(
      writeDistFile(
        outFilePath(lang, ""),
        renderLandingPage({ lang, releaseLive, releaseDownloadUrl: downloadUrl, networkItems })
      )
    );
    writes.push(
      writeDistFile(
        outFilePath(lang, "vs-web-clippers"),
        renderComparePage({ lang, releaseLive, releaseDownloadUrl: downloadUrl, networkItems })
      )
    );
  }

  writes.push(writeDistFile(path.join(DIST_DIR, "sitemap.xml"), renderSitemapXml()));
  writes.push(writeDistFile(path.join(DIST_DIR, "robots.txt"), renderRobotsTxt()));
  writes.push(writeDistFile(path.join(DIST_DIR, "llms.txt"), renderLlmsTxt({ releaseLive })));
  writes.push(writeDistFile(path.join(DIST_DIR, "_redirects"), renderRedirects()));

  await Promise.all(writes);
  return {
    distDir: DIST_DIR,
    releaseLive,
    pageCount: SUPPORTED_LANGS.length * ALL_PAGE_SLUGS.length,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const res = await buildSite();
  console.log(`Built tiny-memo-web: ${res.pageCount} pages into ${res.distDir} (releaseLive=${res.releaseLive})`);
}
