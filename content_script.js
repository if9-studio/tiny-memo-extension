// content_script.js - Capture current page text selection for keyboard shortcut
(() => {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    chrome.runtime.sendMessage({ type: "SELECTION_FROM_CONTENT_SCRIPT", text: selection }, () => {
      if (chrome.runtime.lastError) {
        // Ignore transient runtime errors when page context closes
      }
    });
  }
})();
