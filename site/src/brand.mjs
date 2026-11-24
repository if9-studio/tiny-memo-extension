// @if9/brand framework-free SVG wordmark & Tiny Memo 8-language canonical routing helpers.
export const SITE_ORIGIN = "https://tiny-memo.if9.cool";
export const HUB_ORIGIN = "https://if9.cool";
export const SUPPORTED_LANGS = ["en", "ja", "zh-CN", "zh-TW", "ko", "de", "fr", "es"];
export const X_DEFAULT_LANG = "en";

export const LANG_LABELS = {
  en: "English",
  ja: "日本語",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ko: "한국어",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

export const LANG_PREFIX = {
  en: "",
  ja: "/ja",
  "zh-CN": "/zh-cn",
  "zh-TW": "/zh-tw",
  ko: "/ko",
  de: "/de",
  fr: "/fr",
  es: "/es",
};

const PRIMARY_LANG_MAP = {
  en: "en",
  ja: "ja",
  ko: "ko",
  de: "de",
  fr: "fr",
  es: "es",
};

/** Normalize BCP-47 / URL prefix / ?lang= into canonical 8-language code. */
export function normalizeLocale(raw) {
  if (typeof raw !== "string") return null;
  const clean = raw.trim().toLowerCase().replace(/_/g, "-");
  if (!clean) return null;
  const parts = clean.split("-").filter(Boolean);
  if (!parts.length) return null;
  if (parts[0] === "zh") {
    return parts.some((p) => p === "tw" || p === "hk" || p === "mo" || p === "hant") ? "zh-TW" : "zh-CN";
  }
  return PRIMARY_LANG_MAP[parts[0]] ?? null;
}

/** Generate canonical path on tiny-memo.if9.cool: `/`, `/ja/`, `/vs-web-clippers`, `/ja/vs-web-clippers`. */
export function localePath(lang, slug = "") {
  const prefix = LANG_PREFIX[lang] ?? "";
  const cleanSlug = slug.replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return prefix ? `${prefix}/` : "/";
  return `${prefix}/${cleanSlug}`;
}

export function canonicalUrl(lang, slug = "") {
  return `${SITE_ORIGIN}${localePath(lang, slug)}`;
}

/** Generate same-locale canonical link pointing to if9.cool hub pages. */
export function if9HubHref(lang, barePath = "/") {
  const prefix = LANG_PREFIX[lang] ?? "";
  const clean = barePath === "/" ? "/" : `/${barePath.replace(/^\/+|\/+$/g, "")}`;
  if (!prefix) return `${HUB_ORIGIN}${clean}`;
  return clean === "/" ? `${HUB_ORIGIN}${prefix}` : `${HUB_ORIGIN}${prefix}${clean}`;
}

const IF9_WORD_REGULAR = {
  viewBox: "43.2 82 509.8 609.92",
  width: 0.969,
  height: 1.159,
  descent: 0.251,
  letters: "M45.2 209.2a24.8 24.8 0 1 0 49.6 0a24.8 24.8 0 1 0 -49.6 0ZM50 280h40v280h-40ZM194 560V188A104 104 0 0 1 368.89 111.9L341.62 141.17A64 64 0 0 0 234 188V560ZM154 272h134v40h-134Z",
  nine: "M550 444C550 543.76 501.28 631.92 394.56 689.92C429.36 643.52 452.56 601.76 459.52 557.1A116 116 0 1 1 550 444ZM370 444a64 64 0 1 0 128 0a64 64 0 1 0 -128 0Z",
};

const WIDE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/;

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

export function wordSvg({ gapBefore = false, gapAfter = false } = {}) {
  const m = IF9_WORD_REGULAR;
  const styles = [
    "display:inline-block",
    "overflow:visible",
    `width:${m.width}em`,
    `height:${m.height}em`,
    `vertical-align:${-m.descent}em`,
  ];
  if (gapBefore) styles.push("margin-left:.18em");
  if (gapAfter) styles.push("margin-right:.18em");
  return `<svg aria-label="if9" role="img" viewBox="${m.viewBox}" fill="none" style="${styles.join(";")}"><path d="${m.letters}" fill="currentColor"/><path d="${m.nine}" fill="var(--if9-accent,var(--accent,currentColor))"/></svg>`;
}

/** Replace standalone `if9` occurrences with the SVG wordmark while keeping domains & emails plain text. */
export function brandTextHtml(text) {
  const name = "if9";
  let out = "";
  let cursor = 0;
  for (let at = text.indexOf(name); at !== -1; at = text.indexOf(name, at + name.length)) {
    const before = text[at - 1] ?? "";
    const after = text[at + name.length] ?? "";
    const next = text[at + name.length + 1] ?? "";
    const standsAlone = !/[\w@./-]/.test(before) && !/\w/.test(after) && !(after === "." && /\w/.test(next));
    if (!standsAlone) continue;
    const head = text.slice(cursor, at);
    const tail = text.slice(at + name.length);
    const gapBefore = WIDE.test(head.trimEnd().slice(-1));
    const gapAfter = WIDE.test(tail.trimStart().slice(0, 1));
    out += escapeHtml(gapBefore ? head.replace(/ +$/, "") : head);
    out += wordSvg({ gapBefore, gapAfter });
    cursor = at + name.length + (gapAfter ? (tail.match(/^ +/)?.[0].length ?? 0) : 0);
  }
  out += escapeHtml(text.slice(cursor));
  return out;
}
