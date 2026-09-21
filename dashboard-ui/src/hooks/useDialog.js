import { useEffect, useRef } from "react";
export default function useDialog(open, onClose) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const node = ref.current;
    const controls = () =>
      [
        ...node.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length);
    (controls()[0] || node).focus();
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const items = controls();
        if (!items.length) {
          e.preventDefault();
          node.focus();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === items[0] ||
            document.activeElement === node)
        ) {
          e.preventDefault();
          items.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    node.addEventListener("keydown", key);
    return () => {
      node.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open]);
  return ref;
}
