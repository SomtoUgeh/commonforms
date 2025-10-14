import { useCallback, useState } from "react";

type JobStatus =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "complete"
  | "error";

export function App() {
  const [status, setStatus] = useState<JobStatus>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = useCallback(async () => {
    setError(null);
    setDownloadUrl(null);
    setStatus("uploading");

    try {
      // Placeholder: wire to backend once inference API is ready
      const response = await chrome.runtime.sendMessage({
        type: "QUEUE_ACTIVE_TAB",
      });

      if (response?.status === "ok") {
        setStatus("queued");
      } else {
        setStatus("error");
        setError(response?.message ?? "Failed to queue job.");
      }
    } catch (_err) {
      setStatus("error");
      setError("Extension background script unavailable.");
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!downloadUrl) {
      return;
    }
    chrome.downloads.download({ url: downloadUrl });
  }, [downloadUrl]);

  return (
    <main className="popup">
      <h1>CommonForms</h1>
      <p>Send the current PDF to the CommonForms processing queue.</p>
      <button
        disabled={status !== "idle"}
        onClick={handleProcess}
        type="button"
      >
        {status === "idle" ? "Queue PDF" : "Processing..."}
      </button>

      {status === "queued" && (
        <p className="status">Queued. Polling for status…</p>
      )}
      {status === "processing" && (
        <p className="status">Generating fillable form…</p>
      )}

      {downloadUrl && (
        <button className="secondary" onClick={handleDownload} type="button">
          Download Processed PDF
        </button>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}

export default App;
