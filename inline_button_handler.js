// inline_button_handler.js - Selection floating actions & optional hover block icons with 8-language i18n
(() => {
  const i18n = globalThis.TinyMemoI18n;
  const catalog = globalThis.__TINY_MEMO_CATALOG__ || {};
  let activeLanguage = i18n ? i18n.resolveBrowserLanguage() : "en";
  let t = i18n ? i18n.createTranslator(activeLanguage, catalog) : (k) => k;

  let memoButton = null;
  let ttsButton = null;
  let hoverMemoIcon = null;
  let hoverTtsIcon = null;

  const SELECTION_BUTTON_ID = "tiny-memo-selection-button";
  const SELECTION_TTS_BUTTON_ID = "tiny-memo-selection-tts-button";
  const HOVER_MEMO_ICON_ID = "tiny-memo-hover-memo-icon";
  const HOVER_TTS_ICON_ID = "tiny-memo-hover-tts-icon";
  const HOVER_CONTAINER_CLASS = "tiny-memo-hover-container";

  const ADD_NOTE_ICON_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="12" y1="18" x2="12" y2="12"></line>
      <line x1="9" y1="15" x2="15" y2="15"></line>
    </svg>`;

  const PLAY_TTS_ICON_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>`;

  let autoTtsEnabled = false;
  let hoverButtonsEnabled = false;
  let isAutoTtsPlaying = false;
  let lastHoveredElement = null;
  let hideHoverIconsTimeout = null;
  let iconsContainer = null;
  let siteConfigs = [];
  let currentHoverElement = null;
  let domMutationTimeout = null;

  function applyInlineTranslations() {
    if (!i18n) return;
    t = i18n.createTranslator(activeLanguage, catalog);
    if (memoButton) {
      memoButton.textContent = t("inline.addToMemo");
      memoButton.setAttribute("aria-label", t("inline.addToMemo"));
    }
    if (ttsButton) {
      ttsButton.textContent = t("inline.playVoice");
      ttsButton.setAttribute("aria-label", t("inline.playVoice"));
    }
    if (hoverMemoIcon) {
      hoverMemoIcon.title = t("inline.addToMemo");
      hoverMemoIcon.setAttribute("aria-label", t("inline.addToMemo"));
    }
    if (hoverTtsIcon) {
      hoverTtsIcon.title = t("inline.playVoice");
      hoverTtsIcon.setAttribute("aria-label", t("inline.playVoice"));
    }
  }

  async function refreshActiveLanguage() {
    if (!i18n) return;
    activeLanguage = await i18n.getActiveLanguage();
    applyInlineTranslations();
  }

  chrome.storage.local.get(["autoTtsSetting", "hoverButtonsSetting", "siteConfigs", "appLanguage"], async (result) => {
    autoTtsEnabled = result.autoTtsSetting === true;
    hoverButtonsEnabled = result.hoverButtonsSetting === true;
    siteConfigs = result.siteConfigs || [];
    await refreshActiveLanguage();
  });

  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace !== "local") return;
    if (changes.appLanguage) {
      await refreshActiveLanguage();
    }
    if (changes.autoTtsSetting) {
      autoTtsEnabled = changes.autoTtsSetting.newValue === true;
    }
    if (changes.hoverButtonsSetting) {
      hoverButtonsEnabled = changes.hoverButtonsSetting.newValue === true;
      if (!hoverButtonsEnabled) {
        hideHoverIcons();
      }
    }
    if (changes.siteConfigs) {
      siteConfigs = changes.siteConfigs.newValue || [];
    }
  });

  function createSelectionButton(id, text, borderColor) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    button.textContent = text;
    button.setAttribute("aria-label", text);
    Object.assign(button.style, {
      position: "absolute",
      zIndex: "2147483646",
      backgroundColor: "#282c34",
      color: "white",
      border: `1px solid ${borderColor}`,
      borderRadius: "4px",
      padding: "5px 8px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
      display: "none",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(button);
    return button;
  }

  function createIconsContainer() {
    if (iconsContainer) return iconsContainer;

    const container = document.createElement("span");
    container.className = HOVER_CONTAINER_CLASS;
    container.dataset.tinyMemoContainer = "true";
    Object.assign(container.style, {
      display: "inline-block",
      position: "absolute",
      zIndex: "2147483646",
      backgroundColor: "rgba(0,0,0,0.2)",
      borderRadius: "4px",
      padding: "2px 4px",
      right: "10px",
      top: "0",
      verticalAlign: "middle",
      lineHeight: "1",
      pointerEvents: "auto",
    });

    container.addEventListener("mouseenter", () => {
      clearTimeout(hideHoverIconsTimeout);
    });

    container.addEventListener("mouseleave", () => {
      if (lastHoveredElement && !lastHoveredElement.contains(container)) {
        scheduleHideHoverIcons();
      }
    });

    iconsContainer = container;
    return container;
  }

  function createHoverIcon(id, svgIcon, label) {
    const iconSpan = document.createElement("span");
    iconSpan.id = id;
    iconSpan.innerHTML = svgIcon;
    iconSpan.title = label;
    iconSpan.setAttribute("role", "button");
    iconSpan.setAttribute("aria-label", label);
    iconSpan.dataset.tinyMemoIcon = "true";
    Object.assign(iconSpan.style, {
      cursor: "pointer",
      marginLeft: "4px",
      marginRight: "4px",
      verticalAlign: "middle",
      display: "inline-block",
      lineHeight: "1",
      padding: "2px",
    });
    return iconSpan;
  }

  function getSelectionMemoButton() {
    if (!memoButton) {
      memoButton = createSelectionButton(SELECTION_BUTTON_ID, t("inline.addToMemo"), "#4CAF50");
      memoButton.addEventListener("click", (event) => handleMemoButtonClick(event, window.getSelection().toString().trim(), true));
    }
    return memoButton;
  }

  function getSelectionTtsButton() {
    if (!ttsButton) {
      ttsButton = createSelectionButton(SELECTION_TTS_BUTTON_ID, t("inline.playVoice"), "#4285f4");
      ttsButton.addEventListener("click", (event) => handleTtsButtonClick(event, window.getSelection().toString().trim()));
    }
    return ttsButton;
  }

  function getHoverMemoIcon() {
    if (!hoverMemoIcon) {
      hoverMemoIcon = createHoverIcon(HOVER_MEMO_ICON_ID, ADD_NOTE_ICON_SVG, t("inline.addToMemo"));
      hoverMemoIcon.addEventListener("click", (event) => {
        if (lastHoveredElement) {
          handleMemoButtonClick(event, lastHoveredElement.innerText.trim(), false);
        }
      });
    }
    return hoverMemoIcon;
  }

  function getHoverTtsIcon() {
    if (!hoverTtsIcon) {
      hoverTtsIcon = createHoverIcon(HOVER_TTS_ICON_ID, PLAY_TTS_ICON_SVG, t("inline.playVoice"));
      hoverTtsIcon.addEventListener("click", (event) => {
        if (lastHoveredElement) {
          handleTtsButtonClick(event, lastHoveredElement.innerText.trim());
        }
      });
    }
    return hoverTtsIcon;
  }

  function handleMemoButtonClick(event, text, fromSelection) {
    event.stopPropagation();
    event.preventDefault();

    if (text) {
      try {
        if (!chrome || !chrome.runtime) {
          showTtsErrorNotification(t("inline.runtimeUnavailable"));
          return;
        }

        chrome.runtime.sendMessage({ type: "SELECTION_FROM_CONTENT_SCRIPT", text }, () => {
          if (chrome.runtime.lastError) {
            showTtsErrorNotification(t("inline.addNoteFailed", { error: chrome.runtime.lastError.message }));
            return;
          }
          if (!fromSelection) {
            showTemporarySuccessInIcon(event.currentTarget);
          }
        });
      } catch (error) {
        showTtsErrorNotification(t("inline.addNoteError", { error: error.message }));
      }
    }

    if (fromSelection) {
      hideSelectionButtons();
    } else {
      hideHoverIcons();
    }
  }

  function showTemporarySuccessInIcon(iconElement) {
    const originalIcon = iconElement.innerHTML;
    iconElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    setTimeout(() => {
      if (document.body.contains(iconElement)) {
        iconElement.innerHTML = originalIcon;
      }
    }, 1500);
  }

  async function handleTtsButtonClick(event, text) {
    event.stopPropagation();
    event.preventDefault();

    if (text) {
      try {
        if (!chrome || !chrome.runtime) {
          showTtsErrorNotification(t("inline.runtimeUnavailable"));
          return;
        }

        chrome.runtime.sendMessage({ type: "TTS_REQUEST", text }, (response) => {
          if (chrome.runtime.lastError) {
            showTtsErrorNotification(t("inline.ttsRequestFailed", { error: chrome.runtime.lastError.message }));
          } else if (response && response.success && response.audio_url) {
            playTtsAudio(response.audio_url);
          } else {
            showTtsErrorNotification(
              t("inline.ttsGenerateFailed", { error: response?.error || t("inline.ttsUnknownError") })
            );
          }
        });
      } catch (error) {
        showTtsErrorNotification(t("inline.ttsRequestError", { error: error.message }));
      }
    }
  }

  function playTtsAudio(audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch((error) => {
      console.error("[Tiny Memo] Error playing audio:", error);
      showTtsErrorNotification(t("inline.audioPlayFailed"));
    });
  }

  function requestAndPlayTts(text) {
    if (!text || isAutoTtsPlaying) return;
    isAutoTtsPlaying = true;

    try {
      if (!chrome || !chrome.runtime) {
        isAutoTtsPlaying = false;
        return;
      }

      chrome.runtime.sendMessage({ type: "TTS_REQUEST", text }, (response) => {
        isAutoTtsPlaying = false;
        if (!chrome.runtime.lastError && response && response.success && response.audio_url) {
          playTtsAudio(response.audio_url);
        }
      });
    } catch (_error) {
      isAutoTtsPlaying = false;
    }
  }

  function showSelectionButtons(x, y) {
    const mButton = getSelectionMemoButton();
    const tButton = getSelectionTtsButton();
    mButton.style.left = `${x + 5}px`;
    mButton.style.top = `${y + window.scrollY - 5}px`;
    mButton.style.display = "block";

    const memoWidth = mButton.getBoundingClientRect().width;
    tButton.style.left = `${x + 15 + memoWidth}px`;
    tButton.style.top = `${y + window.scrollY - 5}px`;
    tButton.style.display = "block";
  }

  function hideSelectionButtons() {
    if (memoButton && memoButton.style.display !== "none") memoButton.style.display = "none";
    if (ttsButton && ttsButton.style.display !== "none") ttsButton.style.display = "none";
  }

  function showHoverIcons(element) {
    if (!hoverButtonsEnabled || !element || !element.parentNode) return;
    if (element.querySelector(`.${HOVER_CONTAINER_CLASS}`)) return;
    if (lastHoveredElement === element && document.querySelector(`.${HOVER_CONTAINER_CLASS}`)) {
      clearTimeout(hideHoverIconsTimeout);
      return;
    }

    hideHoverIcons();
    lastHoveredElement = element;
    clearTimeout(hideHoverIconsTimeout);

    const container = createIconsContainer();
    container.appendChild(getHoverMemoIcon());
    container.appendChild(getHoverTtsIcon());

    try {
      const originalPosition = element.style.position;
      if (originalPosition !== "absolute" && originalPosition !== "fixed" && originalPosition !== "relative") {
        element.style.position = "relative";
      }
      element.appendChild(container);
    } catch (error) {
      console.error("[Tiny Memo] Failed to attach hover icons:", error);
    }
  }

  function scheduleHideHoverIcons() {
    clearTimeout(hideHoverIconsTimeout);
    hideHoverIconsTimeout = setTimeout(() => {
      hideHoverIcons();
    }, 500);
  }

  function hideHoverIcons() {
    const container = document.querySelector(`.${HOVER_CONTAINER_CLASS}`);
    if (container) {
      container.remove();
    }
    lastHoveredElement = null;
    currentHoverElement = null;
  }

  function isOwnControl(target) {
    if (!target) return false;
    return Boolean(
      target.dataset?.tinyMemoIcon ||
        target.dataset?.tinyMemoContainer ||
        target.closest?.(`[data-tiny-memo-icon="true"]`) ||
        target.closest?.(`.${HOVER_CONTAINER_CLASS}`) ||
        target.id === SELECTION_BUTTON_ID ||
        target.id === SELECTION_TTS_BUTTON_ID
    );
  }

  document.addEventListener("mouseup", (event) => {
    if (isOwnControl(event.target)) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      hideHoverIcons();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showSelectionButtons(rect.right, rect.bottom);
      if (autoTtsEnabled) {
        requestAndPlayTts(selectedText);
      }
    } else {
      hideSelectionButtons();
    }
  });

  document.addEventListener(
    "mousedown",
    (event) => {
      if (isOwnControl(event.target)) return;
      if ((memoButton && memoButton.style.display === "block") || (ttsButton && ttsButton.style.display === "block")) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.getRangeAt(0).toString().trim()) {
          hideSelectionButtons();
        }
      }
    },
    true
  );

  let selectionHideTimeout = null;
  document.addEventListener("selectionchange", () => {
    clearTimeout(selectionHideTimeout);
    selectionHideTimeout = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.getRangeAt(0).toString().trim()) {
        if (!isOwnControl(document.activeElement)) {
          hideSelectionButtons();
        }
      }
    }, 150);
  });

  document.addEventListener("mouseover", (event) => {
    if (!hoverButtonsEnabled) return;

    if (isOwnControl(event.target)) {
      clearTimeout(hideHoverIconsTimeout);
      return;
    }

    const target = findHoverableParent(event.target);
    if (target) {
      if (currentHoverElement === target && document.querySelector(`.${HOVER_CONTAINER_CLASS}`)) {
        clearTimeout(hideHoverIconsTimeout);
        return;
      }
      if (currentHoverElement && currentHoverElement !== target) {
        hideHoverIcons();
      }
      currentHoverElement = target;
      showHoverIcons(target);
    }
  });

  function matchesConfiguredSelector(element) {
    if (!siteConfigs || siteConfigs.length === 0) {
      return true;
    }

    const currentDomain = window.location.hostname;
    const matchingConfigs = siteConfigs.filter(
      (config) => currentDomain === config.domain || currentDomain.endsWith(`.${config.domain}`) || config.domain === "*"
    );

    if (matchingConfigs.length === 0) {
      return false;
    }

    for (const config of matchingConfigs) {
      try {
        if (config.selector === "*") return true;
        if (element.matches(config.selector)) return true;
        if (element.closest(config.selector)) return true;
        if (element.querySelector(config.selector)) return true;
      } catch (error) {
        console.error("[Tiny Memo] Invalid CSS selector:", config.selector, error);
      }
    }

    return false;
  }

  function findHoverableParent(element) {
    if (!element || isOwnControl(element)) {
      return null;
    }
    if (element.dataset?.tinyMemoScanned) {
      return element;
    }
    const markedParent = element.closest?.('[data-tiny-memo-scanned="true"]');
    if (markedParent) {
      return markedParent;
    }

    let current = element;
    while (current && current !== document.body) {
      if (
        current.tagName &&
        ["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "ARTICLE", "SECTION"].includes(current.tagName.toUpperCase()) &&
        current.innerText &&
        current.innerText.trim().length > 10 &&
        current.offsetHeight > 0 &&
        current.offsetWidth > 0 &&
        !current.isContentEditable &&
        !current.contains(document.querySelector(`.${HOVER_CONTAINER_CLASS}`)) &&
        window.getComputedStyle(current).visibility !== "hidden" &&
        window.getComputedStyle(current).display !== "none" &&
        !current.closest("button, input, textarea, select, a[href], label, summary") &&
        matchesConfiguredSelector(current)
      ) {
        current.dataset.tinyMemoScanned = "true";
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  document.addEventListener("mouseout", (event) => {
    if (!hoverButtonsEnabled) return;
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && isOwnControl(relatedTarget)) {
      return;
    }
    if (currentHoverElement) {
      if (currentHoverElement.contains(relatedTarget)) {
        return;
      }
      const targetHoverable = findHoverableParent(relatedTarget);
      if (!targetHoverable) {
        scheduleHideHoverIcons();
      }
    }
  });

  getSelectionMemoButton();
  getSelectionTtsButton();

  function setupMutationObserver() {
    if (!document.body) return;
    const observer = new MutationObserver((mutations) => {
      if (!hoverButtonsEnabled) return;

      let shouldScan = false;
      const addedNodes = [];
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldScan = true;
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) addedNodes.push(node);
          });
        }
      }

      if (shouldScan && addedNodes.length > 0) {
        clearTimeout(domMutationTimeout);
        domMutationTimeout = setTimeout(() => {
          processNewElements(addedNodes);
          scanPageForHoverableElements();
        }, 300);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function processNewElements(nodes) {
    if (!nodes || nodes.length === 0) return;

    const currentDomain = window.location.hostname;
    const matchingConfigs = siteConfigs.filter(
      (config) => currentDomain === config.domain || currentDomain.endsWith(`.${config.domain}`) || config.domain === "*"
    );

    if (matchingConfigs.length === 0 && siteConfigs.length > 0) return;

    matchingConfigs.forEach((config) => {
      try {
        if (config.selector && config.selector !== "*") {
          nodes.forEach((node) => {
            try {
              if (node.matches && node.matches(config.selector)) {
                processContainerForTextElements(node);
              }
            } catch (_e) {
              // Ignore selector matching errors
            }
            try {
              if (node.querySelectorAll) {
                node.querySelectorAll(config.selector).forEach((el) => processContainerForTextElements(el));
              }
            } catch (_e) {
              // Ignore selector query errors
            }
            try {
              const container = node.closest && node.closest(config.selector);
              if (container && node.innerText && node.innerText.trim().length > 10) {
                if (!node.dataset.tinyMemoScanned && !node.isContentEditable && node.offsetHeight > 0 && node.offsetWidth > 0) {
                  node.dataset.tinyMemoScanned = "true";
                }
              }
            } catch (_e) {
              // Ignore closest lookup errors
            }
          });
        }
      } catch (error) {
        console.error("[Tiny Memo] Error processing new elements:", error);
      }
    });
  }

  function scanPageForHoverableElements() {
    if (!hoverButtonsEnabled) return;

    const currentDomain = window.location.hostname;
    const matchingConfigs = siteConfigs.filter(
      (config) => currentDomain === config.domain || currentDomain.endsWith(`.${config.domain}`) || config.domain === "*"
    );

    if (matchingConfigs.length === 0 && siteConfigs.length > 0) return;

    matchingConfigs.forEach((config) => {
      try {
        if (config.selector && config.selector !== "*") {
          document.querySelectorAll(config.selector).forEach((container) => {
            processContainerForTextElements(container);
          });
        }
      } catch (error) {
        console.error("[Tiny Memo] Error scanning page elements:", error);
      }
    });
  }

  function processContainerForTextElements(container) {
    if (!container) return;
    const textElementTags = ["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "DIV", "SPAN", "ARTICLE", "SECTION"];
    const potentialTextElements = [];

    textElementTags.forEach((tag) => {
      container.querySelectorAll(`:scope > ${tag}, ${tag}`).forEach((el) => {
        if (el.innerText && el.innerText.trim().length > 10) {
          potentialTextElements.push(el);
        }
      });
    });

    function findTextElements(element) {
      if (!element || element.nodeType !== 1) return;
      if (element.innerText && element.innerText.trim().length > 10 && !potentialTextElements.includes(element)) {
        potentialTextElements.push(element);
      }
      if (element.children && element.children.length > 0) {
        Array.from(element.children).forEach((child) => findTextElements(child));
      }
    }

    findTextElements(container);
    potentialTextElements.forEach((element) => markAsHoverable(element));
  }

  function markAsHoverable(element) {
    if (!element) return;
    try {
      if (
        !element.dataset.tinyMemoScanned &&
        !element.querySelector(`.${HOVER_CONTAINER_CLASS}`) &&
        !element.isContentEditable &&
        element.offsetHeight > 0 &&
        element.offsetWidth > 0 &&
        window.getComputedStyle(element).visibility !== "hidden" &&
        window.getComputedStyle(element).display !== "none" &&
        !element.closest("button, input, textarea, select, a[href], label, summary")
      ) {
        element.dataset.tinyMemoScanned = "true";
      }
    } catch (error) {
      console.error("[Tiny Memo] Error marking element as hoverable:", error);
    }
  }

  setTimeout(() => {
    setupMutationObserver();
    scanPageForHoverableElements();
  }, 1000);

  function showTtsErrorNotification(errorMessage) {
    const existingNotification = document.getElementById("tiny-memo-tts-error");
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement("div");
    notification.id = "tiny-memo-tts-error";
    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      backgroundColor: "rgba(220, 53, 69, 0.9)",
      color: "#FFFFFF",
      padding: "12px 16px",
      borderRadius: "6px",
      zIndex: "2147483647",
      fontFamily: "sans-serif",
      fontSize: "14px",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
      opacity: "0",
      transition: "opacity 0.3s ease-in-out",
      maxWidth: "300px",
    });

    const message = document.createElement("span");
    message.textContent = errorMessage;
    notification.appendChild(message);
    document.body.appendChild(notification);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        notification.style.opacity = "1";
      });
    });

    const timeoutId = setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
      }, 300);
    }, 3000);

    notification.onmouseenter = () => clearTimeout(timeoutId);
    notification.onmouseleave = () => {
      setTimeout(() => {
        notification.style.opacity = "0";
        setTimeout(() => {
          if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 300);
      }, 1500);
    };
  }
})();
