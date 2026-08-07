import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type InertSnapshot = {
  element: HTMLElement;
  inert: boolean;
  ariaHidden: string | null;
};

/**
 * Shared modal behavior for the two public mobile drawers.
 * Keeps keyboard focus inside, locks document scroll, makes the background
 * inert, closes on Escape, and restores focus to the opener.
 */
export default function useModalDialog(
  open: boolean,
  onClose: () => void
) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const returnTarget = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const inertSnapshots: InertSnapshot[] = [];

    // Walk from the dialog to <body>, making every sibling branch inert.
    let branch: HTMLElement = dialog;
    while (branch.parentElement && branch.parentElement !== document.body) {
      const parent = branch.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (
          sibling === branch ||
          !(sibling instanceof HTMLElement) ||
          sibling.hasAttribute("data-modal-companion")
        )
          continue;
        inertSnapshots.push({
          element: sibling,
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute("aria-hidden"),
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      }
      branch = parent;
    }

    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.hasAttribute("disabled") && element.offsetParent !== null
      );

    const frame = window.requestAnimationFrame(() => {
      const initial =
        dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]") ??
        focusable()[0] ??
        dialog;
      initial.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const snapshot of inertSnapshots) {
        snapshot.element.inert = snapshot.inert;
        if (snapshot.ariaHidden === null) {
          snapshot.element.removeAttribute("aria-hidden");
        } else {
          snapshot.element.setAttribute("aria-hidden", snapshot.ariaHidden);
        }
      }
      if (returnTarget?.isConnected) {
        window.requestAnimationFrame(() => returnTarget.focus());
      }
    };
  }, [open, onClose]);

  return { dialogRef, triggerRef };
}
