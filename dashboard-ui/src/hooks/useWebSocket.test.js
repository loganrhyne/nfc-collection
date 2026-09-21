import React, { useEffect } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import io from "socket.io-client";
import { WebSocketProvider, useWebSocket } from "./useWebSocket";
import { DataProvider } from "../context/DataContext";
import { useLEDController } from "./useLEDController";
jest.mock("socket.io-client", () => jest.fn());
let socket, handlers, dispatch;
beforeEach(() => {
  handlers = {};
  socket = {
    connected: false,
    id: "test",
    on: jest.fn((event, fn) => {
      handlers[event] = fn;
    }),
    io: { on: jest.fn(), removeAllListeners: jest.fn() },
    onAny: jest.fn((fn) => {
      dispatch = fn;
    }),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
  };
  io.mockClear();
  io.mockReturnValue(socket);
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) });
});
function Consumer({ onScan }) {
  const { connected, sendMessage, registerHandler } = useWebSocket();
  useEffect(
    () => registerHandler("tag_scanned", onScan),
    [registerHandler, onScan],
  );
  return (
    <>
      <span>{connected ? "online" : "offline"}</span>
      <button
        onClick={() => sendMessage("register_tag_start", { entry_id: "test" })}
      >
        Register
      </button>
    </>
  );
}
test("consumers share one connection and multiple event subscribers", () => {
  const a = jest.fn(),
    b = jest.fn();
  const view = render(
    <WebSocketProvider>
      <Consumer onScan={a} />
      <Consumer onScan={b} />
    </WebSocketProvider>,
  );
  expect(io).toHaveBeenCalledTimes(1);
  act(() => {
    socket.connected = true;
    handlers.connect();
    dispatch("tag_scanned", { entry_id: "test" });
  });
  expect(a).toHaveBeenCalledWith({
    type: "tag_scanned",
    data: { entry_id: "test" },
  });
  expect(b).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
});
test("an offline registration is never replayed after reconnect", () => {
  render(
    <WebSocketProvider>
      <Consumer onScan={() => {}} />
    </WebSocketProvider>,
  );
  fireEvent.click(screen.getByText("Register"));
  act(() => {
    socket.connected = true;
    handlers.connect();
  });
  expect(
    socket.emit.mock.calls.filter(([type]) => type === "register_tag_start"),
  ).toHaveLength(0);
});
function LEDs() {
  useLEDController();
  return null;
}
test("LED state is re-sent after reconnect even if filters have not changed", async () => {
  await act(async () =>
    render(
      <DataProvider>
        <WebSocketProvider>
          <LEDs />
        </WebSocketProvider>
      </DataProvider>,
    ),
  );
  act(() => {
    socket.connected = true;
    handlers.connect();
  });
  expect(
    socket.emit.mock.calls.filter(([type]) => type === "led_update"),
  ).toHaveLength(1);
  act(() => {
    socket.connected = false;
    handlers.disconnect("transport close");
  });
  act(() => {
    socket.connected = true;
    handlers.connect();
  });
  expect(
    socket.emit.mock.calls.filter(([type]) => type === "led_update"),
  ).toHaveLength(2);
});
