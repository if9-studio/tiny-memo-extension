// Pure HTML, Sitemap, robots.txt, llms.txt, and _redirects renderer (8 languages x 2 routes = 16 pages).
import {
  HUB_ORIGIN,
  LANG_LABELS,
  SITE_ORIGIN,
  SUPPORTED_LANGS,
  X_DEFAULT_LANG,
  brandTextHtml,
  canonicalUrl,
  escapeHtml,
  if9HubHref,
  localePath,
} from "./brand.mjs";
import { COMMON } from "./i18n-common.mjs";
import { LANDING } from "./content-landing.mjs";
import { COMPARE } from "./content-compare.mjs";

const ICONS = {
  sliders: `<svg class="icon" viewBox="0 0 24 24"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>`,
  download: `<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  mail: `<svg class="icon" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  arrowRight: `<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  globe: `<svg class="icon icon-globe" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  sun: `<svg class="icon only-dark" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg class="icon only-light" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  menu: `<svg class="icon" viewBox="0 0 24 24"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
};

const ORGANIZATION_LD = {
  "@type": "Organization",
  "@id": `${HUB_ORIGIN}/#organization`,
  name: "if9 Studio",
  legalName: "IF9 Studio LLC",
  url: `${HUB_ORIGIN}/`,
};

export const ALL_PAGE_SLUGS = ["", "vs-web-clippers"];

function serializeJsonLd(items) {
  return JSON.stringify(items).replace(/</g, "\\u003c");
}

function buildSoftwareAppLd({ lang, slug, description, releaseLive, releaseDownloadUrl }) {
  const ui = COMMON[lang];
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: ui.brandName,
    operatingSystem: "Chrome, Edge, Chromium",
    applicationCategory: "BrowserApplication",
    inLanguage: lang,
    url: canonicalUrl(lang, slug),
    description,
    publisher: ORGANIZATION_LD,
  };
  if (releaseLive && releaseDownloadUrl) {
    appLd.downloadUrl = releaseDownloadUrl;
  }
  return appLd;
}

function renderPrelaunchBox({ lang, deployCopy, releaseLive, downloadUrl = "#download" }) {
  const releaseState = releaseLive ? "live" : "waitlist";
  return `
      <div class="prelaunch-box" data-prelaunch-root data-app="tiny-memo" data-platform="extension" data-release-state="${releaseState}">
        <div data-release-live class="when-live">
          <p style="color: var(--ink-2); margin-bottom: 16px">${escapeHtml(deployCopy.liveSub)}</p>
          <a class="btn btn-primary" data-release-download href="${escapeHtml(downloadUrl)}">${ICONS.download}${escapeHtml(deployCopy.liveCta)}</a>
        </div>
        <div data-release-waitlist class="when-waitlist">
          <p style="margin-bottom: 10px"><span class="badge warn">${escapeHtml(deployCopy.waitlistBadge)}</span></p>
          <p style="color: var(--ink-2)">${escapeHtml(deployCopy.waitlistSub)}</p>
          <form class="waitlist-form" data-waitlist-form novalidate>
            <label class="sr-only" for="waitlist-email-${lang}">${escapeHtml(deployCopy.waitlistPlaceholder)}</label>
            <input id="waitlist-email-${lang}" type="email" name="email" autocomplete="email" required placeholder="${escapeHtml(deployCopy.waitlistPlaceholder)}">
            <button class="btn btn-primary" type="submit" data-label="${escapeHtml(deployCopy.waitlistBtn)}">${ICONS.mail}${escapeHtml(deployCopy.waitlistBtn)}</button>
          </form>
          <p class="waitlist-msg" data-waitlist-msg role="status" aria-live="polite"></p>
          <p class="waitlist-promise">${escapeHtml(deployCopy.waitlistPromise)}</p>
        </div>
      </div>`;
}

