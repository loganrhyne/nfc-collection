import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import JournalContent from "./JournalContent";
import NFCRegistrationModal from "../nfc/NFCRegistrationModal";
import { ArchiveState, SpecimenList } from "../layout/Archive";
import colors from "../../utils/colorSchemeEnhanced";

export default function EntryView() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const { getEntryByUUID, setSelectedEntry, loading, error } = useData();
  const entry = getEntryByUUID(entryId);
  const [showRegistration, setShowRegistration] = useState(false);
  const closeRegistration = useCallback(() => setShowRegistration(false), []);
  useEffect(() => {
    setSelectedEntry(entry);
    setShowRegistration(false);
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
          <button onClick={() => setShowRegistration(true)}>
            Register sample ↗
          </button>
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
