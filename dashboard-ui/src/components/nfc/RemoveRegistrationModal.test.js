import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import RemoveRegistrationModal from "./RemoveRegistrationModal";
const mockHandlers = new Map();
const mockSend = jest.fn(() => true);
const mockRegister = (event, handler) => { mockHandlers.set(event, handler); return () => mockHandlers.delete(event); };
let mockConnected = true;
jest.mock("../../hooks/useWebSocket", () => ({ useWebSocket: () => ({ connected: mockConnected, sendMessage: mockSend, registerHandler: mockRegister }) }));
const entry = { uuid: "one", title: "Torrent de Chenna" };
beforeEach(() => { mockHandlers.clear(); mockSend.mockReset(); mockSend.mockReturnValue(true); mockConnected = true; });
test("opening and cancelling never send removal", () => {
  const close = jest.fn();
  render(<RemoveRegistrationModal entry={entry} onClose={close} />);
  expect(screen.getByRole("dialog", { name: "Remove sample registration?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(mockSend).not.toHaveBeenCalled();
});
test("confirmation targets this entry and waits for its server acknowledgement", () => {
  const close = jest.fn();
  render(<RemoveRegistrationModal entry={entry} onClose={close} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove registration" }));
  expect(mockSend).toHaveBeenCalledWith("remove_sample_registration", { entry_id: "one" });
  expect(screen.getByRole("button", { name: "Removing…" })).toBeDisabled();
  act(() => mockHandlers.get("sample_registration_removed")({ data: { entry_id: "other" } }));
  expect(close).not.toHaveBeenCalled();
  act(() => mockHandlers.get("sample_registration_removed")({ data: { entry_id: "one" } }));
  expect(close).toHaveBeenCalledTimes(1);
});
test("offline viewers cannot confirm removal", () => {
  mockConnected = false;
  render(<RemoveRegistrationModal entry={entry} onClose={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Remove registration" })).toBeDisabled();
  expect(mockSend).not.toHaveBeenCalled();
});
test("server failure is visible and permits retry", () => {
  render(<RemoveRegistrationModal entry={entry} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove registration" }));
  act(() => mockHandlers.get("sample_registration_remove_error")({ data: { entry_id: "one", message: "Please retry" } }));
  expect(screen.getByRole("alert")).toHaveTextContent("Please retry");
  expect(screen.getByRole("button", { name: "Remove registration" })).toBeEnabled();
});