function renderShell({
  lang,
  slug,
  title,
  description,
  jsonLdItems,
  releaseLive,
  networkItems = [],
  promo = false,
  ogType = "website",
  mainHtml,
}) {
  const ui = COMMON[lang];
  const releaseState = releaseLive ? "live" : "waitlist";
  const canonical = canonicalUrl(lang, slug);
  const ogImage = `${SITE_ORIGIN}/assets/og-card.svg`;
  const homeHref = localePath(lang, "");
  const deployAnchorHref = slug === "" ? "#download" : `${homeHref}#download`;

  const alternatesHtml = [
    ...SUPPORTED_LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${canonicalUrl(l, slug)}">`),
    `<link rel="alternate" hreflang="x-default" href="${canonicalUrl(X_DEFAULT_LANG, slug)}">`,
  ].join("\n  ");

  const navItems = [
    { href: homeHref, label: ui.nav.overview, current: slug === "" },
    { href: localePath(lang, "vs-web-clippers"), label: ui.nav.compare, current: slug === "vs-web-clippers" },
    { href: deployAnchorHref, label: ui.nav.release, current: false },
  ];

  const langMenuHtml = SUPPORTED_LANGS.map((l) => (
    `<li data-locale="${l}"><a href="${localePath(l, slug)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ""}><span>${escapeHtml(LANG_LABELS[l])}</span><span class="lang-check" aria-hidden="true">${l === lang ? "✓" : ""}</span></a></li>`
  )).join("");

  const networkSectionHtml = Array.isArray(networkItems) && networkItems.length > 0
    ? `
    <div class="seo-network">
      <h4>${brandTextHtml(ui.footer.networkHeading)}</h4>
      <ul>
        ${networkItems.map((item) => `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.anchor_label || item.anchor || item.title || item.name)}</a></li>`).join("")}
      </ul>
    </div>`
    : "";

  const promoHtml = promo
    ? `
<aside class="if9-promo" aria-label="${escapeHtml(ui.promo.eyebrow)}">
  <div class="wrap">
    <div class="if9-promo-card">
      <div>
        <p class="eyebrow">${brandTextHtml(ui.promo.eyebrow)}</p>
        <h3>${brandTextHtml(ui.promo.title)}</h3>
        <p>${brandTextHtml(ui.promo.body)}</p>
      </div>
      <a class="btn" href="${if9HubHref(lang, "/")}">${brandTextHtml(ui.promo.cta)} ${ICONS.arrowRight}</a>
    </div>
  </div>
</aside>`
    : "";

  return `<!doctype html>
<html lang="${lang}" data-release-state="${releaseState}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  ${alternatesHtml}
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:site_name" content="${escapeHtml(ui.brandName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg">
  <link rel="stylesheet" href="/assets/site.css">
  <script>try{document.documentElement.setAttribute("data-theme",localStorage.getItem("tiny-memo-site-theme")==="light"?"light":"dark")}catch(e){}</script>
  <script type="application/ld+json">${serializeJsonLd(jsonLdItems)}</script>
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${homeHref}"><img src="/assets/icon.svg" alt="" width="26" height="26">${escapeHtml(ui.brandName)}<span class="brand-sub">${escapeHtml(ui.brandSub)}</span></a>
    <nav class="nav" aria-label="${escapeHtml(ui.navLabel)}">
      ${navItems.map((n) => `<a href="${n.href}"${n.current ? ' aria-current="page"' : ""}>${escapeHtml(n.label)}</a>`).join("\n      ")}
    </nav>
    <div class="header-tools">
      <details class="lang-menu" data-lang-menu>
        <summary aria-label="${escapeHtml(ui.langSwitchLabel)}">${ICONS.globe}<span lang="${lang}">${escapeHtml(LANG_LABELS[lang])}</span></summary>
        <ul data-lang-list>${langMenuHtml}</ul>
      </details>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="${escapeHtml(ui.themeToggleInit)}" title="${escapeHtml(ui.themeToggleInit)}">${ICONS.sun}${ICONS.moon}</button>
      <a class="btn btn-primary btn-sm" href="${deployAnchorHref}"><span class="when-live btn-inline">${ICONS.download}<span class="btn-label">${escapeHtml(ui.headerCtaLive)}</span></span><span class="when-waitlist btn-inline">${ICONS.mail}<span class="btn-label">${escapeHtml(ui.headerCtaWaitlist)}</span></span></a>
      <button class="icon-btn menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-label="${escapeHtml(ui.openMenu)}">${ICONS.menu}</button>
    </div>
  </div>
</header>

${mainHtml}
${promoHtml}

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <a class="brand" href="${homeHref}"><img src="/assets/icon.svg" alt="" width="26" height="26">${escapeHtml(ui.brandName)}</a>
        <p class="fine">${escapeHtml(ui.footer.blurb)}</p>
        <p class="fine">${brandTextHtml(ui.footer.madeBy)} · <a href="${if9HubHref(lang, "/")}">if9.cool</a></p>
      </div>
      <div>
        <h4>${escapeHtml(ui.footer.colCompare)}</h4>
        <ul>
          <li><a href="${localePath(lang, "vs-web-clippers")}">${escapeHtml(ui.footer.vsLink)}</a></li>
          <li><a href="${deployAnchorHref}">${escapeHtml(ui.footer.downloadLink)}</a></li>
        </ul>
      </div>
      <div>
        <h4>${brandTextHtml(ui.footer.colLegal)}</h4>
        <ul>
          <li><a href="${if9HubHref(lang, "/products/tiny-memo")}">${brandTextHtml(ui.footer.hubProductLink)}</a></li>
          <li><a href="${if9HubHref(lang, "/legal/terms")}">${escapeHtml(ui.footer.terms)}</a></li>
          <li><a href="${if9HubHref(lang, "/legal/privacy")}">${escapeHtml(ui.footer.privacy)}</a></li>
          <li><a href="${if9HubHref(lang, "/legal/refund")}">${escapeHtml(ui.footer.refund)}</a></li>
        </ul>
      </div>
      <div>
        <h4>if9</h4>
        <ul>
          <li><a href="${if9HubHref(lang, "/")}">if9.cool</a></li>
          <li><a href="mailto:hello@if9.cool">hello@if9.cool</a></li>
        </ul>
      </div>
    </div>${networkSectionHtml}
  </div>
</footer>

<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

export function renderLandingPage({ lang, releaseLive, releaseDownloadUrl = "", networkItems = [] }) {
  const L = LANDING[lang];
  const hero = L.hero;

  const sampleNotesHtml = hero.sampleNotes.map((line) => `
            <div class="memo-preview-line">
              <span class="memo-preview-bullet">-</span>
              <span>${escapeHtml(line)}</span>
            </div>`).join("");

  const dialsHtml = hero.dials.map((d) => `
            <div class="dial-item">
              <span>${escapeHtml(d.name)}</span>
              <strong>${escapeHtml(d.val)}</strong>
            </div>`).join("");

  const pillarsHtml = L.pillars.items.map((it) => `
      <div class="state">
        <span class="badge ${it.tone}">${escapeHtml(it.badge)}</span>
        <h3>${escapeHtml(it.title)}</h3>
        <p>${escapeHtml(it.body)}</p>
      </div>`).join("");

  const specsHtml = L.deploy.specs.map((s) => `<dt>${escapeHtml(s.k)}</dt><dd>${escapeHtml(s.v)}</dd>`).join("");
  const faqHtml = L.faq.map((f, idx) => `
      <details class="faq-item"${idx === 0 ? " open" : ""}>
        <summary>${escapeHtml(f.q)}</summary>
        <p>${escapeHtml(f.a)}</p>
      </details>`).join("");

  const mainHtml = `
