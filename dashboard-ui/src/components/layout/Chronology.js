import React, { useMemo, useState } from "react";
import { useData } from "../../context/DataContext";
import useDialog from "../../hooks/useDialog";
import colors from "../../utils/colorSchemeEnhanced";

export default function Chronology() {
  const { allEntries, getEntriesFilteredExcept, filters, setFilter } =
    useData();
  const [inspected, setInspected] = useState(null);
  const [focusedQuarter, setFocusedQuarter] = useState(null);
  const [openYear, setOpenYear] = useState(null);
  const dialogRef = useDialog(openYear !== null, () => setOpenYear(null));
  const candidates = getEntriesFilteredExcept("quarter");
  const groups = candidates.reduce((r, e) => {
    (r[e.quarter] ||= []).push(e);
    return r;
  }, {});
  // Keep a continuous archive-wide axis, including gaps and filtered-out quarters.
  const quarters = useMemo(() => {
    const indices = allEntries.flatMap(({ quarter }) => {
      const match = /^Q([1-4])-(\d{4})$/.exec(quarter);
      return match ? [Number(match[2]) * 4 + Number(match[1]) - 1] : [];
    });
    if (!indices.length) return [];
    const first = Math.min(...indices);
    const last = Math.max(...indices);
    return Array.from({ length: last - first + 1 }, (_, offset) => {
      const index = first + offset;
      return `Q${(index % 4) + 1}-${Math.floor(index / 4)}`;
    });
  }, [allEntries]);
  const max = Math.max(1, ...Object.values(groups).map((g) => g.length));
  const years = quarters.reduce((result, q) => {
    (result[q.slice(3)] ||= []).push(q);
    return result;
  }, {});
  const describe = (q) => {
    const count = groups[q]?.length || 0;
    return `${q.replace("-", " ")} · ${count} ${count === 1 ? "specimen" : "specimens"}`;
  };
  const detail = inspected || filters.quarter;
  return (
    <section className="chronology" aria-label="Collection timeline">
      <div className="section-heading">
        <h2>Through time</h2>
        <span className="timeline-detail">
          {detail ? describe(detail) : "Quarterly · tap a year to filter"}
        </span>
      </div>
      <div
        className="timeline-chart"
        style={{ "--quarters": quarters.length || 1 }}
      >
        <div className="timeline-plot">
          <span className="timeline-scale" aria-hidden="true">
            {max}
          </span>
          {quarters.map((q, index) => (
            <button
              className={`quarter ${q.startsWith("Q1-") ? "year-start" : ""} ${filters.quarter === q ? "is-active" : ""}`}
              key={q}
              aria-label={`Filter ${q}: ${groups[q]?.length || 0} specimens`}
              aria-pressed={filters.quarter === q}
              tabIndex={
                q === (focusedQuarter || filters.quarter || quarters[0])
                  ? 0
                  : -1
              }
              onClick={() => setFilter("quarter", q)}
              onKeyDown={(event) => {
                const next = {
                  ArrowLeft: Math.max(0, index - 1),
                  ArrowRight: Math.min(quarters.length - 1, index + 1),
                  Home: 0,
                  End: quarters.length - 1,
                }[event.key];
                if (next === undefined) return;
                event.preventDefault();
                event.currentTarget.parentElement
                  .querySelectorAll("button")
                  [next].focus();
              }}
              onPointerEnter={() => setInspected(q)}
              onPointerLeave={() => setInspected(null)}
              onFocus={() => {
                setInspected(q);
                setFocusedQuarter(q);
              }}
              onBlur={() => setInspected(null)}
              title={describe(q)}
            >
              <span
                className={`quarter-bar ${groups[q]?.length ? "" : "is-empty"}`}
                aria-hidden="true"
              >
                {Object.entries(
                  (groups[q] || []).reduce((r, e) => {
                    r[e.type] = (r[e.type] || 0) + 1;
                    return r;
                  }, {}),
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([type, n]) => (
                    <span
                      key={type}
                      style={{
                        height: `${(n / max) * 100}%`,
                        background: colors[type] || "#918678",
                      }}
                    />
                  ))}
              </span>
            </button>
          ))}
        </div>
        <div className="timeline-years">
          {Object.entries(years).map(([year, periods]) => (
            <button
              key={year}
              className={`timeline-year ${filters.quarter?.endsWith(year) ? "is-active" : ""}`}
              style={{ gridColumn: `span ${periods.length}` }}
              aria-label={`Choose a quarter in ${year}`}
              aria-haspopup="dialog"
              aria-expanded={openYear === year}
              onClick={() => setOpenYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      {openYear && (
        <>
          <div
            className="timeline-dismiss"
            onClick={() => setOpenYear(null)}
            aria-hidden="true"
          />
          <div
            className="timeline-picker"
            role="dialog"
            aria-modal="true"
            aria-label={`Choose a quarter in ${openYear}`}
            ref={dialogRef}
            tabIndex={-1}
          >
            <div className="timeline-picker-heading">
              <h3>{openYear}</h3>
              <button
                aria-label="Close quarter picker"
                onClick={() => setOpenYear(null)}
              >
                ×
              </button>
            </div>
            <div className="timeline-picker-quarters">
              {years[openYear].map((q) => (
                <button
                  key={q}
                  aria-label={`Choose ${q}: ${groups[q]?.length || 0} specimens`}
                  aria-pressed={filters.quarter === q}
                  onClick={() => {
                    setFilter("quarter", q);
                    setOpenYear(null);
                  }}
                >
                  <strong>{q.slice(0, 2)}</strong>
                  <span>
                    {groups[q]?.length || 0} <small>specimens</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
