import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { DataProvider, useData } from "./context/DataContext";
import EntryView from "./components/entry/EntryView";
import NFCRegistrationModal from "./components/nfc/NFCRegistrationModal";
import Archive from "./components/layout/Archive";

jest.mock("./components/map/MapView", () => () => <div>Map</div>);
jest.mock("./components/entry/JournalContent", () => ({ text }) => (
  <h1>{text}</h1>
));
const mockHandlers = new Map();
const mockSend = jest.fn(() => true);
const mockSocket = {
  connected: true,
  sendMessage: mockSend,
  registerHandler: (event, handler) => {
    mockHandlers.set(event, handler);
    return () => mockHandlers.delete(event);
  },
};
jest.mock("./hooks/useWebSocket", () => ({ useWebSocket: () => mockSocket }));
const raw = [
  {
    uuid: "beach",
    text: "# Shore",
    creationDate: "2025-01-01",
    tags: ["Type: Beach", "Region: Europe"],
    location: { latitude: 0, longitude: 0 },
  },
  {
    uuid: "peak",
    text: "# Peak",
    creationDate: "2025-04-01",
    tags: ["Type: Mountain", "Region: Europe"],
    location: { latitude: 46, longitude: 7 },
  },
];
function Probe() {
  const { entries, setFilter, filters, loading, error, retry } = useData();
  return (
    <>
      <output data-testid="count">{entries.length}</output>
      <output data-testid="state">
        {loading ? "loading" : error || "ready"}
      </output>
      <button onClick={() => setFilter("type", "Beach")}>Beach only</button>
      <button
        onClick={() =>
          setFilter("geo", { south: -1, north: 1, west: -1, east: 1 })
        }
      >
        Area
      </button>
      <button onClick={() => setFilter("geo", null)}>Clear area</button>
      <button onClick={retry}>Retry</button>
      <output data-testid="geo">{String(!!filters.geo)}</output>
    </>
  );
}
beforeEach(() => {
  mockHandlers.clear();
  mockSend.mockReset();
  mockSend.mockReturnValue(true);
  mockSocket.connected = true;
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ entries: raw }) });
});
afterEach(() => {
  jest.useRealTimers();
});
test("cross-filters, includes zero coordinates, and removes geography explicitly", async () => {
  render(
    <DataProvider>
      <Probe />
    </DataProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("count")).toHaveTextContent("2"),
  );
  fireEvent.click(screen.getByText("Area"));
  expect(screen.getByTestId("count")).toHaveTextContent("1");
  fireEvent.click(screen.getByText("Clear area"));
  expect(screen.getByTestId("count")).toHaveTextContent("2");
  expect(screen.getByTestId("geo")).toHaveTextContent("false");
  fireEvent.click(screen.getByText("Beach only"));
  expect(screen.getByTestId("count")).toHaveTextContent("1");
  fireEvent.click(screen.getByText("Beach only"));
  expect(screen.getByTestId("count")).toHaveTextContent("2");
});
test("failed archive loading can be retried", async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 503 });
  render(
    <DataProvider>
      <Probe />
    </DataProvider>,
  );
  await waitFor(() =>
    expect(screen.getByTestId("state")).toHaveTextContent("503"),
  );
  fireEvent.click(screen.getByText("Retry"));
  await waitFor(() =>
    expect(screen.getByTestId("count")).toHaveTextContent("2"),
  );
});
test("the timeline retains empty quarters across years and while filtering", async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      entries: [
        { ...raw[0], creationDate: "2024-10-01" },
        { ...raw[1], creationDate: "2025-04-01" },
      ],
    }),
  });
  render(
    <MemoryRouter>
      <DataProvider>
        <Archive />
      </DataProvider>
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: "Filter Q4-2024: 1 specimens" });
  const gap = screen.getByRole("button", {
    name: "Filter Q1-2025: 0 specimens",
  });
  fireEvent.click(gap);
  expect(screen.getByText("No matching specimens")).toBeInTheDocument();
  expect(gap).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Shore" },
  });
  expect(
    screen.getByRole("button", { name: "Filter Q4-2024: 1 specimens" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Filter Q1-2025: 0 specimens" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Filter Q2-2025: 0 specimens" }),
  ).toBeInTheDocument();
});
test("the timeline supports arrow navigation and a touch-sized year picker", async () => {
  render(
    <MemoryRouter>
      <DataProvider>
        <Archive />
      </DataProvider>
    </MemoryRouter>,
  );
  const first = await screen.findByRole("button", {
    name: "Filter Q1-2025: 1 specimens",
  });
  fireEvent.keyDown(first, { key: "ArrowRight" });
  expect(
    screen.getByRole("button", { name: "Filter Q2-2025: 1 specimens" }),
  ).toHaveFocus();
  fireEvent.click(
    screen.getByRole("button", { name: "Choose a quarter in 2025" }),
  );
  expect(
    screen.getByRole("dialog", { name: "Choose a quarter in 2025" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Choose Q2-2025: 1 specimens" }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Filter Q2-2025: 1 specimens" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /002.*Peak/ })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /001.*Shore/ }),
  ).not.toBeInTheDocument();
});
test("a direct or NFC entry route resolves outside the active filter", async () => {
  render(
    <MemoryRouter initialEntries={["/entry/peak"]}>
      <DataProvider>
        <Probe />
        <Routes>
          <Route path="/entry/:entryId" element={<EntryView />} />
        </Routes>
      </DataProvider>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "# Peak" });
  fireEvent.click(screen.getByText("Beach only"));
  expect(screen.getByRole("heading", { name: "# Peak" })).toBeInTheDocument();
  expect(screen.getByTestId("count")).toHaveTextContent("1");
});
test("registration starts once in StrictMode, retains placement, and does not cancel a completed write", async () => {
  jest.useFakeTimers();
  const close = jest.fn();
  const success = jest.fn();
  const view = render(
    <React.StrictMode>
      <NFCRegistrationModal
        entry={raw[0]}
        onClose={close}
        onSuccess={success}
      />
    </React.StrictMode>,
  );
  act(() => jest.runOnlyPendingTimers());
  expect(
    mockSend.mock.calls.filter(([event]) => event === "register_tag_start"),
  ).toHaveLength(1);
  act(() =>
    mockHandlers.get("tag_registered")({
      data: { placement: { row: 2, col: 3, beacon: true } },
    }),
  );
  expect(screen.getByText(/Row 3/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Done"));
  expect(success).toHaveBeenCalled();
  view.unmount();
  expect(
    mockSend.mock.calls.filter(([event]) => event === "register_tag_cancel"),
  ).toHaveLength(0);
});
test("closing pending registration cancels it; offline registration never starts", () => {
  jest.useFakeTimers();
  const view = render(
    <NFCRegistrationModal
      entry={raw[0]}
      onClose={() => {}}
      onSuccess={() => {}}
    />,
  );
  act(() => jest.runOnlyPendingTimers());
  view.unmount();
  expect(mockSend).toHaveBeenCalledWith("register_tag_cancel", {});
  mockSend.mockClear();
  mockSocket.connected = false;
  render(
    <NFCRegistrationModal
      entry={raw[0]}
      onClose={() => {}}
      onSuccess={() => {}}
    />,
  );
  act(() => jest.runOnlyPendingTimers());
  expect(mockSend).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("offline");
});

test("an NFC scan navigates to a sample excluded by current filters", async () => {
  const NFCScanner = require("./components/nfc/NFCScanner").default;
  render(
    <MemoryRouter initialEntries={["/entry/beach"]}>
      <DataProvider>
        <Probe />
        <NFCScanner />
        <Routes>
          <Route path="/entry/:entryId" element={<EntryView />} />
        </Routes>
      </DataProvider>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "# Shore" });
  fireEvent.click(screen.getByText("Beach only"));
  act(() => mockHandlers.get("tag_scanned")({ data: { entry_id: "peak" } }));
  expect(
    await screen.findByRole("heading", { name: "# Peak" }),
  ).toBeInTheDocument();
  expect(screen.getByTestId("count")).toHaveTextContent("1");
});
