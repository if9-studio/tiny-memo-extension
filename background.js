// background.js - Tiny Memo MV3 service worker with 8-language single-source i18n
importScripts("i18n-catalog.js", "i18n.js");

const CONTEXT_MENU_ID = "addSelectionToMemo";

async function getTranslator() {
  const i18n = globalThis.TinyMemoI18n;
  const catalog = globalThis.__TINY_MEMO_CATALOG__ || {};
  const lang = await i18n.getActiveLanguage();
  return i18n.createTranslator(lang, catalog);
}

async function syncContextMenuTitle() {
  try {
    const t = await getTranslator();
    const title = t("contextMenu.addSelection");
    chrome.contextMenus.update(CONTEXT_MENU_ID, { title }, () => {
      if (chrome.runtime.lastError) {
        chrome.contextMenus.create({
          id: CONTEXT_MENU_ID,
          title,
          contexts: ["selection"],
        });
      }
    });
  } catch (error) {
    console.error("[Tiny Memo] Failed to sync context menu title:", error);
  }
}

async function saveNote(text) {
  let noteToSave = text;

  try {
    const settings = await chrome.storage.local.get(["mergeMultilineSetting"]);
    const shouldMerge = settings.mergeMultilineSetting === undefined ? true : settings.mergeMultilineSetting;
    if (shouldMerge && noteToSave && noteToSave.includes("\n")) {
      noteToSave = noteToSave.replace(/\n+/g, " ").trim();
    }
  } catch (error) {
    console.error("[Tiny Memo] Error reading mergeMultilineSetting, defaulting to merge:", error);
    if (noteToSave && noteToSave.includes("\n")) {
      noteToSave = noteToSave.replace(/\n+/g, " ").trim();
    }
  }

  if (!noteToSave) return null;

  try {
    const data = await chrome.storage.local.get(["memoNotes"]);
    const notes = data.memoNotes || [];
    notes.push(noteToSave);
    await chrome.storage.local.set({ memoNotes: notes });
    return notes.length;
  } catch (error) {
    console.error("[Tiny Memo] Error saving note:", error);
    return null;
  }
}

async function synthesizeSpeech(text) {
  const t = await getTranslator();
  try {
    const settings = await chrome.storage.local.get(["ttsVoice"]);
    const voice = settings.ttsVoice || "zh-CN-XiaoxiaoNeural";

    const response = await fetch("http://localhost:5020/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice,
        return_type: "url",
      }),
    });

    if (!response.ok) {
      throw new Error(t("background.ttsRequestFailed", { status: response.status }));
    }

    const data = await response.json();
    if (data.success) {
      return data.audio_url;
    }
    throw new Error(data.error || t("background.ttsServiceError"));
  } catch (error) {
    console.error("[Tiny Memo] TTS synthesis error:", error);
    return null;
  }
}

async function getAvailableVoices() {
  const t = await getTranslator();
  try {
    const response = await fetch("http://localhost:5020/api/voices");
    if (!response.ok) {
      throw new Error(t("background.fetchVoicesFailed", { status: response.status }));
    }
    return await response.json();
  } catch (error) {
    console.error("[Tiny Memo] Error fetching TTS voices:", error);
    return {};
  }
}

async function performCopyAndClear() {
  const t = await getTranslator();
  try {
    const data = await chrome.storage.local.get(["memoNotes"]);
    const notes = data.memoNotes || [];
    if (notes.length > 0) {
      await chrome.storage.local.set({ memoNotes: [] });
      return { success: true, message: t("background.notesCleared") };
    }
    return { success: false, message: t("background.noNotesToClear") };
  } catch (error) {
    console.error("[Tiny Memo] Error during copy & clear in background:", error);
    return { success: false, message: t("background.clearNotesError") };
  }
}

async function buildNotificationStrings(noteCount) {
  const t = await getTranslator();
  return {
    noteAdded: t("notification.noteAdded", { count: noteCount }),
    copyAndClear: t("notification.copyAndClear"),
    fetchNotesError: t("notification.fetchNotesError"),
    copyFailed: t("notification.copyFailed"),
    noNotesToCopy: t("notification.noNotesToCopy"),
    clearSuccess: t("notification.clearSuccess"),
    clearFailedComm: t("notification.clearFailedComm"),
    clearFailed: t("notification.clearFailed"),
    buttonActionError: t("notification.buttonActionError"),
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  const t = await getTranslator();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: t("contextMenu.addSelection"),
      contexts: ["selection"],
    });
  });
});

