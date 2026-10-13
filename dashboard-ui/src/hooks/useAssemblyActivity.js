import { useEffect } from "react";
import { useWebSocket } from "./useWebSocket";

// User input is activity; render updates, reconnects and heartbeats are not.
// Physical Pi input is also watched by the backend to wake a dark display.
export default function useAssemblyActivity() {
  const { connected, sendMessage } = useWebSocket();
  useEffect(() => {
    if (!connected) return;
    let lastSent = -Infinity;
    const activity = (event) => {
      if (!event.isTrusted) return;
      const now = performance.now();
      if (now - lastSent < 1000) return;
      lastSent = now;
      sendMessage("user_activity");
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel"];
    events.forEach((type) => window.addEventListener(type, activity, { passive: true }));
    return () => events.forEach((type) => window.removeEventListener(type, activity));
  }, [connected, sendMessage]);
}
