// Tiny Memo website client script: theme toggle, orderLocales, mobile menu, prelaunch release-status & waitlist.
(() => {
  const root = document.documentElement;
  const SUPPORTED = ["en", "ja", "zh-CN", "zh-TW", "ko", "de", "fr", "es"];

  const TEXT = {
    en: {
      theme: { dark: "Switch to Light paper mode", light: "Switch to Dark editor mode" },
      waitlist: {
        sending: "Saving…",
        ok: "You're on the list. We'll send one email when Tiny Memo launches on the Chrome Web Store.",
        invalid: "Please enter a valid email address.",
        error: "Couldn't save right now. Try again shortly or email hello@if9.cool.",
      },
    },
    ja: {
      theme: { dark: "ライト表示に切り替え", light: "ダーク表示に切り替え" },
      waitlist: {
        sending: "送信中…",
        ok: "登録しました。Tiny Memo の Chrome ウェブストア公開当日にメールで 1 通だけお知らせします。",
        invalid: "有効なメールアドレスを入力してください。",
        error: "現在送信できません。しばらくしてから再度お試しいただくか hello@if9.cool までご連絡ください。",
      },
    },
    "zh-CN": {
      theme: { dark: "切换到浅色纸本", light: "切换到深色编辑器" },
      waitlist: {
        sending: "提交中…",
        ok: "已登记！Tiny Memo 上架 Chrome 应用商店当天我们会给你发一封通知邮件。",
        invalid: "请填写有效的邮箱地址。",
        error: "暂时无法提交，请稍后再试或写信至 hello@if9.cool。",
      },
    },
    "zh-TW": {
      theme: { dark: "切換到淺色紙本", light: "切換到深色編輯器" },
      waitlist: {
        sending: "傳送中…",
        ok: "已登記！Tiny Memo 上架 Chrome 線上應用程式商店當天我們會寄給你一封通知信。",
        invalid: "請輸入有效的電子郵件地址。",
        error: "目前無法送出，請稍後再試或來信至 hello@if9.cool。",
      },
    },
    ko: {
      theme: { dark: "라이트 모드로 전환", light: "다크 모드로 전환" },
      waitlist: {
        sending: "저장 중…",
        ok: "등록되었습니다! Tiny Memo Chrome 웹 스토어 출시 당일 이메일 한 통으로 알려드립니다.",
        invalid: "유효한 이메일 주소를 입력해 주세요.",
        error: "지금 저장할 수 없습니다. 잠시 후 다시 시도하거나 hello@if9.cool로 문의해 주세요.",
      },
    },
    de: {
      theme: { dark: "Zum hellen Modus wechseln", light: "Zum dunklen Editor-Modus wechseln" },
      waitlist: {
        sending: "Wird gespeichert …",
        ok: "Du stehst auf der Liste! Wir senden genau eine E-Mail zum Start von Tiny Memo im Chrome Web Store.",
        invalid: "Bitte gib eine gültige E-Mail-Adresse ein.",
        error: "Speichern gerade nicht möglich. Bitte erneut versuchen oder an hello@if9.cool schreiben.",
      },
    },
    fr: {
      theme: { dark: "Passer au thème clair", light: "Passer au thème sombre" },
      waitlist: {
        sending: "Enregistrement…",
        ok: "C’est noté ! Vous recevrez un seul e-mail dès le lancement de Tiny Memo sur le Chrome Web Store.",
        invalid: "Veuillez saisir une adresse e-mail valide.",
        error: "Impossible d’enregistrer pour le moment. Réessayez ou écrivez à hello@if9.cool.",
      },
    },
    es: {
      theme: { dark: "Cambiar a modo claro", light: "Cambiar a modo oscuro" },
      waitlist: {
        sending: "Guardando…",
        ok: "¡Apuntado! Te enviaremos un único correo cuando Tiny Memo llegue a Chrome Web Store.",
        invalid: "Introduce una dirección de correo válida.",
        error: "No se pudo guardar ahora mismo. Inténtalo de nuevo o escribe a hello@if9.cool.",
      },
    },
  };

  const TIMEZONE_LOCALE_HINTS = {
    "Asia/Tokyo": "ja",
    "Asia/Seoul": "ko",
    "Asia/Shanghai": "zh-CN",
    "Asia/Chongqing": "zh-CN",
    "Asia/Taipei": "zh-TW",
    "Asia/Hong_Kong": "zh-TW",
    "Asia/Macau": "zh-TW",
    "Europe/Berlin": "de",
    "Europe/Vienna": "de",
    "Europe/Zurich": "de",
    "Europe/Paris": "fr",
    "Europe/Madrid": "es",
  };

  const normalizeLocale = (raw) => {
    if (typeof raw !== "string") return null;
    const clean = raw.trim().toLowerCase().replace(/_/g, "-");
    if (!clean) return null;
    const parts = clean.split("-").filter(Boolean);
    if (!parts.length) return null;
    if (parts[0] === "zh") {
      return parts.some((p) => p === "tw" || p === "hk" || p === "mo" || p === "hant") ? "zh-TW" : "zh-CN";
    }
    return SUPPORTED.find((code) => code.toLowerCase() === parts[0]) || null;
  };

  const orderLocales = () => {
    const preferred = [];
    const pushUnique = (code) => {
      if (code && SUPPORTED.includes(code) && !preferred.includes(code)) preferred.push(code);
    };
    const navLangs = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    navLangs.forEach((tag) => pushUnique(normalizeLocale(tag)));
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && TIMEZONE_LOCALE_HINTS[tz]) pushUnique(TIMEZONE_LOCALE_HINTS[tz]);
    } catch {
      /* ignore unavailable timezone */
    }
    const finalOrder = [...preferred, ...SUPPORTED.filter((code) => !preferred.includes(code))];
    document.querySelectorAll("[data-lang-list]").forEach((list) => {
      const byCode = new Map(
        [...list.querySelectorAll("li[data-locale]")].map((li) => [li.getAttribute("data-locale"), li])
      );
      if (byCode.size !== SUPPORTED.length) return;
      finalOrder.forEach((code) => {
        const item = byCode.get(code);
        if (item) list.appendChild(item);
      });
    });
  };
  orderLocales();

  const RELEASE_STATUS_API = "https://if9.cool/api/public/release-status?app=tiny-memo&platform=extension";
  const WAITLIST_API = "https://if9.cool/api/public/waitlist";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const pageLang = () => (root.lang in TEXT ? root.lang : "en");
  const strings = () => TEXT[pageLang()];

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
  };

  const applyTheme = (mode) => {
    root.setAttribute("data-theme", mode);
    const label = strings().theme[mode];
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
    });
  };
  let themeMode = store.get("tiny-memo-site-theme") === "light" ? "light" : "dark";
  applyTheme(themeMode);

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-theme-toggle]")) return;
    themeMode = themeMode === "dark" ? "light" : "dark";
    store.set("tiny-memo-site-theme", themeMode);
    applyTheme(themeMode);
  });

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-menu-toggle]");
    const header = document.querySelector(".site-header");
    if (header) {
      if (toggle) {
        const open = !header.hasAttribute("data-open");
        header.toggleAttribute("data-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      } else if (event.target.closest(".nav a")) {
        header.removeAttribute("data-open");
      }
    }
    const activeLangMenu = event.target.closest("[data-lang-menu]");
    document.querySelectorAll("[data-lang-menu][open]").forEach((menu) => {
      if (menu !== activeLangMenu) menu.removeAttribute("open");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll("[data-lang-menu][open]").forEach((menu) => menu.removeAttribute("open"));
    }
  });

  const syncLiveDownloadLinks = (statusData) => {
    if (typeof statusData?.downloadUrl === "string" && statusData.downloadUrl.startsWith("https://")) {
      document.querySelectorAll("[data-release-download]").forEach((a) => a.setAttribute("href", statusData.downloadUrl));
    }
  };

  if ("fetch" in window) {
    fetch(RELEASE_STATUS_API, { credentials: "omit" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || typeof data.live !== "boolean") return;
        const nextState = data.live ? "live" : "waitlist";
        root.setAttribute("data-release-state", nextState);
        document.querySelectorAll("[data-prelaunch-root]").forEach((el) => {
          el.setAttribute("data-release-state", nextState);
        });
        if (nextState === "live") syncLiveDownloadLinks(data);
      })
      .catch(() => { /* keep build-time state */ });
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-waitlist-form]");
    if (!form) return;
    event.preventDefault();
    const T = strings().waitlist;
    const input = form.querySelector("input[type='email']");
    const btn = form.querySelector("button[type='submit']");
    const msg = form.parentElement?.querySelector("[data-waitlist-msg]");
    if (!input || !btn || !msg) return;

    const email = input.value.trim();
    if (!EMAIL_RE.test(email)) {
      msg.setAttribute("data-kind", "err");
      msg.textContent = T.invalid;
      input.focus();
      return;
    }

    const prelaunchRoot = form.closest("[data-prelaunch-root]");
    const app = prelaunchRoot?.dataset.app || "tiny-memo";
    const platform = prelaunchRoot?.dataset.platform || "extension";

    const defaultLabel = btn.getAttribute("data-label") || btn.textContent;
    btn.disabled = true;
    btn.textContent = T.sending;
    msg.removeAttribute("data-kind");
    msg.textContent = "";

    try {
      const res = await fetch(WAITLIST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ app, platform, email, locale: pageLang() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      msg.setAttribute("data-kind", "ok");
      msg.textContent = T.ok;
      input.value = "";
      btn.textContent = defaultLabel;
    } catch {
      msg.setAttribute("data-kind", "err");
      msg.textContent = T.error;
      btn.disabled = false;
      btn.textContent = defaultLabel;
    }
  });
})();
