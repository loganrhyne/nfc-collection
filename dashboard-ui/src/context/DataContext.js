import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { processEntries } from "../utils/dataProcessing";
import {
  applyFilters,
  applyFiltersExcept,
  isValidDimension,
} from "../utils/filterUtils";

const DataContext = createContext(null);
const EMPTY_FILTERS = {
  type: null,
  region: null,
  quarter: null,
  search: "",
  geo: null,
};
export function DataProvider({ children }) {
  const [allEntries, setEntries] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/data/journal.json?t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Archive unavailable (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data.entries))
          throw new Error("The archive data is not valid.");
        if (!controller.signal.aborted)
          setEntries(processEntries(data.entries));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const entries = useMemo(
    () => applyFilters(allEntries, filters),
    [allEntries, filters],
  );
  const setFilter = useCallback((dimension, value) => {
    if (!isValidDimension(dimension)) return;
    setFilters((previous) => ({
      ...previous,
      [dimension]:
        dimension === "search"
          ? String(value || "")
          : previous[dimension] === value
            ? null
            : value,
    }));
  }, []);
  const setMultiFilter = useCallback((values) => {
    setFilters((previous) => ({
      ...previous,
      ...Object.fromEntries(
        Object.entries(values).filter(([key]) => isValidDimension(key)),
      ),
    }));
  }, []);
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const getEntriesFilteredExcept = useCallback(
    (dimension, includeOwn = false) =>
      includeOwn ? entries : applyFiltersExcept(allEntries, filters, dimension),
    [allEntries, entries, filters],
  );
  const getEntryByUUID = useCallback(
    (uuid) => allEntries.find((entry) => entry.uuid === uuid) || null,
    [allEntries],
  );
  const value = useMemo(
    () => ({
      allEntries,
      entries,
      filters,
      selectedEntry,
      setSelectedEntry,
      setFilter,
      setMultiFilter,
      resetFilters,
      getEntriesFilteredExcept,
      getEntryByUUID,
      loading,
      error,
      retry,
    }),
    [
      allEntries,
      entries,
      filters,
      selectedEntry,
      setFilter,
      setMultiFilter,
      resetFilters,
      getEntriesFilteredExcept,
      getEntryByUUID,
      loading,
      error,
      retry,
    ],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
}
export default DataContext;
