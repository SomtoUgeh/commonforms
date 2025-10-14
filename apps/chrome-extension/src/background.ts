chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "QUEUE_ACTIVE_TAB") {
    return;
  }

  const tabId = sender.tab?.id;
  const url = sender.tab?.url;

  if (!(tabId && url)) {
    sendResponse({ status: "error", message: "Active tab not detected." });
    return;
  }

  sendResponse({ status: "ok" });
});

// Example listener for download completion stub. Real implementation will poll API.
chrome.runtime.onInstalled.addListener(() => {
  // TODO: Add initialization logic when inference API is ready
});
