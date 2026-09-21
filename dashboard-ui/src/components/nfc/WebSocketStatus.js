import React from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
export default function WebSocketStatus() {
  const { connected, reconnect, reconnectAttempt } = useWebSocket();
  return (
    <button
      className="connection-button"
      onClick={() => !connected && reconnect()}
      title={
        connected
          ? "Connected to the display server"
          : "Retry connection to the display server"
      }
    >
      <span className={`connection-dot ${connected ? "online" : ""}`} />
      <span role="status">
        {connected
          ? "Display connected"
          : reconnectAttempt
            ? "Reconnecting…"
            : "Display offline"}
      </span>
    </button>
  );
}