<main>
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div class="hero-text">
          <p class="eyebrow">${brandTextHtml(hero.eyebrow)}</p>
          <h1 class="hero-title">${escapeHtml(hero.title)}</h1>
          <p class="hero-lede">${escapeHtml(hero.lede)}</p>
          <div class="entry">
            <p class="head"><b>${escapeHtml(hero.entryHead)}</b></p>
            <p>${escapeHtml(hero.entryBody)}</p>
          </div>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#download"><span class="when-waitlist btn-inline">${ICONS.mail}${escapeHtml(hero.ctaWaitlist)}</span><span class="when-live btn-inline">${ICONS.download}${escapeHtml(hero.ctaLive)}</span></a>
            <a class="btn" href="${localePath(lang, "vs-web-clippers")}">${escapeHtml(hero.ctaSecondary)}</a>
          </div>
          <div class="hero-meta">${hero.metaItems.map((m) => `<span><i class="dot"></i>${escapeHtml(m)}</span>`).join("")}</div>
        </div>
        <aside class="console-card" aria-label="${escapeHtml(hero.consoleTitle)}">
          <div class="console-bar"><span>${escapeHtml(hero.consoleTitle)}</span><span>${escapeHtml(hero.consoleBadge)}</span></div>
          <div class="console-stage">
            <div class="memo-preview-list">${sampleNotesHtml}
            </div>
            <div class="console-dials">${dialsHtml}</div>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <section class="section band">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">${escapeHtml(L.pillars.eyebrow)}</p>
        <h2>${escapeHtml(L.pillars.title)}</h2>
        <p>${escapeHtml(L.pillars.lead)}</p>
      </div>
      <div class="states">${pillarsHtml}</div>
    </div>
  </section>

  <section class="section" id="download">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">${escapeHtml(L.deploy.eyebrow)}</p>
        <h2>${escapeHtml(L.deploy.title)}</h2>
        <p>${escapeHtml(L.deploy.lead)}</p>
      </div>
      <div class="download">
        <div>${renderPrelaunchBox({ lang, deployCopy: L.deploy, releaseLive, downloadUrl: releaseDownloadUrl || "#download" })}</div>
        <div>
          <h3>${escapeHtml(L.deploy.specTitle)}</h3>
          <dl>${specsHtml}</dl>
        </div>
      </div>
    </div>
  </section>

  <section class="section band" id="faq">
    <div class="wrap">
      <div class="section-head">
        <p class="eyebrow">${escapeHtml(L.faqHead.eyebrow)}</p>
        <h2>${escapeHtml(L.faqHead.title)}</h2>
      </div>
      <div class="faq">${faqHtml}</div>
    </div>
  </section>
