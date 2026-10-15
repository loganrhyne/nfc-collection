import React from "react";
import { act, render, screen } from "@testing-library/react";
import EntryView from "./EntryView";
const mockHandlers = new Map();
const mockSend = jest.fn();
const mockRegister = (event, handler) => { mockHandlers.set(event, handler); return () => mockHandlers.delete(event); };
const mockSelect = jest.fn();
const mockEntry = { uuid: "one", creationDate: "2025-01-01" };
jest.mock("react-router-dom", () => ({ useParams: () => ({ entryId: "one" }), useNavigate: () => jest.fn() }));
jest.mock("../../context/DataContext", () => ({ useData: () => ({ getEntryByUUID: () => mockEntry, setSelectedEntry: mockSelect }) }));
jest.mock("../../hooks/useWebSocket", () => ({ useWebSocket: () => ({ connected: true, sendMessage: mockSend, registerHandler: mockRegister }) }));
jest.mock("./JournalContent", () => () => null);
jest.mock("../layout/Archive", () => ({ ArchiveState: () => null, SpecimenList: () => null }));
jest.mock("../nfc/NFCRegistrationModal", () => () => null);
function locations(samples) { act(() => mockHandlers.get("sample_locations")({ data: { samples } })); }
test("shows stored one-based placement, including the first cell", () => {
  render(<EntryView />);
  expect(mockSend).toHaveBeenCalledWith("get_sample_locations", {});
  locations({ one: { row: 0, col: 0 } });
  expect(screen.getByText("Row 1 / Column 1")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Register sample/ })).not.toBeInTheDocument();
});
test("registration updates replace the button on the open journal page", () => {
  render(<EntryView />);
  locations({});
  expect(screen.getByRole("button", { name: /Register sample/ })).toBeInTheDocument();
  locations({ one: { row: 3, col: 12 } });
  expect(screen.getByText("Row 4 / Column 13")).toBeInTheDocument();
});
test("saved sample without an assigned cell cannot be mistaken for unregistered", () => {
  render(<EntryView />); locations({ one: null });
  expect(screen.getByText(/Sample registered · Position unavailable/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Register sample/ })).not.toBeInTheDocument();
});
