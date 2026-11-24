// Edge worker: single-hop 301 canonical redirects (/en, /en/*, /zh, /zh-CN, /zh-TW, ?lang=) with zero Set-Cookie / Vary: Cookie.
import { localePath, normalizeLocale } from "./brand.mjs";

const STATIC_BYPASS_PATHS = new Set(["/sitemap.xml", "/robots.txt", "/llms.txt", "/favicon.ico", "/_redirects"]);

function parsePathLocaleAndSlug(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return { pathLang: "en", slug: "", hasLocaleSegment: false };
  }
  const matched = normalizeLocale(segments[0]);
  if (matched) {
    return {
      pathLang: matched,
      slug: segments.slice(1).join("/"),
      hasLocaleSegment: true,
    };
  }
  return {
    pathLang: "en",
    slug: segments.join("/"),
    hasLocaleSegment: false,
  };
}

/** Compute single-hop 301 canonical target URL, or null when request is already canonical. */
export function resolveCanonicalRedirect(inputUrl) {
  const url = inputUrl instanceof URL ? new URL(inputUrl.toString()) : new URL(String(inputUrl));
  const hasLangQuery = url.searchParams.has("lang");

  if (!hasLangQuery && (url.pathname.startsWith("/assets/") || STATIC_BYPASS_PATHS.has(url.pathname))) {
    return null;
  }

  const { pathLang, slug, hasLocaleSegment } = parsePathLocaleAndSlug(url.pathname);
  const queryLangRaw = url.searchParams.get("lang");
  const queryLang = queryLangRaw !== null ? normalizeLocale(queryLangRaw) : null;
  const targetLang = queryLang ?? pathLang;
  const canonicalPathname = localePath(targetLang, slug);

  const needsRedirect =
    hasLangQuery ||
    (hasLocaleSegment && url.pathname !== canonicalPathname) ||
    (!hasLocaleSegment && slug !== "" && url.pathname !== canonicalPathname);

  if (!needsRedirect) return null;

  const target = new URL(url.toString());
  target.pathname = canonicalPathname;
  target.searchParams.delete("lang");
  return target.toString();
}

export default {
  async fetch(request, env) {
    const redirectLocation = resolveCanonicalRedirect(request.url);
    if (redirectLocation) {
      return new Response(null, {
        status: 301,
        headers: {
          Location: redirectLocation,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