</main>`;

  const appLd = buildSoftwareAppLd({
    lang,
    slug: "",
    description: L.meta.description,
    releaseLive,
    releaseDownloadUrl,
  });

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: L.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return renderShell({
    lang,
    slug: "",
    title: L.meta.title,
    description: L.meta.description,
    jsonLdItems: [appLd, faqLd],
    releaseLive,
    networkItems,
    promo: true,
    mainHtml,
  });
}

export function renderComparePage({ lang, releaseLive, releaseDownloadUrl = "", networkItems = [] }) {
  const ui = COMMON[lang];
  const cmp = COMPARE[lang];

  const mainHtml = `
<main class="wrap doc">
  <article class="doc-main">
    <div class="chapter-head">
      <span class="chapter-label">${ICONS.sliders}${escapeHtml(ui.brandName)}</span>
      <h1>${escapeHtml(cmp.title)}</h1>
      <p class="lede">${escapeHtml(cmp.lede)}</p>
    </div>
    <section id="fit">
      <h2>${escapeHtml(cmp.whoHead)}</h2>
      <ul class="facts">
        ${cmp.whoList.map((w) => `<li><b>${escapeHtml(w.who)}</b>${escapeHtml(w.fit)}</li>`).join("")}
      </ul>
    </section>
    <section id="matrix">
      <div class="table-wrap">
        <table class="spec">
          <thead>
            <tr>
              <th>${escapeHtml(cmp.tableHead.feature)}</th>
              <th>${escapeHtml(cmp.tableHead.tinyMemo)}</th>
              <th>${escapeHtml(cmp.tableHead.cloudClipper)}</th>
              <th>${escapeHtml(cmp.tableHead.vaultClipper)}</th>
            </tr>
          </thead>
          <tbody>
            ${cmp.rows.map((r) => `<tr><td>${escapeHtml(r.f)}</td><td class="yes">${escapeHtml(r.tinyMemo)}</td><td>${escapeHtml(r.cloudClipper)}</td><td>${escapeHtml(r.vaultClipper)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section id="compare-faq">
      <div class="faq">
        ${cmp.faq.map((f, idx) => `<details class="faq-item"${idx === 0 ? " open" : ""}><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`).join("")}
      </div>
    </section>
    <nav class="pager" aria-label="${escapeHtml(ui.navLabel)}">
      <a class="prev" href="${localePath(lang, "")}"><span>${escapeHtml(ui.prevLabel)}</span>${escapeHtml(ui.nav.overview)}</a>
      <a class="next" href="${localePath(lang, "")}#download"><span>${escapeHtml(ui.nextLabel)}</span>${escapeHtml(ui.footer.downloadLink)}</a>
    </nav>
  </article>
</main>`;

  const appLd = buildSoftwareAppLd({
    lang,
    slug: "vs-web-clippers",
    description: cmp.description,
    releaseLive,
    releaseDownloadUrl,
  });

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: cmp.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: ui.brandName, item: canonicalUrl(lang, "") },
      { "@type": "ListItem", position: 2, name: cmp.title, item: canonicalUrl(lang, "vs-web-clippers") },
    ],
  };

  return renderShell({
    lang,
    slug: "vs-web-clippers",
    title: `${cmp.title} — ${ui.brandName}`,
    description: cmp.description,
    jsonLdItems: [appLd, faqLd, breadcrumbLd],
    releaseLive,
    networkItems,
    ogType: "article",
    mainHtml,
  });
}

