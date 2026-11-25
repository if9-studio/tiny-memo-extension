#!/usr/bin/env node
/**
 * Generates 20 sanitized 2880x1800 (@2x Retina) WebP screenshots for Tiny Memo
 * across {en, zh-CN} x {light, dark} by loading the real MV3 extension in Playwright
 * Chromium and pairing localized fictional reading workspaces with real inline
 * selection/hover controls (inline_button_handler.js) and real popup.html UI.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURES_PATH = path.join(ROOT, "demo", "fixtures.json");
const OUT_ROOT = path.join(ROOT, "site", "public", "screenshots");
const ICON_PATH = path.join(ROOT, "icons", "icon48.png");

const HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const FORBIDDEN_RE = /lorem ipsum|@gmail\.com|@qq\.com/i;
const LANGS = ["en", "zh-CN"];
const THEMES = ["light", "dark"];
const SCENE_KEYS = [
  "01-inline-selection-capture",
  "02-popup-memo-stream",
  "03-instant-search-tag-filter",
  "04-quick-note-composer",
  "05-markdown-export-locale",
];

async function loadPlaywright() {
  const candidates = [
    "playwright",
    process.env.PLAYWRIGHT_PATH,
    "/Users/redwinam/Developer/bin/开发启动器/node_modules/playwright/index.mjs",
  ].filter(Boolean);
  for (const mod of candidates) {
    try {
      return await import(mod);
    } catch {
      // Try next candidate
    }
  }
  throw new Error("Playwright not found. Set PLAYWRIGHT_PATH or install playwright.");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

function parseWebpDimensions(buffer) {
  if (buffer.length < 30) throw new Error("File too small to be WebP");
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("Invalid RIFF/WEBP signature");
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
      height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
    };
  }
  if (chunk === "VP8 " && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  throw new Error(`Unsupported WebP chunk: ${chunk}`);
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function buildPopupThemeCss(theme) {
  if (theme === "light") {
    return `
      :root {
        --bg: #fcfcfa;
        --surface: #f2f2ec;
        --input-bg: #ffffff;
        --line: rgba(23, 25, 29, 0.14);
        --ink: #17191d;
        --ink-2: #4b5059;
        --ink-3: #6e7580;
        --accent: #2c8a43;
        --accent-hover: #237237;
        --danger: #b83c36;
      }
      body {
        background-color: var(--bg);
        color: var(--ink-2);
      }
      textarea#notesDisplay,
      select#ttsVoiceSelect {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "PingFang SC", sans-serif;
      }
      textarea#notesDisplay {
        min-height: 146px;
        font-size: 12.5px;
        line-height: 1.48;
      }
      .lang-menu ul {
        box-shadow: 0 12px 28px rgba(23, 25, 29, 0.14);
      }
      .lang-option:hover,
      .lang-option[aria-checked="true"] {
        background-color: rgba(23, 25, 29, 0.06);
      }
      .delete-rule-btn:hover {
        background-color: rgba(23, 25, 29, 0.06);
      }
      .btn-secondary,
      #copyMarkdownBtn {
        background-color: #e7e7df;
        color: #17191d;
        border: 1px solid rgba(23, 25, 29, 0.14);
      }
      .btn-secondary:hover,
      #copyMarkdownBtn:hover {
        background-color: #dcdcd2;
      }
      .status-banner[data-kind="error"] {
        color: #9f292e;
        background-color: #fdf1f1;
      }
      .status-banner[data-kind="success"] {
        color: #1f6c33;
        background-color: #eef8f0;
      }
    `;
  }
  return `
    :root {
      --bg: #171b22;
      --surface: #1f242e;
      --input-bg: #11141a;
      --line: rgba(255, 255, 255, 0.12);
      --ink: #f2f4f7;
      --ink-2: #c2c8d2;
      --ink-3: #868e9c;
      --accent: #52c46a;
      --accent-hover: #44b15b;
      --danger: #e06c75;
    }
    textarea#notesDisplay,
    select#ttsVoiceSelect {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "PingFang SC", sans-serif;
    }
    textarea#notesDisplay {
      min-height: 146px;
      font-size: 12.5px;
      line-height: 1.48;
    }
    .btn-primary,
    #clearNotesBtn {
      background-color: #3da354;
      color: #ffffff;
    }
  `;
}

function renderWorkspaceHtml({ locale, theme, sceneKey, fixtures, iconDataUri }) {
  const loc = fixtures.locales[locale];
  const scene = loc.scenes[sceneKey];
  const ws = loc.workspace;
  const noteCount = scene.notes.length;

  let bodyHtml = "";

  if (sceneKey === "01-inline-selection-capture") {
    bodyHtml = `
      <article class="reading-card">
        <div class="eyebrow">${escapeHtml(scene.eyebrow)}</div>
        <h1>${escapeHtml(scene.headline)}</h1>
        <p class="byline">${escapeHtml(scene.byline)}</p>
        <div class="essay-body">
          ${scene.paragraphs
            .map((p, idx) => `<p data-para="${idx}">${escapeHtml(p)}</p>`)
            .join("\n")}
        </div>
      </article>
    `;
  } else if (sceneKey === "02-popup-memo-stream") {
    bodyHtml = `
      <section class="reading-card">
        <div class="eyebrow">${escapeHtml(scene.eyebrow)}</div>
        <h1>${escapeHtml(scene.headline)}</h1>
        <p class="byline">${escapeHtml(scene.byline)}</p>
        <div class="ledger-list">
          ${scene.entries
            .map(
              (item) => `
            <div class="ledger-row">
              <div class="ledger-meta">
                <span class="time-pill">${escapeHtml(item.time)}</span>
                <span class="domain-pill">${escapeHtml(item.domain)}</span>
                <strong>${escapeHtml(item.title)}</strong>
              </div>
              <p>${escapeHtml(item.excerpt)}</p>
            </div>`
            )
            .join("\n")}
        </div>
      </section>
    `;
  } else if (sceneKey === "03-instant-search-tag-filter") {
    bodyHtml = `
      <section class="reading-card">
        <div class="eyebrow">${escapeHtml(scene.eyebrow)}</div>
        <h1>${escapeHtml(scene.headline)}</h1>
        <div class="search-toolbar">
          <div class="search-box">
            <span class="search-label">${escapeHtml(scene.searchLabel)}</span>
            <span class="search-query">${escapeHtml(scene.searchQuery)}</span>
          </div>
          <div class="tag-row">
            ${scene.tags
              .map(
                (tag) =>
                  `<span class="tag-chip ${tag === scene.activeTag ? "is-active" : ""}">${escapeHtml(tag)}</span>`
              )
              .join("")}
          </div>
        </div>
        <div class="result-list">
          ${scene.cards
            .map(
              (card, idx) => `
            <div class="result-card ${idx === scene.hoverTargetIndex ? "is-hovered" : ""}" data-card="${idx}">
              <div class="result-head">
                <span class="tag-pill">${escapeHtml(card.tag)}</span>
                <span class="domain-pill">${escapeHtml(card.domain)}</span>
              </div>
              <h3>${escapeHtml(card.title)}</h3>
              <p class="hover-target-p">${escapeHtml(card.snippet)}</p>
            </div>`
            )
            .join("\n")}
        </div>
      </section>
    `;
  } else if (sceneKey === "04-quick-note-composer") {
    bodyHtml = `
      <div class="split-reading">
        <article class="reading-card compact">
          <div class="eyebrow">${escapeHtml(scene.eyebrow)}</div>
          <h1>${escapeHtml(scene.headline)}</h1>
          <p class="byline">${escapeHtml(scene.byline)}</p>
          <div class="essay-body">
            ${scene.articleParagraphs
              .map((p, idx) => `<p data-para="${idx}">${escapeHtml(p)}</p>`)
              .join("\n")}
          </div>
        </article>
        <section class="composer-card">
          <div class="composer-head">
            <span class="eyebrow">${escapeHtml(scene.composer.title)}</span>
            <span class="saved-pill">${escapeHtml(scene.composer.savedNotice)}</span>
          </div>
          <div class="source-line">${escapeHtml(scene.composer.sourceLabel)}</div>
          <div class="tag-row">
            ${scene.composer.tagChips
              .map((tag, i) => `<span class="tag-chip ${i === 0 ? "is-active" : ""}">${escapeHtml(tag)}</span>`)
              .join("")}
          </div>
          <div class="composer-editor">
            <div class="composer-title">${escapeHtml(scene.composer.draftTitle)}</div>
            <p class="composer-body">${escapeHtml(scene.composer.draftBody)}</p>
          </div>
        </section>
      </div>
    `;
  } else if (sceneKey === "05-markdown-export-locale") {
    bodyHtml = `
      <section class="reading-card">
        <div class="eyebrow">${escapeHtml(scene.eyebrow)}</div>
        <h1>${escapeHtml(scene.headline)}</h1>
        <p class="byline">${escapeHtml(scene.byline)}</p>
        <div class="export-grid">
          <div class="export-panel">
            <div class="export-panel-head">
              <strong>${escapeHtml(scene.markdownTitle)}</strong>
              <span class="format-badge">Markdown</span>
            </div>
            <pre class="code-block">${escapeHtml(scene.markdownLines.join("\n"))}</pre>
          </div>
          <div class="export-panel">
            <div class="export-panel-head">
              <strong>${escapeHtml(scene.jsonTitle)}</strong>
              <span class="format-badge">JSON</span>
            </div>
            <pre class="code-block">${escapeHtml(scene.jsonPreview)}</pre>
            <div class="appearance-strip">${escapeHtml(scene.appearanceNote)}</div>
          </div>
        </div>
      </section>
    `;
  }

  return `<!doctype html>
<html lang="${escapeHtml(locale)}" data-theme="${escapeHtml(theme)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(scene.tabTitle)}</title>
  <style>
    :root {
      --bg: #0c0e12;
      --bg-chrome: #11141a;
      --surface: #171b22;
      --raised: #1f242e;
      --code-bg: #101319;
      --ink: #f2f4f7;
      --ink-2: #b9c0cc;
      --ink-3: #868e9c;
      --line: rgba(255, 255, 255, 0.1);
      --line-2: rgba(255, 255, 255, 0.18);
      --accent: #52c46a;
      --accent-soft: rgba(82, 196, 106, 0.15);
      --select-bg: rgba(82, 196, 106, 0.28);
      --shadow: 0 22px 54px rgba(0, 0, 0, 0.45);
    }
    html[data-theme="light"] {
      --bg: #f6f6f3;
      --bg-chrome: #ecece6;
      --surface: #fcfcfa;
      --raised: #f0f0ea;
      --code-bg: #f1f1eb;
      --ink: #17191d;
      --ink-2: #4b5059;
      --ink-3: #6e7580;
      --line: rgba(23, 25, 29, 0.1);
      --line-2: rgba(23, 25, 29, 0.18);
      --accent: #2c8a43;
      --accent-soft: rgba(44, 138, 67, 0.12);
      --select-bg: rgba(44, 138, 67, 0.22);
      --shadow: 0 18px 42px rgba(28, 24, 18, 0.12);
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 1440px;
      height: 900px;
      overflow: hidden;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "PingFang SC", "Hiragino Sans", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    ::selection {
      background: var(--select-bg);
      color: var(--ink);
    }
    .browser-bar {
      height: 48px;
      background: var(--bg-chrome);
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 14px;
    }
    .traffic {
      display: flex;
      gap: 7px;
      flex: none;
    }
    .traffic span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--line-2);
    }
    .url-bar {
      flex: 1;
      max-width: 680px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: var(--surface);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 12px;
      color: var(--ink-2);
    }
    .bar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink-2);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }
    .ext-toolbar-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid var(--accent);
      background: var(--accent-soft);
      color: var(--ink);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .ext-toolbar-btn img {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }
    .count-badge {
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--accent);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .workspace {
      padding: 34px 42px;
      width: 966px;
      height: calc(900px - 48px);
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    .reading-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 34px 38px;
      box-shadow: var(--shadow);
    }
    .reading-card.compact {
      padding: 24px 28px;
    }
    .eyebrow {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 12px;
      font-weight: 500;
      color: var(--accent);
      margin-bottom: 10px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 28px;
      font-weight: 600;
      line-height: 1.25;
      color: var(--ink);
      letter-spacing: -0.02em;
    }
    .reading-card.compact h1 {
      font-size: 23px;
    }
    .byline {
      margin: 0 0 22px;
      font-size: 13px;
      color: var(--ink-3);
    }
    .essay-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 720px;
    }
    .essay-body p {
      margin: 0;
      font-size: 16.5px;
      line-height: 1.75;
      color: var(--ink-2);
    }
    .ledger-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .ledger-row {
      padding: 15px 18px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--raised);
    }
    .ledger-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      font-size: 13.5px;
      color: var(--ink);
    }
    .ledger-row p {
      margin: 0;
      font-size: 14.5px;
      line-height: 1.6;
      color: var(--ink-2);
    }
    .time-pill,
    .domain-pill,
    .tag-pill,
    .format-badge {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 11.5px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink-2);
      font-variant-numeric: tabular-nums;
    }
    .tag-pill,
    .format-badge {
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-soft);
    }
    .search-toolbar {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 16px 0 20px;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid var(--line-2);
      background: var(--code-bg);
    }
    .search-label {
      font-size: 12.5px;
      color: var(--ink-3);
    }
    .search-query {
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
    }
    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tag-chip {
      font-size: 12.5px;
      padding: 4px 11px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--raised);
      color: var(--ink-2);
    }
    .tag-chip.is-active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 600;
    }
    .result-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .result-card {
      padding: 14px 18px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--raised);
    }
    .result-card.is-hovered {
      border-color: var(--accent);
    }
    .result-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .result-card h3 {
      margin: 0 0 6px;
      font-size: 15.5px;
      font-weight: 600;
      color: var(--ink);
    }
    .result-card p {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: var(--ink-2);
      padding-right: 64px;
    }
    .split-reading {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .composer-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 22px 26px;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .composer-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .composer-head .eyebrow { margin-bottom: 0; }
    .saved-pill {
      font-size: 12px;
      font-weight: 500;
      color: var(--accent);
      background: var(--accent-soft);
      padding: 3px 10px;
      border-radius: 999px;
    }
    .source-line {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 12px;
      color: var(--ink-3);
    }
    .composer-editor {
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--code-bg);
    }
    .composer-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 6px;
    }
    .composer-body {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: var(--ink-2);
    }
    .export-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .export-panel {
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--raised);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .export-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13.5px;
      color: var(--ink);
    }
    .code-block {
      margin: 0;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: var(--code-bg);
      color: var(--ink-2);
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 12.5px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .appearance-strip {
      font-size: 12.5px;
      color: var(--ink-3);
    }
  </style>
</head>
<body>
  <header class="browser-bar">
    <div class="traffic" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="url-bar">
      <span>${escapeHtml(scene.url)}</span>
      <span>${escapeHtml(ws.brandLabel)}</span>
    </div>
    <div class="bar-right">
      <span class="pill">${escapeHtml(ws.researcherBadge)}</span>
      <span class="pill">${escapeHtml(theme === "light" ? ws.themeLight : ws.themeDark)} · ${escapeHtml(ws.localeLabel)}</span>
      <span class="ext-toolbar-btn">
        <img src="${iconDataUri}" alt="" />
        <span>${escapeHtml(ws.extensionHint)}</span>
        <span class="count-badge">${noteCount}</span>
      </span>
    </div>
  </header>
  <main class="workspace">
    ${bodyHtml}
  </main>
</body>
</html>`;
}

function renderCompositorHtml({ bgDataUri, popupDataUri, theme }) {
  const borderColor = theme === "light" ? "rgba(23, 25, 29, 0.16)" : "rgba(255, 255, 255, 0.16)";
  const shadow =
    theme === "light"
      ? "0 24px 60px rgba(23, 25, 29, 0.22), 0 4px 12px rgba(23, 25, 29, 0.1)"
      : "0 28px 68px rgba(0, 0, 0, 0.65), 0 4px 14px rgba(0, 0, 0, 0.35)";
  const caretFill = theme === "light" ? "#fcfcfa" : "#171b22";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 1440px;
      height: 900px;
      overflow: hidden;
      position: relative;
      background: transparent;
    }
    .bg-layer {
      position: absolute;
      inset: 0;
      width: 1440px;
      height: 900px;
      display: block;
    }
    .popup-shell {
      position: absolute;
      top: 58px;
      right: 22px;
      width: 420px;
      border-radius: 12px;
      border: 1px solid ${borderColor};
      box-shadow: ${shadow};
      overflow: visible;
      background: ${caretFill};
    }
    .popup-shell::before {
      content: "";
      position: absolute;
      top: -6px;
      right: 54px;
      width: 11px;
      height: 11px;
      transform: rotate(45deg);
      background: ${caretFill};
      border-left: 1px solid ${borderColor};
      border-top: 1px solid ${borderColor};
    }
    .popup-img {
      display: block;
      width: 418px;
      height: auto;
      border-radius: 11px;
    }
  </style>
</head>
<body>
  <img class="bg-layer" src="${bgDataUri}" alt="" />
  <div class="popup-shell">
    <img class="popup-img" src="${popupDataUri}" alt="" />
  </div>
</body>
</html>`;
}

async function assertCleanDom(page, locale, label) {
  const report = await page.evaluate(() => {
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      const closedDetails = el.closest("details:not([open])");
      if (closedDetails && !el.closest("summary")) return false;
      return true;
    };

    const chunks = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || !isVisible(parent)) continue;
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
      const txt = node.nodeValue?.trim();
      if (txt) chunks.push(txt);
    }
    document.querySelectorAll("textarea, input, select").forEach((el) => {
      if (!isVisible(el)) return;
      if (el.tagName === "SELECT") {
        const selected = el.options?.[el.selectedIndex];
        if (selected?.textContent) chunks.push(selected.textContent.trim());
      } else if ("value" in el && el.value) {
        chunks.push(String(el.value));
      }
      if ("placeholder" in el && el.placeholder) {
        chunks.push(String(el.placeholder));
      }
    });
    return chunks.join("\n");
  });

  if (FORBIDDEN_RE.test(report)) {
    throw new Error(`Forbidden text found in ${label}: ${report.match(FORBIDDEN_RE)?.[0]}`);
  }
  if (locale === "en" && HAN_RE.test(report)) {
    throw new Error(`Han character leaked into EN DOM (${label}): "${report.match(HAN_RE)?.[0]}"`);
  }
}

async function startLocalServers(fixtures) {
  let currentHtml = "<!doctype html><html><body></body></html>";

  const articleServer = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(currentHtml);
  });
  await new Promise((resolve) => articleServer.listen(0, "127.0.0.1", resolve));
  const articlePort = articleServer.address().port;

  let activeVoiceSet = fixtures.ttsVoices;
  let ttsServer = null;
  try {
    ttsServer = http.createServer((req, res) => {
      if (req.url === "/api/voices") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(activeVoiceSet));
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false }));
    });
    await new Promise((resolve, reject) => {
      ttsServer.once("error", reject);
      ttsServer.listen(5020, "127.0.0.1", resolve);
    });
  } catch {
    ttsServer = null;
  }

  return {
    articleUrl: `http://127.0.0.1:${articlePort}/`,
    setHtml(html) {
      currentHtml = html;
    },
    setVoiceLocale(locale) {
      activeVoiceSet = locale === "zh-CN" ? fixtures.ttsVoicesZh : fixtures.ttsVoices;
    },
    async close() {
      await new Promise((resolve) => articleServer.close(resolve));
      if (ttsServer) await new Promise((resolve) => ttsServer.close(resolve));
    },
  };
}

async function main() {
  const fixtures = JSON.parse(await fsp.readFile(FIXTURES_PATH, "utf8"));
  const iconDataUri = `data:image/png;base64,${(await fsp.readFile(ICON_PATH)).toString("base64")}`;
  const { chromium } = await loadPlaywright();

  const servers = await startLocalServers(fixtures);
  const userDataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "tiny-memo-shots-"));
  const tempWorkDir = await fsp.mkdtemp(path.join(os.tmpdir(), "tiny-memo-png-"));

  let context;
  const manifestCheck = new Map();

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      headless: true,
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      args: [
        `--disable-extensions-except=${ROOT}`,
        `--load-extension=${ROOT}`,
        "--no-sandbox",
      ],
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent("serviceworker", { timeout: 10000 });
    const extId = new URL(sw.url()).host;

    const popupUrl = `chrome-extension://${extId}/popup.html`;
    const workspacePage = await context.newPage();
    const compositorPage = await context.newPage();

    for (const locale of LANGS) {
      const loc = fixtures.locales[locale];
      servers.setVoiceLocale(locale);

      for (const theme of THEMES) {
        const outDir = path.join(OUT_ROOT, locale, theme);
        await fsp.mkdir(outDir, { recursive: true });

        for (const sceneKey of SCENE_KEYS) {
          const scene = loc.scenes[sceneKey];
          const popupCfg = scene.popup;

          // Seed extension storage cleanly for the scene
          const extSeedPage = await context.newPage();
          await extSeedPage.goto(popupUrl);
          await extSeedPage.evaluate(
            async ({ lang, notes, mergeMultiline, autoTts, hoverButtons, siteConfigs, ttsVoice }) => {
              await chrome.storage.local.set({
                appLanguage: lang,
                memoNotes: notes,
                mergeMultilineSetting: mergeMultiline,
                autoTtsSetting: autoTts,
                hoverButtonsSetting: hoverButtons,
                siteConfigs,
                ttsVoice,
              });
            },
            {
              lang: locale,
              notes: scene.notes,
              mergeMultiline: popupCfg.mergeMultiline,
              autoTts: popupCfg.autoTts,
              hoverButtons: popupCfg.hoverButtons,
              siteConfigs: sceneKey === "03-instant-search-tag-filter" ? [] : loc.siteConfigs,
              ttsVoice: popupCfg.ttsVoice,
            }
          );

          // 1. Render workspace page with real content script (inline_button_handler.js)
          servers.setHtml(renderWorkspaceHtml({ locale, theme, sceneKey, fixtures, iconDataUri }));
          await workspacePage.goto(servers.articleUrl, { waitUntil: "networkidle" });
          await workspacePage.waitForTimeout(250);

          if (scene.selectedText) {
            await workspacePage.evaluate((targetText) => {
              const paragraphs = Array.from(document.querySelectorAll(".essay-body p"));
              for (const p of paragraphs) {
                const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
                let node;
                while ((node = walker.nextNode())) {
                  const idx = node.nodeValue.indexOf(targetText);
                  if (idx !== -1) {
                    const range = document.createRange();
                    range.setStart(node, idx);
                    range.setEnd(node, idx + targetText.length);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    p.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
                    return true;
                  }
                }
              }
              throw new Error(`Could not find target selection text: ${targetText}`);
            }, scene.selectedText);
            await workspacePage.waitForTimeout(180);
          }

          if (sceneKey === "03-instant-search-tag-filter") {
            const targetPara = workspacePage.locator(`.result-card[data-card="${scene.hoverTargetIndex}"] .hover-target-p`);
            const box = await targetPara.boundingBox();
            if (!box) throw new Error("Missing hover target paragraph bounding box");
            await workspacePage.mouse.move(box.x + 24, box.y + 12);
            await workspacePage.waitForTimeout(220);
          }

          await assertCleanDom(workspacePage, locale, `${locale}/${theme}/${sceneKey} workspace`);
          const bgPngBuffer = await workspacePage.screenshot({ type: "png" });

          // Restore real domain siteConfigs before capturing popup.html
          if (sceneKey === "03-instant-search-tag-filter") {
            await extSeedPage.evaluate(async (siteConfigs) => {
              await chrome.storage.local.set({ siteConfigs });
            }, loc.siteConfigs);
          }

          // 2. Render real extension popup.html at @2x with clean theme styling
          await extSeedPage.setViewportSize({ width: 420, height: 760 });
          await extSeedPage.goto(`${popupUrl}?lang=${encodeURIComponent(locale)}`, { waitUntil: "networkidle" });
          await extSeedPage.addStyleTag({ content: buildPopupThemeCss(theme) });
          await extSeedPage.waitForTimeout(220);

          if (popupCfg.openSiteRules) {
            await extSeedPage.evaluate(() => {
              const details = document.querySelector("#siteConfigSection details");
              if (details) details.setAttribute("open", "");
            });
          }
          if (popupCfg.triggerCopyFeedback) {
            await extSeedPage.click("#copyMarkdownBtn");
            await extSeedPage.waitForTimeout(120);
          }
          if (popupCfg.openLanguageMenu && locale !== "en") {
            await extSeedPage.evaluate(() => {
              const menu = document.getElementById("languageMenu");
              if (menu) menu.setAttribute("open", "");
            });
          }
          await extSeedPage.evaluate(() => {
            const ta = document.getElementById("notesDisplay");
            if (ta) {
              ta.style.height = "auto";
              ta.style.height = `${Math.max(132, Math.min(240, ta.scrollHeight + 8))}px`;
            }
          });
          await extSeedPage.waitForTimeout(120);

          await assertCleanDom(extSeedPage, locale, `${locale}/${theme}/${sceneKey} popup`);
          const popupHeight = await extSeedPage.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
          await extSeedPage.setViewportSize({ width: 420, height: Math.max(260, Math.min(820, popupHeight)) });
          await extSeedPage.waitForTimeout(100);
          const popupPngBuffer = await extSeedPage.screenshot({ type: "png" });
          await extSeedPage.close();

          // 3. Composite workspace + real popup popover into 2880x1800 PNG -> WebP
          const bgDataUri = `data:image/png;base64,${bgPngBuffer.toString("base64")}`;
          const popupDataUri = `data:image/png;base64,${popupPngBuffer.toString("base64")}`;
          await compositorPage.setContent(renderCompositorHtml({ bgDataUri, popupDataUri, theme }), {
            waitUntil: "load",
          });
          await compositorPage.waitForTimeout(80);

          const rawPngPath = path.join(tempWorkDir, `${locale}-${theme}-${sceneKey}.png`);
          const outWebpPath = path.join(outDir, `${sceneKey}.webp`);
          await compositorPage.screenshot({ path: rawPngPath, type: "png" });
          execFileSync("cwebp", ["-quiet", "-q", "90", rawPngPath, "-o", outWebpPath]);

          const webpBuf = await fsp.readFile(outWebpPath);
          const dims = parseWebpDimensions(webpBuf);
          if (dims.width !== 2880 || dims.height !== 1800) {
            throw new Error(`Invalid dimensions ${dims.width}x${dims.height} for ${outWebpPath}`);
          }
          if (webpBuf.length === 0 || webpBuf.length >= 5 * 1024 * 1024) {
            throw new Error(`Invalid file size ${webpBuf.length} for ${outWebpPath}`);
          }
          manifestCheck.set(`${locale}/${theme}/${sceneKey}`, {
            path: outWebpPath,
            bytes: webpBuf.length,
            sha256: sha256(webpBuf),
          });
          console.log(`Generated ${locale}/${theme}/${sceneKey}.webp (${dims.width}x${dims.height}, ${webpBuf.length} B)`);
        }
      }
    }

    // Cross-variant uniqueness assertions
    for (const sceneKey of SCENE_KEYS) {
      const enLight = manifestCheck.get(`en/light/${sceneKey}`);
      const enDark = manifestCheck.get(`en/dark/${sceneKey}`);
      const zhLight = manifestCheck.get(`zh-CN/light/${sceneKey}`);
      const zhDark = manifestCheck.get(`zh-CN/dark/${sceneKey}`);
      if (enLight.sha256 === enDark.sha256) throw new Error(`light/dark identical for en/${sceneKey}`);
      if (zhLight.sha256 === zhDark.sha256) throw new Error(`light/dark identical for zh-CN/${sceneKey}`);
      if (enLight.sha256 === zhLight.sha256) throw new Error(`en/zh-CN identical for light/${sceneKey}`);
      if (enDark.sha256 === zhDark.sha256) throw new Error(`en/zh-CN identical for dark/${sceneKey}`);
    }
    console.log(`All ${manifestCheck.size} screenshots verified at 2880x1800 WebP.`);
  } finally {
    if (context) await context.close();
    await servers.close();
    await fsp.rm(userDataDir, { recursive: true, force: true });
    await fsp.rm(tempWorkDir, { recursive: true, force: true });
  }
}

await main();
