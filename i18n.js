// Tiny Memo Chrome MV3 Extension 8-language runtime i18n, canonical v2 SVG icons, and if9 wordmark.
(function (globalScope) {
  const EXT_LANGUAGES = ["en", "ja", "zh-CN", "zh-TW", "ko", "de", "fr", "es"];
  const EXT_DEFAULT_LANGUAGE = "en";
  const PLURAL_ONE_LANGUAGES = new Set(["en", "de", "fr", "es"]);

  const EXT_LANGUAGE_LABELS = {
    en: "English",
    ja: "日本語",
    "zh-CN": "简体中文",
    "zh-TW": "繁體中文",
    ko: "한국어",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
  };

  function normalizeLocale(raw) {
    if (typeof raw !== "string") return null;
    const clean = raw.trim().replace(/_/g, "-").toLowerCase();
    if (!clean) return null;
    if (/^zh-(tw|hk|mo|hant)(?:-|$)/.test(clean)) return "zh-TW";
    if (clean === "zh" || clean.startsWith("zh-")) return "zh-CN";
    for (const locale of EXT_LANGUAGES) {
      if (locale === "zh-CN" || locale === "zh-TW") continue;
      const lower = locale.toLowerCase();
      if (clean === lower || clean.startsWith(`${lower}-`)) return locale;
    }
    return null;
  }

  function normalizeLanguagePreference(raw) {
    if (typeof raw !== "string") return null;
    const clean = raw.trim().toLowerCase();
    if (clean === "system" || clean === "auto") return "system";
    return normalizeLocale(raw);
  }

  function resolveBrowserLanguage(candidates) {
    let list = candidates;
    if (!Array.isArray(list)) {
      const collected = [];
      try {
        if (typeof chrome !== "undefined" && chrome && chrome.i18n && typeof chrome.i18n.getUILanguage === "function") {
          collected.push(chrome.i18n.getUILanguage());
        }
      } catch (_err) {
        // Ignore unavailable chrome.i18n in non-extension test environments
      }
      if (typeof navigator !== "undefined") {
        if (Array.isArray(navigator.languages)) collected.push(...navigator.languages);
        if (navigator.language) collected.push(navigator.language);
      }
      list = collected;
    }

    for (const raw of list) {
      const matched = normalizeLocale(raw);
      if (matched) return matched;
    }
    return EXT_DEFAULT_LANGUAGE;
  }

  function formatMessage(template, params) {
    if (!params) return String(template);
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, function (full, key) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) return full;
      const val = params[key];
      return val === undefined || val === null ? "" : String(val);
    });
  }

  function getNestedValue(obj, dottedKey) {
    if (!obj || typeof obj !== "object") return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, dottedKey)) return obj[dottedKey];
    const parts = String(dottedKey).split(".");
    let cur = obj;
    for (let i = 0; i < parts.length; i += 1) {
      if (!cur || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, parts[i])) {
        return undefined;
      }
      cur = cur[parts[i]];
    }
    return typeof cur === "string" ? cur : undefined;
  }

  function lookupMessage(catalog, language, key, params) {
    const lang = normalizeLocale(language) || EXT_DEFAULT_LANGUAGE;
    const dict = (catalog && catalog[lang]) || (catalog && catalog[EXT_DEFAULT_LANGUAGE]) || {};
    const fallback = (catalog && catalog[EXT_DEFAULT_LANGUAGE]) || {};
    const trySingular = Boolean(params && Number(params.count) === 1 && PLURAL_ONE_LANGUAGES.has(lang));
    const singularKey = `${key}One`;

    let raw;
    if (trySingular) {
      raw = getNestedValue(dict, singularKey);
    }
    if (raw === undefined) {
      raw = getNestedValue(dict, key);
    }
    if (raw === undefined && trySingular) {
      raw = getNestedValue(fallback, singularKey);
    }
    if (raw === undefined) {
      raw = getNestedValue(fallback, key);
    }
    if (raw === undefined) return key;
    return formatMessage(raw, params);
  }

  function readQueryOverride() {
    try {
      if (typeof location !== "undefined" && location && typeof location.search === "string") {
        const params = new URLSearchParams(location.search);
        const qLang = params.get("lang");
        if (qLang) {
          const normalized = normalizeLocale(qLang);
          if (normalized) return normalized;
        }
      }
    } catch (_err) {
      // Ignore query parsing errors
    }
    return null;
  }

  async function getActiveLanguage(options) {
    const opts = options || {};
    const explicitOverride = normalizeLocale(opts.override || globalScope.__TINY_MEMO_LANGUAGE__);
    if (explicitOverride) return explicitOverride;

    const queryOverride = readQueryOverride();
    if (queryOverride) return queryOverride;

    try {
      if (typeof chrome !== "undefined" && chrome && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get(["appLanguage"]);
        const pref = normalizeLanguagePreference(stored && stored.appLanguage);
        if (pref && pref !== "system") return pref;
      }
    } catch (_err) {
      // Fall back to browser locale when storage is unavailable
    }

    return resolveBrowserLanguage(opts.candidates);
  }

  function createTranslator(language, catalog) {
    const activeCatalog = catalog || globalScope.__TINY_MEMO_CATALOG__ || {};
    const activeLang = normalizeLocale(language) || EXT_DEFAULT_LANGUAGE;
    return function t(key, params) {
      return lookupMessage(activeCatalog, activeLang, key, params);
    };
  }

  function globeSvg(size, strokeWidth) {
    const s = size || 14;
    const sw = strokeWidth || 1.75;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
  }

  function settingsSvg(size, strokeWidth) {
    const s = size || 14;
    const sw = strokeWidth || 1.75;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  function hashSvg(size, strokeWidth) {
    const s = size || 14;
    const sw = strokeWidth || 1.75;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>`;
  }

  function pencilSvg(size, strokeWidth) {
    const s = size || 14;
    const sw = strokeWidth || 1.75;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>`;
  }

  function trash2Svg(size, strokeWidth) {
    const s = size || 14;
    const sw = strokeWidth || 1.75;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
  }

  function arrowUpRightSvg(size, strokeWidth) {
    const s = size || 14;
    const sw = strokeWidth || 1.75;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>`;
  }

  const IF9_WORD = {
    viewBox: "43.2 82 509.8 609.92",
    width: 0.969,
    height: 1.159,
    descent: 0.251,
    letters: "M45.2 209.2a24.8 24.8 0 1 0 49.6 0a24.8 24.8 0 1 0 -49.6 0ZM50 280h40v280h-40ZM194 560V188A104 104 0 0 1 368.89 111.9L341.62 141.17A64 64 0 0 0 234 188V560ZM154 272h134v40h-134Z",
    nine: "M550 444C550 543.76 501.28 631.92 394.56 689.92C429.36 643.52 452.56 601.76 459.52 557.1A116 116 0 1 1 550 444ZM370 444a64 64 0 1 0 128 0a64 64 0 1 0 -128 0Z",
  };

  function if9WordSvg(options) {
    const opts = options || {};
    const styles = [
      "display:inline-block",
      "overflow:visible",
      `width:${IF9_WORD.width}em`,
      `height:${IF9_WORD.height}em`,
      `vertical-align:${-IF9_WORD.descent}em`,
    ];
    if (opts.gapBefore) styles.push("margin-left:.18em");
    if (opts.gapAfter) styles.push("margin-right:.18em");
    return `<svg aria-label="if9" role="img" viewBox="${IF9_WORD.viewBox}" fill="none" style="${styles.join(";")}"><path d="${IF9_WORD.letters}" fill="currentColor"/><path d="${IF9_WORD.nine}" fill="var(--accent, #4CAF50)"/></svg>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  const WIDE_CHAR_RE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/;

  function renderBrandTextHtml(text) {
    const str = String(text || "");
    const token = "if9";
    let out = "";
    let cursor = 0;
    for (let at = str.indexOf(token); at !== -1; at = str.indexOf(token, at + token.length)) {
      const before = str[at - 1] || "";
      const after = str[at + token.length] || "";
      const next = str[at + token.length + 1] || "";
      const standsAlone = !/[\w@./-]/.test(before) && !/\w/.test(after) && !(after === "." && /\w/.test(next));
      if (!standsAlone) continue;
      const head = str.slice(cursor, at);
      const tail = str.slice(at + token.length);
      const gapBefore = WIDE_CHAR_RE.test(head.trimEnd().slice(-1));
      const gapAfter = WIDE_CHAR_RE.test(tail.trimStart().slice(0, 1));
      out += escapeHtml(gapBefore ? head.replace(/ +$/, "") : head);
      out += if9WordSvg({ gapBefore, gapAfter });
      cursor = at + token.length + (gapAfter ? (tail.match(/^ +/)?.[0].length || 0) : 0);
    }
    out += escapeHtml(str.slice(cursor));
    return out;
  }

  function getWebsiteUrl(language) {
    const lang = normalizeLocale(language) || EXT_DEFAULT_LANGUAGE;
    const prefixMap = {
      en: "",
      ja: "/ja",
      "zh-CN": "/zh-cn",
      "zh-TW": "/zh-tw",
      ko: "/ko",
      de: "/de",
      fr: "/fr",
      es: "/es",
    };
    const prefix = prefixMap[lang] || "";
    return prefix ? `https://tiny-memo.if9.cool${prefix}/` : "https://tiny-memo.if9.cool/";
  }

  globalScope.TinyMemoI18n = {
    EXT_LANGUAGES,
    EXT_DEFAULT_LANGUAGE,
    EXT_LANGUAGE_LABELS,
    PLURAL_ONE_LANGUAGES,
    normalizeLocale,
    normalizeLanguagePreference,
    resolveBrowserLanguage,
    formatMessage,
    lookupMessage,
    getActiveLanguage,
    createTranslator,
    globeSvg,
    settingsSvg,
    hashSvg,
    pencilSvg,
    trash2Svg,
    arrowUpRightSvg,
    if9WordSvg,
    renderBrandTextHtml,
    getWebsiteUrl,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
