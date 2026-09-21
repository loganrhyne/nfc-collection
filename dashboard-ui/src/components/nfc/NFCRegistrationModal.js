import React, { useEffect, useRef, useState } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import useDialog from "../../hooks/useDialog";
export default function NFCRegistrationModal({ entry, onClose, onSuccess }) {
  const { connected, sendMessage, registerHandler } = useWebSocket();
  const [status, setStatus] = useState("waiting");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const completed = useRef(false);
  const ref = useDialog(true, onClose);
  useEffect(() => {
    if (!connected) {
      setStatus("error");
      setError(
        "The display is offline. Reconnect before registering a sample.",
      );
      return;
    }
    const unsub = [
      registerHandler("awaiting_tag", () => setStatus("waiting")),
      registerHandler("tag_registered", (message) => {
        completed.current = true;
        setResult(message.data);
        setStatus("success");
      }),
      registerHandler("registration_error", (message) => {
        setError(
          message.data?.message || "Registration failed. Please try again.",
        );
        setStatus("error");
      }),
    ];
    let started = false;
    // Defer side effects through StrictMode's setup/cleanup rehearsal.
    const timer = setTimeout(() => {
      completed.current = false;
      started = sendMessage("register_tag_start", {
        entry_id: entry.uuid,
        entry_data: { timestamp: entry.creationDate },
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      unsub.forEach((fn) => fn());
      if (started && !completed.current) sendMessage("register_tag_cancel", {});
    };
  }, [connected, entry.uuid, entry.creationDate, sendMessage, registerHandler]);
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section
        className="registration-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-heading">
          <span className="eyebrow">SPECIMEN / REGISTRATION</span>
          <button aria-label="Close registration" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="registration-symbol" aria-hidden="true">
          {status === "success" ? "✓" : "◎"}
        </div>
        <h2 id="registration-title">
          {status === "success"
            ? "A place in the collection."
            : status === "error"
              ? "Registration unavailable."
              : "Place the sample on the reader."}
        </h2>
        <p className="registration-entry">{entry.title}</p>
        <div aria-live="polite">
          {status === "waiting" && (
            <p>
              Keep the sample resting on the dock until registration is
              complete.
            </p>
          )}
          {status === "error" && <p role="alert">{error}</p>}
          {status === "success" &&
            (result?.placement ? (
              <>
                <p>Return this specimen to its place on the grid.</p>
                <div className="placement">
                  Row {result.placement.row + 1} <span>/</span> Column{" "}
                  {result.placement.col + 1}
                </div>
                <p>
                  {result.placement.beacon
                    ? "The cell is lit on the grid."
                    : "Use the row and column above; the grid light is unavailable."}
                </p>
              </>
            ) : (
              <p>The tag is now linked to this field note.</p>
            ))}
        </div>
        <button
          className="primary-button"
          onClick={() => (status === "success" ? onSuccess(result) : onClose())}
        >
          {status === "success"
            ? "Done"
            : status === "error"
              ? "Close"
              : "Cancel registration"}
        </button>
      </section>
    </div>
  );
}
