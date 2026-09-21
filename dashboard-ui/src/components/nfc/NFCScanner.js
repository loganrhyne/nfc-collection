import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWebSocket } from "../../hooks/useWebSocket";
export default function NFCScanner() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const currentPath = useRef(pathname);
  currentPath.current = pathname;
  const { registerHandler } = useWebSocket();
  useEffect(
    () =>
      registerHandler("tag_scanned", (message) => {
        const id = message.data?.entry_id;
        if (typeof id !== "string" || !id) return;
        const destination = `/entry/${encodeURIComponent(id)}`;
        if (currentPath.current !== destination) navigate(destination);
      }),
    [navigate, registerHandler],
  );
  return null;
}
