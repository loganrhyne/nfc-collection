import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import LEDModePill from "./LEDModePill";
const mockHandlers = new Map();
const mockSend = jest.fn();
const mockData = {
  allEntries: [{ uuid: "one", type: "Beach", creationDate: "2025-01-01" }],
  entries: [],
  selectedEntry: null,
};
jest.mock("../../context/DataContext", () => ({ useData: () => mockData }));
jest.mock("../../hooks/useWebSocket", () => ({
  useWebSocket: () => ({
    connected: true,
    sendMessage: mockSend,
    registerHandler: (event, handler) => {
      mockHandlers.set(event, handler);
      return () => mockHandlers.delete(event);
    },
  }),
}));
const mockLED = { updateLEDs: jest.fn(), getEntryIndex: () => 0 };
jest.mock("../../hooks/useLEDController", () => ({
  useLEDController: () => mockLED,
}));
beforeEach(() => {
  mockHandlers.clear();
  mockSend.mockClear();
});
test("grid controls preserve brightness and visualization commands", () => {
  render(<LEDModePill />);
  act(() =>
    mockHandlers.get("led_status")({
      type: "led_status",
      data: { status: { current_mode: "interactive" } },
    }),
  );
  fireEvent.click(screen.getByTitle("Click to configure LED mode"));
  fireEvent.change(screen.getByRole("slider", { name: "Brightness" }), {
    target: { value: "65" },
  });
  expect(mockSend).toHaveBeenCalledWith("led_brightness", { brightness: 0.65 });
  fireEvent.click(
    screen.getByRole("button", { name: "Visualization", exact: true }),
  );
  expect(mockSend).toHaveBeenCalledWith(
    "led_update",
    expect.objectContaining({ command: "set_mode", mode: "visualization" }),
  );
  fireEvent.change(
    screen.getByRole("slider", { name: "Visualization duration" }),
    { target: { value: "120" } },
  );
  expect(mockSend).toHaveBeenCalledWith("visualization_control", {
    command: "set_duration",
    duration: 120,
  });
});
test("enabling interactive mode with an empty result does not light the entire collection", () => {
  render(<LEDModePill />);
  fireEvent.click(screen.getByTitle("Click to configure LED mode"));
  fireEvent.click(screen.getByRole("checkbox", { name: "Grid power" }));
  expect(mockSend).toHaveBeenCalledWith(
    "led_update",
    expect.objectContaining({ mode: "interactive", interactiveLedData: [] }),
  );
});
