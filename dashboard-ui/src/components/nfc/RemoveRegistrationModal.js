import React, { useEffect, useState } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import useDialog from "../../hooks/useDialog";

export default function RemoveRegistrationModal({ entry, onClose }) {
  const { connected, sendMessage, registerHandler } = useWebSocket();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ref = useDialog(true, onClose);
  useEffect(() => {
    const unsubscribers = [
      registerHandler("sample_registration_removed", ({ data }) => {
        if (data?.entry_id === entry.uuid) onClose();
      }),
      registerHandler("sample_registration_remove_error", ({ data }) => {
        if (data?.entry_id !== entry.uuid) return;
        setPending(false);
        setError(data.message);
      }),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [entry.uuid, onClose, registerHandler]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setPending(false);
      setError("No confirmation received. Reconnect and check the sample before retrying.");
    }, 10000);
    return () => clearTimeout(timer);
  }, [pending]);
  const remove = () => {
    setError("");
    if (sendMessage("remove_sample_registration", { entry_id: entry.uuid })) {
      setPending(true);
    } else {
      setError("The display is offline. Reconnect before removing the registration.");
    }
  };
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section className="registration-dialog" ref={ref} role="dialog"
        aria-modal="true" aria-labelledby="remove-registration-title" tabIndex={-1}
        onClick={(event) => event.stopPropagation()}>
        <span className="eyebrow">SAMPLE REGISTRATION</span>
        <h2 id="remove-registration-title">Remove sample registration?</h2>
        <p>Remove the saved sample registration for <strong>{entry.title || entry.text?.split("\n")[0].replace(/^#+\s*/, "").replace(/\\/g, "") || "this journal entry"}</strong>?</p>
        <p>The journal entry and physical NFC tag will stay unchanged. You can register the sample again later.</p>
        {!connected && <p role="alert">The display is offline. Reconnect to continue.</p>}
        {error && <p role="alert">{error}</p>}
        <div className="registration-dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={!connected || pending} onClick={remove}>
            {pending ? "Removing…" : "Remove registration"}
          </button>
        </div>
      </section>
    </div>
  );
}
