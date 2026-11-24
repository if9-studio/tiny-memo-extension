// popup.js - Tiny Memo extension popup UI controller with 8-language runtime i18n
document.addEventListener("DOMContentLoaded", async () => {
  const i18n = globalThis.TinyMemoI18n;
  const catalog = globalThis.__TINY_MEMO_CATALOG__ || {};

  const languageSelect = document.getElementById("languageSelect");
  const optLangSystem = document.getElementById("optLangSystem");
  const appBrandName = document.getElementById("appBrandName");
  const notesHeading = document.getElementById("notesHeading");
  const notesCountBadge = document.getElementById("notesCountBadge");
  const notesDisplay = document.getElementById("notesDisplay");
  const copyMarkdownBtn = document.getElementById("copyMarkdownBtn");
  const clearNotesBtn = document.getElementById("clearNotesBtn");
  const mergeMultilineCheckbox = document.getElementById("mergeMultilineCheckbox");
  const mergeMultilineLabel = document.getElementById("mergeMultilineLabel");
  const settingsHeading = document.getElementById("settingsHeading");
  const ttsVoiceLabel = document.getElementById("ttsVoiceLabel");
  const ttsVoiceSelect = document.getElementById("ttsVoiceSelect");
  const autoTtsCheckbox = document.getElementById("autoTtsCheckbox");
  const autoTtsLabel = document.getElementById("autoTtsLabel");
  const hoverButtonsCheckbox = document.getElementById("hoverButtonsCheckbox");
  const hoverButtonsLabel = document.getElementById("hoverButtonsLabel");
  const siteConfigHeading = document.getElementById("siteConfigHeading");
  const siteConfigList = document.getElementById("siteConfigList");
  const addSiteConfigBtn = document.getElementById("addSiteConfigBtn");
  const getCurrentSiteBtn = document.getElementById("getCurrentSiteBtn");
  const statusBanner = document.getElementById("statusBanner");
  const madeByIf9 = document.getElementById("madeByIf9");
  const websiteLink = document.getElementById("websiteLink");
  const websiteLinkLabel = document.getElementById("websiteLinkLabel");

  const configModal = document.getElementById("configModal");
  const modalTitle = document.getElementById("modalTitle");
  const domainInputLabel = document.getElementById("domainInputLabel");
  const domainInput = document.getElementById("domainInput");
  const selectorInputLabel = document.getElementById("selectorInputLabel");
  const selectorInput = document.getElementById("selectorInput");
  const modalStatus = document.getElementById("modalStatus");
  const saveConfigBtn = document.getElementById("saveConfigBtn");
  const cancelConfigBtn = document.getElementById("cancelConfigBtn");

  let activeLanguage = "en";
  let t = i18n.createTranslator(activeLanguage, catalog);
  let cachedNotesCount = 0;
  let cachedVoices = null;
  let cachedSelectedVoice = "zh-CN-XiaoxiaoNeural";
  let cachedSiteConfigs = [];
  let copyFeedbackTimeout = null;
  let statusBannerTimeout = null;

  function showStatus(message, kind = "info") {
    clearTimeout(statusBannerTimeout);
    statusBanner.textContent = message;
    statusBanner.dataset.kind = kind;
    statusBanner.hidden = false;
    statusBannerTimeout = setTimeout(() => {
      statusBanner.hidden = true;
    }, 3000);
  }

  function showModalError(message) {
    modalStatus.textContent = message;
    modalStatus.hidden = false;
  }

  function clearModalError() {
    modalStatus.textContent = "";
    modalStatus.hidden = true;
  }

  function updateNotesCountBadge() {
    notesCountBadge.textContent = t("popup.notesCount", { count: cachedNotesCount });
  }

  function applyTranslations() {
    t = i18n.createTranslator(activeLanguage, catalog);
    document.documentElement.lang = activeLanguage;
    document.title = t("popup.title");

    appBrandName.textContent = t("common.appName");
    languageSelect.setAttribute("aria-label", t("common.languageAria"));
    optLangSystem.textContent = t("common.languageSystem");

    notesHeading.textContent = t("popup.notesHeading");
    notesDisplay.placeholder = t("popup.notesPlaceholder");
    updateNotesCountBadge();

    settingsHeading.textContent = t("popup.settingsHeading");
    mergeMultilineLabel.textContent = t("popup.mergeMultiline");
    ttsVoiceLabel.textContent = t("popup.ttsVoiceLabel");
    autoTtsLabel.textContent = t("popup.autoTtsLabel");
    hoverButtonsLabel.textContent = t("popup.hoverButtonsLabel");

    siteConfigHeading.textContent = t("popup.siteConfigHeading");
    addSiteConfigBtn.textContent = t("popup.addSiteConfig");
    getCurrentSiteBtn.textContent = t("popup.getCurrentSite");

    copyMarkdownBtn.textContent = t("popup.copyMarkdown");
    clearNotesBtn.textContent = t("popup.copyAndClear");

    madeByIf9.innerHTML = i18n.renderBrandTextHtml(t("common.madeByIf9"));
    websiteLinkLabel.textContent = t("popup.websiteLink");
    websiteLink.title = t("popup.openWebsiteTitle");
    websiteLink.href = i18n.getWebsiteUrl(activeLanguage);

    modalTitle.textContent = t("siteConfigModal.title");
    domainInputLabel.textContent = t("siteConfigModal.domainLabel");
    domainInput.placeholder = t("siteConfigModal.domainPlaceholder");
    selectorInputLabel.textContent = t("siteConfigModal.selectorLabel");
    selectorInput.placeholder = t("siteConfigModal.selectorPlaceholder");
    cancelConfigBtn.textContent = t("common.cancel");
    saveConfigBtn.textContent = t("common.save");

    if (cachedVoices) {
      populateVoiceSelect(cachedVoices, cachedSelectedVoice);
    }
    renderSiteConfigs(cachedSiteConfigs);
  }

  async function initLanguage() {
    try {
      const stored = await chrome.storage.local.get(["appLanguage"]);
      const pref = i18n.normalizeLanguagePreference(stored?.appLanguage) || "system";
      languageSelect.value = pref;
      activeLanguage = await i18n.getActiveLanguage();
    } catch (error) {
      console.error("[Tiny Memo] Failed to load language preference:", error);
      languageSelect.value = "system";
      activeLanguage = i18n.resolveBrowserLanguage();
    }
    applyTranslations();
  }

  languageSelect.addEventListener("change", async () => {
    const selected = i18n.normalizeLanguagePreference(languageSelect.value) || "system";
    try {
      await chrome.storage.local.set({ appLanguage: selected });
      activeLanguage = await i18n.getActiveLanguage();
      applyTranslations();
    } catch (error) {
      console.error("[Tiny Memo] Failed to save language preference:", error);
    }
  });

  async function loadMergeSetting() {
    try {
      const data = await chrome.storage.local.get(["mergeMultilineSetting"]);
      mergeMultilineCheckbox.checked = data.mergeMultilineSetting === undefined ? true : data.mergeMultilineSetting;
    } catch (error) {
      console.error("[Tiny Memo] Failed to load merge setting:", error);
      mergeMultilineCheckbox.checked = true;
    }
  }

  mergeMultilineCheckbox.addEventListener("change", async () => {
    try {
      await chrome.storage.local.set({ mergeMultilineSetting: mergeMultilineCheckbox.checked });
    } catch (error) {
      console.error("[Tiny Memo] Failed to save merge setting:", error);
    }
  });

  async function loadAutoTtsSetting() {
    try {
      const data = await chrome.storage.local.get(["autoTtsSetting"]);
      autoTtsCheckbox.checked = data.autoTtsSetting === true;
    } catch (error) {
      console.error("[Tiny Memo] Failed to load auto-TTS setting:", error);
      autoTtsCheckbox.checked = false;
    }
  }

  autoTtsCheckbox.addEventListener("change", async () => {
    try {
      await chrome.storage.local.set({ autoTtsSetting: autoTtsCheckbox.checked });
    } catch (error) {
      console.error("[Tiny Memo] Failed to save auto-TTS setting:", error);
    }
  });

  async function loadHoverButtonsSetting() {
    try {
      const data = await chrome.storage.local.get(["hoverButtonsSetting"]);
      hoverButtonsCheckbox.checked = data.hoverButtonsSetting === true;
    } catch (error) {
      console.error("[Tiny Memo] Failed to load hover buttons setting:", error);
      hoverButtonsCheckbox.checked = false;
    }
  }

  hoverButtonsCheckbox.addEventListener("change", async () => {
    try {
      await chrome.storage.local.set({ hoverButtonsSetting: hoverButtonsCheckbox.checked });
    } catch (error) {
      console.error("[Tiny Memo] Failed to save hover buttons setting:", error);
    }
  });

  function getTtsLangDisplayName(langCode) {
    const key = `ttsLang.${langCode}`;
    const label = t(key);
    return label === key ? langCode : label;
  }

  function populateVoiceSelect(voices, currentVoice) {
    cachedVoices = voices;
    ttsVoiceSelect.innerHTML = "";

    const commonLanguages = ["zh", "en", "ja"];

    if (!voices || (typeof voices === "object" && !Array.isArray(voices) && Object.keys(voices).length === 0)) {
      const option = document.createElement("option");
      option.value = currentVoice;
      option.textContent = t("popup.ttsUnavailable");
      ttsVoiceSelect.appendChild(option);
      return;
    }

    if (!voices.zh && Array.isArray(voices)) {
      voices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name || voice;
        option.textContent = voice.displayName || voice.name || voice;
        if (option.value === currentVoice) option.selected = true;
        ttsVoiceSelect.appendChild(option);
      });
      return;
    }

    const appendGroup = (lang) => {
      if (!voices[lang] || voices[lang].length === 0) return;
      const optgroup = document.createElement("optgroup");
      optgroup.label = getTtsLangDisplayName(lang);
      voices[lang].forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = voice.displayName || voice.name;
        if (voice.name === currentVoice) option.selected = true;
        optgroup.appendChild(option);
      });
      ttsVoiceSelect.appendChild(optgroup);
    };

    commonLanguages.forEach(appendGroup);
    Object.keys(voices).forEach((lang) => {
      if (!commonLanguages.includes(lang)) appendGroup(lang);
    });
  }

  async function loadTtsVoices() {
    try {
      const settings = await chrome.storage.local.get(["ttsVoice"]);
      cachedSelectedVoice = settings.ttsVoice || "zh-CN-XiaoxiaoNeural";

      chrome.runtime.sendMessage({ type: "GET_TTS_VOICES" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("[Tiny Memo] Failed to fetch TTS voices:", chrome.runtime.lastError);
          populateVoiceSelect({}, cachedSelectedVoice);
          return;
        }
        if (response && response.success && response.voices) {
          populateVoiceSelect(response.voices, cachedSelectedVoice);
        } else {
          populateVoiceSelect({}, cachedSelectedVoice);
        }
      });
    } catch (error) {
      console.error("[Tiny Memo] Failed to load TTS voices:", error);
    }
  }

  ttsVoiceSelect.addEventListener("change", async () => {
    const selectedVoice = ttsVoiceSelect.value;
    if (selectedVoice) {
      cachedSelectedVoice = selectedVoice;
      try {
        await chrome.storage.local.set({ ttsVoice: selectedVoice });
      } catch (error) {
        console.error("[Tiny Memo] Failed to save TTS voice:", error);
      }
    }
  });

  async function loadNotes() {
    try {
      const data = await chrome.storage.local.get(["memoNotes"]);
      const notes = data.memoNotes || [];
      cachedNotesCount = notes.length;
      notesDisplay.value = notes.join("\n");
      updateNotesCountBadge();
    } catch (error) {
      console.error("[Tiny Memo] Failed to load notes:", error);
      cachedNotesCount = 0;
      notesDisplay.value = "";
      updateNotesCountBadge();
      showStatus(t("popup.loadNotesError"), "error");
    }
  }

  copyMarkdownBtn.addEventListener("click", async () => {
    try {
      const data = await chrome.storage.local.get(["memoNotes"]);
      const notes = data.memoNotes || [];
      if (notes.length === 0) {
        showStatus(t("popup.noNotesToCopy"), "error");
        return;
      }
      const markdownNotes = notes.map((note) => `- ${note}`).join("\n");
      await navigator.clipboard.writeText(markdownNotes);
      clearTimeout(copyFeedbackTimeout);
      copyMarkdownBtn.textContent = t("popup.copiedMarkdown");
      copyFeedbackTimeout = setTimeout(() => {
        copyMarkdownBtn.textContent = t("popup.copyMarkdown");
      }, 2000);
    } catch (error) {
      console.error("[Tiny Memo] Failed to copy notes:", error);
      showStatus(t("popup.copyFailed"), "error");
    }
  });

  clearNotesBtn.addEventListener("click", async () => {
    const currentNotesValue = notesDisplay.value;
    if (currentNotesValue === "") {
      showStatus(t("popup.noNotesToOperate"), "error");
      return;
    }

    try {
      const notesToCopy = currentNotesValue
        .split("\n")
        .map((note) => `- ${note}`)
        .join("\n");
      await navigator.clipboard.writeText(notesToCopy);

      const response = await chrome.runtime.sendMessage({ type: "COPY_AND_CLEAR_REQUEST" });
      if (response && response.success) {
        notesDisplay.value = "";
        cachedNotesCount = 0;
        updateNotesCountBadge();
        showStatus(t("popup.clearSuccess"), "success");
      } else {
        showStatus(response?.message || t("popup.clearError"), "error");
      }
    } catch (error) {
      console.error("[Tiny Memo] Error during copy & clear:", error);
      if (error?.message?.includes("clipboard.writeText")) {
        showStatus(t("popup.copyClipboardError"), "error");
      } else {
        showStatus(t("popup.actionError"), "error");
      }
    }
  });

  async function loadSiteConfigs() {
    try {
      const data = await chrome.storage.local.get(["siteConfigs"]);
      cachedSiteConfigs = data.siteConfigs || [];
      renderSiteConfigs(cachedSiteConfigs);
    } catch (error) {
      console.error("[Tiny Memo] Failed to load site configs:", error);
    }
  }

  function renderSiteConfigs(configs) {
    cachedSiteConfigs = configs;
    siteConfigList.innerHTML = "";
    if (!configs || configs.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "site-config-empty";
      emptyMsg.textContent = t("popup.siteConfigEmpty");
      siteConfigList.appendChild(emptyMsg);
      return;
    }

    configs.forEach((config, index) => {
      const configItem = document.createElement("div");
      configItem.className = "site-config-item";

      const configText = document.createElement("div");
      configText.className = "site-config-text";
      configText.textContent = `${config.domain} → ${config.selector}`;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete-rule-btn";
      deleteBtn.innerHTML = i18n.trash2Svg(13, 1.75);
      deleteBtn.title = t("popup.deleteSiteConfigTitle");
      deleteBtn.setAttribute("aria-label", t("popup.deleteSiteConfigTitle"));

      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSiteConfig(index);
      });

      configItem.appendChild(configText);
      configItem.appendChild(deleteBtn);
      siteConfigList.appendChild(configItem);
    });
  }

  async function deleteSiteConfig(index) {
    try {
      const data = await chrome.storage.local.get(["siteConfigs"]);
      const configs = data.siteConfigs || [];
      if (index >= 0 && index < configs.length) {
        configs.splice(index, 1);
        await chrome.storage.local.set({ siteConfigs: configs });
        renderSiteConfigs(configs);
      }
    } catch (error) {
      console.error("[Tiny Memo] Failed to delete site config:", error);
    }
  }

  async function addSiteConfig(domain, selector) {
    try {
      if (!domain || !selector) return false;
      const data = await chrome.storage.local.get(["siteConfigs"]);
      const configs = data.siteConfigs || [];
      const exists = configs.some((config) => config.domain === domain && config.selector === selector);

      if (!exists) {
        configs.push({ domain, selector });
        await chrome.storage.local.set({ siteConfigs: configs });
        renderSiteConfigs(configs);
        return true;
      }
      showModalError(t("siteConfigModal.alreadyExists"));
      return false;
    } catch (error) {
      console.error("[Tiny Memo] Failed to add site config:", error);
      return false;
    }
  }

  addSiteConfigBtn.addEventListener("click", () => {
    domainInput.value = "";
    selectorInput.value = "";
    clearModalError();
    configModal.hidden = false;
  });

  getCurrentSiteBtn.addEventListener("click", async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].url) {
        const url = new URL(tabs[0].url);
        domainInput.value = url.hostname;
        selectorInput.value = "";
        clearModalError();
        configModal.hidden = false;
      } else {
        showStatus(t("siteConfigModal.currentSiteError"), "error");
      }
    } catch (error) {
      console.error("[Tiny Memo] Failed to read current site:", error);
      showStatus(t("siteConfigModal.currentSiteError"), "error");
    }
  });

  saveConfigBtn.addEventListener("click", async () => {
    clearModalError();
    const domain = domainInput.value.trim();
    const selector = selectorInput.value.trim();

    if (!domain) {
      showModalError(t("siteConfigModal.domainRequired"));
      return;
    }
    if (!selector) {
      showModalError(t("siteConfigModal.selectorRequired"));
      return;
    }

    const success = await addSiteConfig(domain, selector);
    if (success) {
      configModal.hidden = true;
    }
  });

  cancelConfigBtn.addEventListener("click", () => {
    configModal.hidden = true;
  });

  configModal.addEventListener("click", (e) => {
    if (e.target === configModal) {
      configModal.hidden = true;
    }
  });

  await initLanguage();
  await Promise.all([
    loadNotes(),
    loadMergeSetting(),
    loadAutoTtsSetting(),
    loadHoverButtonsSetting(),
    loadSiteConfigs(),
  ]);
  loadTtsVoices();

  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace !== "local") return;
    if (changes.appLanguage) {
      const pref = i18n.normalizeLanguagePreference(changes.appLanguage.newValue) || "system";
      languageSelect.value = pref;
      activeLanguage = await i18n.getActiveLanguage();
      applyTranslations();
    }
    if (changes.memoNotes) {
      loadNotes();
    }
    if (changes.mergeMultilineSetting) {
      loadMergeSetting();
    }
    if (changes.ttsVoice) {
      cachedSelectedVoice = changes.ttsVoice.newValue;
      if (ttsVoiceSelect.value !== cachedSelectedVoice) {
        const matching = Array.from(ttsVoiceSelect.options).find((opt) => opt.value === cachedSelectedVoice);
        if (matching) matching.selected = true;
      }
    }
    if (changes.autoTtsSetting) {
      autoTtsCheckbox.checked = changes.autoTtsSetting.newValue === true;
    }
    if (changes.hoverButtonsSetting) {
      hoverButtonsCheckbox.checked = changes.hoverButtonsSetting.newValue === true;
    }
    if (changes.siteConfigs) {
      renderSiteConfigs(changes.siteConfigs.newValue || []);
    }
  });
});
