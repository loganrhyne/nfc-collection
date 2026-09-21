import React from "react";
import { useData } from "../../context/DataContext";
import {
  formatFilterValue,
  getDimensionDisplayName,
} from "../../utils/filterUtils";
export default function ActiveFilters() {
  const { filters, setFilter, resetFilters } = useData();
  const active = Object.entries(filters).filter(
    ([, value]) => value !== null && value !== "",
  );
  if (!active.length) return null;
  return (
    <div className="active-filters" aria-label="Active filters">
      {active.map(([key, value]) => (
        <button
          key={key}
          onClick={() => setFilter(key, null)}
          aria-label={`Remove ${getDimensionDisplayName(key)} filter`}
        >
          <span>{formatFilterValue(key, value)}</span>
          <span aria-hidden="true">×</span>
        </button>
      ))}
      <button className="clear-filters" onClick={resetFilters}>
        Clear all
      </button>
    </div>
  );
}
