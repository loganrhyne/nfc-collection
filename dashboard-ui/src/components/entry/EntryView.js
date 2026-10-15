import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useWebSocket } from "../../hooks/useWebSocket";
import JournalContent from "./JournalContent";
import RemoveRegistrationModal from "../nfc/RemoveRegistrationModal";
import NFCRegistrationModal from "../nfc/NFCRegistrationModal";
import { ArchiveState, SpecimenList } from "../layout/Archive";
import colors from "../../utils/colorSchemeEnhanced";

export default function EntryView() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const { getEntryByUUID, setSelectedEntry, loading, error } = useData();
  const entry = getEntryByUUID(entryId);
  const { connected, sendMessage, registerHandler } = useWebSocket();
  const [samples, setSamples] = useState(null);
  useEffect(() => {
    setSamples(null);
    const unsubscribe = registerHandler("sample_locations", (message) => {
      setSamples(message.data?.samples || null);
    });
    if (connected) sendMessage("get_sample_locations", {});
    return unsubscribe;
  }, [connected, sendMessage, registerHandler]);
  const registered = samples && Object.prototype.hasOwnProperty.call(samples, entryId);
  const placement = registered ? samples[entryId] : null;
  const [showRemoval, setShowRemoval] = useState(false);
  const closeRemoval = useCallback(() => setShowRemoval(false), []);
  const [showRegistration, setShowRegistration] = useState(false);
  const closeRegistration = useCallback(() => setShowRegistration(false), []);
  useEffect(() => {
    setSelectedEntry(entry);
    setShowRegistration(false);
    setShowRemoval(false);
  }, [entry, setSelectedEntry]);
  if (loading || error) return <ArchiveState />;
  if (!entry)
    return (
      <main id="main-content" className="archive-state">
        <h1>Specimen not found.</h1>
        <p>This tag or link does not match an entry in the archive.</p>
        <button onClick={() => navigate("/")}>Return to collection</button>
      </main>
    );
  const location = entry.location;
  return (
    <main className="entry-layout" id="main-content">
      <article className="field-note" key={entryId}>
        <div className="field-note-actions">
          <button
            onClick={() => {
              setSelectedEntry(null);
              navigate("/");
            }}
          >
            ← Collection
          </button>
          {registered ? (
            <span className="sample-grid-location mono">
              {placement
                ? `Row ${placement.row + 1} / Column ${placement.col + 1}`
                : "Sample registered · Position unavailable"}
              <button className="remove-registration" aria-label="Remove sample registration"
                title="Remove sample registration" disabled={!connected}
                onClick={() => setShowRemoval(true)}>×</button>
            </span>
          ) : samples ? (
            <button onClick={() => setShowRegistration(true)}>
              Register sample ↗
            </button>
          ) : (
            <span className="sample-grid-location">
              {connected ? "Checking sample registration…" : "Sample registration unavailable"}
            </span>
          )}
        </div>
        <div className="field-note-meta">
          <span className="eyebrow">
            <i
              className="type-dot"
              style={{ background: colors[entry.type] }}
            />
            {entry.type || "SPECIMEN"} / {entry.region || "FIELD NOTE"}
          </span>
          <time>
            {new Date(entry.creationDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </div>
        <JournalContent
          text={entry.text}
          mediaItems={[
            ...(entry.photos || []),
            ...(entry.videos || []),
            ...(entry.pdfAttachments || []),
          ]}
          headerColor="var(--ink)"
        />
        {location && (
          <section className="location-record">
            <span className="eyebrow">FIELD LOCATION</span>
            <h2>
              {location.placeName ||
                location.localityName ||
                location.country ||
                "Unrecorded"}
            </h2>
            <p>
              {[location.localityName, location.country]
                .filter(Boolean)
                .join(" / ")}
            </p>
            {Number.isFinite(location.latitude) &&
              Number.isFinite(location.longitude) && (
                <span className="mono">
                  {location.latitude.toFixed(5)}°,{" "}
                  {location.longitude.toFixed(5)}°
                </span>
              )}
          </section>
        )}
      </article>
      <SpecimenList />
      {showRemoval && (
        <RemoveRegistrationModal key={entryId} entry={entry} onClose={closeRemoval} />
      )}
      {showRegistration && (
        <NFCRegistrationModal
          entry={entry}
          onClose={closeRegistration}
          onSuccess={closeRegistration}
        />
      )}
    </main>
  );
}
