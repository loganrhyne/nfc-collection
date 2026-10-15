import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import NFCRegistrationModal from "./NFCRegistrationModal";
const mockHandlers = new Map();
const mockSend = jest.fn();
const mockRegister = (event, handler) => { mockHandlers.set(event, handler); return () => mockHandlers.delete(event); };
jest.mock("../../hooks/useWebSocket", () => ({ useWebSocket: () => ({ connected: true, sendMessage: mockSend, registerHandler: mockRegister }) }));
beforeEach(() => { jest.useFakeTimers(); mockSend.mockReset(); mockSend.mockReturnValue(true); });
afterEach(() => jest.useRealTimers());
test("conflict requires an explicit confirmation bound to the scanned tag and old entry", () => {
  render(<NFCRegistrationModal entry={{ uuid: "NEW", title: "Correct journal" }} onClose={jest.fn()} onSuccess={jest.fn()} />);
  act(() => jest.runOnlyPendingTimers());
  expect(mockSend).toHaveBeenCalledWith("register_tag_start", expect.objectContaining({ entry_id: "NEW" }));
  act(() => mockHandlers.get("registration_conflict")({ data: { entry_id: "NEW", tag_uid: "AA", previous_entry_id: "OLD", previous_title: "Wrong journal" } }));
  expect(screen.getByText("Wrong journal")).toBeInTheDocument();
  expect(mockSend).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Replace link and rewrite tag" }));
  expect(mockSend).toHaveBeenLastCalledWith("register_tag_start", {
    entry_id: "NEW", overwrite_tag_uid: "AA", overwrite_entry_id: "OLD",
  });
  expect(screen.getByRole("heading", { name: "Place the sample on the reader." })).toBeInTheDocument();
});
