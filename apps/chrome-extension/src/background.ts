chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'QUEUE_ACTIVE_TAB') return;

  const tabId = sender.tab?.id;
  const url = sender.tab?.url;

  if (!tabId || !url) {
    sendResponse({ status: 'error', message: 'Active tab not detected.' });
    return;
  }

  // Placeholder implementation: queue job with inference API once available.
  // Intentionally synchronous response to keep base wiring simple.
  console.log(`[CommonForms] Queue request for tab ${tabId}: ${url}`);

  sendResponse({ status: 'ok' });
});

// Example listener for download completion stub. Real implementation will poll API.
chrome.runtime.onInstalled.addListener(() => {
  console.log('[CommonForms] Extension installed.');
});
