import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { getMediaPath } from "../../services/mediaService";
import colors from "../../utils/colorSchemeEnhanced";
import MapView from "../map/MapView";
import ActiveFilters from "../filters/ActiveFilters";

export function ArchiveState() {
  const { loading, error, retry } = useData();
  if (!loading && !error) return null;
  return (
    <div className="archive-state" role={error ? "alert" : "status"}>
      <span className="eyebrow">STRATA / ARCHIVE</span>
      <h1>{error ? "The archive is unavailable." : "Opening the archive…"}</h1>
      <p>{error || "Gathering places, specimens and field notes."}</p>
      {error && <button onClick={retry}>Try again</button>}
    </div>
  );
}

export function SpecimenList() {
  const { entries, selectedEntry, setSelectedEntry, allEntries, resetFilters } =
    useData();
  const navigate = useNavigate();
  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.creationDate) - new Date(a.creationDate),
      ),
    [entries],
  );
  const numbers = useMemo(
    () =>
      new Map(
        [...allEntries]
          .sort((a, b) => new Date(a.creationDate) - new Date(b.creationDate))
          .map((e, i) => [e.uuid, String(i + 1).padStart(3, "0")]),
      ),
    [allEntries],
  );
  return (
    <aside className="specimens" aria-label="Specimen index">
      <div className="section-heading">
        <span className="eyebrow">SPECIMEN INDEX</span>
        <span className="mono" aria-live="polite">
          {entries.length} / {allEntries.length}
        </span>
      </div>
      <div className="specimen-scroll">
        {!entries.length && (
          <div className="empty">
            <h3>No matching specimens</h3>
            <p>Try widening your selection.</p>
            <button onClick={resetFilters}>Clear filters</button>
          </div>
        )}
        {sorted.map((entry) => (
          <button
            key={entry.uuid}
            className={`specimen-card ${selectedEntry?.uuid === entry.uuid ? "is-selected" : ""}`}
            onClick={() => {
              setSelectedEntry(entry);
              navigate(`/entry/${entry.uuid}`);
            }}
            aria-current={
              selectedEntry?.uuid === entry.uuid ? "page" : undefined
            }
          >
            <span className="specimen-image">
              {entry.photos?.[0]?.md5 ? (
                <img
                  src={getMediaPath(entry.photos[0])}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
              ) : (
                <span className="specimen-rings" />
              )}
              <span className="specimen-number">{numbers.get(entry.uuid)}</span>
            </span>
            <span className="specimen-copy">
              <span className="specimen-date">
                {new Date(entry.creationDate).toLocaleDateString("en-GB", {
                  month: "short",
                  year: "numeric",
                })}
                <span
                  className="type-dot"
                  style={{ background: colors[entry.type] }}
                />
              </span>
              <strong>{entry.title}</strong>
              <span className="specimen-place">
                {[entry.location?.country, entry.type]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="specimen-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      <div className="index-note">A place. A moment. A handful of earth.</div>
    </aside>
  );
}

function Facet({ dimension, title, number }) {
  const { getEntriesFilteredExcept, filters, setFilter } = useData();
  const candidates = getEntriesFilteredExcept(dimension);
  const groups = candidates.reduce((result, e) => {
    if (e[dimension]) (result[e[dimension]] ||= []).push(e);
    return result;
  }, {});
  const max = Math.max(1, ...Object.values(groups).map((g) => g.length));
  return (
    <section className="facet">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="section-number">{number}</span>
      </div>
      {Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, group]) => (
          <div key={name} className="facet-item">
            <button
              className={`facet-button ${filters[dimension] === name ? "is-active" : ""}`}
              aria-pressed={filters[dimension] === name}
              onClick={() => setFilter(dimension, name)}
            >
              <span>
                {dimension === "type" && (
                  <i
                    className="type-dot"
                    style={{ background: colors[name] }}
                  />
                )}
                {name}
              </span>
              <span className="mono">{group.length}</span>
            </button>
            {dimension === "region" ? (
              <div className="region-segments" aria-label={`${name} by type`}>
                {Object.entries(
                  group.reduce((r, e) => {
                    r[e.type] = (r[e.type] || 0) + 1;
                    return r;
                  }, {}),
                ).map(([type, count]) => (
                  <span
                    key={type}
                    title={`${type}: ${count}`}
                    style={{
                      flex: count,
                      background: colors[type] || "#918678",
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="facet-track">
                <span
                  style={{
                    width: `${(group.length / max) * 100}%`,
                    background: colors[name],
                  }}
                />
              </div>
            )}
          </div>
        ))}
    </section>
  );
}
function Chronology() {
  const { getEntriesFilteredExcept, filters, setFilter } = useData();
  const candidates = getEntriesFilteredExcept("quarter");
  const groups = candidates.reduce((r, e) => {
    (r[e.quarter] ||= []).push(e);
    return r;
  }, {});
  const quarters = Object.keys(groups).sort(
    (a, b) => Number(a.slice(3)) - Number(b.slice(3)) || a.localeCompare(b),
  );
  const max = Math.max(1, ...Object.values(groups).map((g) => g.length));
  return (
    <section className="chronology" aria-label="Collection timeline">
      <div className="section-heading">
        <h2>Through time</h2>
        <span className="eyebrow">QUARTERS WITH SPECIMENS · SCROLL →</span>
      </div>
      <div className="quarter-scroll">
        {quarters.map((q) => (
          <button
            className={`quarter ${filters.quarter === q ? "is-active" : ""}`}
            key={q}
            aria-label={`Filter ${q}: ${groups[q].length} specimens`}
            aria-pressed={filters.quarter === q}
            onClick={() => setFilter("quarter", q)}
            title={`${q}: ${groups[q].length} specimens`}
          >
            <span className="quarter-bar" aria-hidden="true">
              {Object.entries(
                groups[q].reduce((r, e) => {
                  r[e.type] = (r[e.type] || 0) + 1;
                  return r;
                }, {}),
              ).map(([type, n]) => (
                <span
                  key={type}
                  style={{
                    height: `${(n / max) * 100}%`,
                    background: colors[type] || "#918678",
                  }}
                />
              ))}
            </span>
            <span className="quarter-label">
              <span>{q.slice(0, 2)}</span>
              <span>{q.slice(3)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
export default function Archive() {
  const { loading, error, filters, setFilter, entries, allEntries } = useData();
  if (loading || error) return <ArchiveState />;
  return (
    <main className="archive-grid" id="main-content">
      <aside className="filter-rail" aria-label="Filter collection">
        <div className="filter-intro">
          <span className="eyebrow">THE COLLECTION</span>
          <div className="collection-total">
            {String(allEntries.length).padStart(3, "0")}
            <span>specimens</span>
          </div>
        </div>
        <label className="search-field">
          <span className="sr-only">Search archive</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search the archive"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </label>
        <div className="facets">
          <Facet dimension="type" title="By landscape" number="01" />
          <Facet dimension="region" title="By region" number="02" />
        </div>
      </aside>
      <section className="atlas">
        <div className="atlas-heading">
          <div>
            <span className="eyebrow">FIELD ATLAS</span>
            <h1>A collection of places.</h1>
          </div>
          <span className="atlas-count mono">
            {entries.length} specimens in view
          </span>
        </div>
        <ActiveFilters />
        <div className="map-stage">
          <MapView />
        </div>
        <Chronology />
      </section>
      <SpecimenList />
    </main>
  );
}