export function renderSitemapXml() {
  const urls = [];
  for (const lang of SUPPORTED_LANGS) {
    for (const slug of ALL_PAGE_SLUGS) {
      const loc = canonicalUrl(lang, slug);
      const links = [
        ...SUPPORTED_LANGS.map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${canonicalUrl(alt, slug)}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalUrl(X_DEFAULT_LANG, slug)}"/>`,
      ].join("\n");
      urls.push(`  <url>\n    <loc>${loc}</loc>\n${links}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}

export function renderRobotsTxt() {
  return `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}

export function renderLlmsTxt({ releaseLive }) {
  return [
    "# Tiny Memo",
    "",
    "> Tiny Memo is a Chrome Manifest V3 browser extension for collecting selected web text snippets into clean Markdown lists, built by IF9 Studio LLC.",
    "",
    `- Canonical site: ${SITE_ORIGIN}/`,
    `- Status: ${releaseLive ? "Released" : "Pre-launch waitlist"}`,
    "- Capture triggers: Context menu, customizable shortcut (Alt+Q / MacCtrl+Q), inline selection buttons, and experimental per-site hover icons",
    "- Export format: Markdown bullet list (- snippet) with Copy as Markdown and Copy & Clear",
    "- Privacy: Local chrome.storage.local only; optional local TTS connects only to http://localhost:5020",
    `- Comparison: ${SITE_ORIGIN}/vs-web-clippers`,
  ].join("\n") + "\n";
}

export function renderRedirects() {
  return [
    "/en / 301",
    "/en/* /:splat 301",
    "/zh /zh-cn/ 301",
    "/zh/* /zh-cn/:splat 301",
    "/zh-CN /zh-cn/ 301",
    "/zh-CN/* /zh-cn/:splat 301",
    "/zh-TW /zh-tw/ 301",
    "/zh-TW/* /zh-tw/:splat 301",
  ].join("\n") + "\n";
}