chrome.runtime.onStartup.addListener(() => {
  syncContextMenuTitle();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.appLanguage) {
    syncContextMenuTitle();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    const selectedText = info.selectionText.trim();
    const tabId = tab?.id;
    const newCount = await saveNote(selectedText);
    if (newCount !== null && tabId) {
      try {
        const strings = await buildNotificationStrings(newCount);
        await chrome.scripting.executeScript({
          target: { tabId },
          func: showTinyMemoNotification,
          args: [newCount, strings],
        });
      } catch (error) {
        console.error("[Tiny Memo] Error executing notification script via context menu:", error);
      }
    }
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === "add-selection-shortcut" && tab && tab.id) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content_script.js"],
      });
    } catch (error) {
      console.error("[Tiny Memo] Error executing content_script.js:", error);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SELECTION_FROM_CONTENT_SCRIPT" && message.text) {
    (async () => {
      const tabId = sender.tab?.id;
      const newCount = await saveNote(message.text);
      if (newCount !== null && tabId) {
        try {
          const strings = await buildNotificationStrings(newCount);
          await chrome.scripting.executeScript({
            target: { tabId },
            func: showTinyMemoNotification,
            args: [newCount, strings],
          });
        } catch (error) {
          console.error("[Tiny Memo] Error executing notification script via shortcut:", error);
        }
      }
    })();
    return true;
  }
  if (message.type === "COPY_AND_CLEAR_REQUEST") {
    (async () => {
      const result = await performCopyAndClear();
      sendResponse(result);
    })();
    return true;
  }
  if (message.type === "TTS_REQUEST") {
    (async () => {
      try {
        const audioUrl = await synthesizeSpeech(message.text);
        sendResponse({ success: true, audio_url: audioUrl });
      } catch (error) {
        console.error("[Tiny Memo] TTS processing error:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  if (message.type === "GET_TTS_VOICES") {
    (async () => {
      try {
        const voices = await getAvailableVoices();
        sendResponse({ success: true, voices });
      } catch (error) {
        console.error("[Tiny Memo] Error fetching TTS voices:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  return false;
});

function showTinyMemoNotification(noteCount, strings) {
  const copy = strings || {};
  const existingNotification = document.getElementById("tiny-memo-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  const notificationId = "tiny-memo-notification";
  const notification = document.createElement("div");
  notification.id = notificationId;

  Object.assign(notification.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    color: "#FFFFFF",
    padding: "12px 18px",
    borderRadius: "6px",
    zIndex: "2147483647",
    fontFamily: "sans-serif",
    fontSize: "14px",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
    opacity: "0",
    transition: "opacity 0.3s ease-in-out",
  });

  const message = document.createElement("span");
  message.textContent = copy.noteAdded || `+1 (${noteCount})`;
  message.style.whiteSpace = "nowrap";
  message.style.fontVariantNumeric = "tabular-nums";
  notification.appendChild(message);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = copy.copyAndClear || "Copy & Clear";
  Object.assign(button.style, {
    backgroundColor: "#4CAF50",
    border: "none",
    color: "#FFFFFF",
    padding: "6px 10px",
    textAlign: "center",
    textDecoration: "none",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "4px",
    cursor: "pointer",
    flexShrink: "0",
  });

  let timeoutId = null;
  const removeNotification = (force = false) => {
    if (timeoutId) clearTimeout(timeoutId);
    const elem = document.getElementById(notificationId);
    if (elem) {
      elem.style.opacity = "0";
      setTimeout(
        () => {
          elem.remove();
        },
        force ? 0 : 300
      );
    }
  };

  button.onclick = () => {
    try {
      chrome.storage.local.get(["memoNotes"], async (result) => {
        if (chrome.runtime.lastError) {
          message.textContent = copy.fetchNotesError || "Error";
          return;
        }
        const notes = result.memoNotes || [];
        if (notes.length > 0) {
          const markdownNotes = notes.map((note) => `- ${note}`).join("\n");
          try {
            await navigator.clipboard.writeText(markdownNotes);
            chrome.runtime.sendMessage({ type: "COPY_AND_CLEAR_REQUEST" }, (response) => {
              if (chrome.runtime.lastError) {
                message.textContent = copy.clearFailedComm || "Error";
              } else if (response && response.success) {
                message.textContent = copy.clearSuccess || "Cleared";
              } else {
                message.textContent = response?.message || copy.clearFailed || "Error";
              }
              setTimeout(() => removeNotification(false), 900);
            });
          } catch (_copyError) {
            message.textContent = copy.copyFailed || "Copy failed";
            setTimeout(() => removeNotification(false), 1200);
          }
        } else {
          message.textContent = copy.noNotesToCopy || "Empty";
          setTimeout(() => removeNotification(false), 900);
        }
      });
    } catch (_error) {
      message.textContent = copy.buttonActionError || "Error";
      setTimeout(() => removeNotification(false), 1200);
    }
  };
  notification.appendChild(button);

  document.body.appendChild(notification);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      notification.style.opacity = "1";
    });
  });

  timeoutId = setTimeout(removeNotification, 3000);
  notification.onmouseenter = () => clearTimeout(timeoutId);
  notification.onmouseleave = () => {
    timeoutId = setTimeout(removeNotification, 3000);
  };
}

console.log("[Tiny Memo] background.js loaded.");
