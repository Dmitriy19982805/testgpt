import { useEffect } from "react";

let lockCount = 0;
let previousHtmlOverflow = "";

function lockPageScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const html = document.documentElement;
  if (lockCount === 0) {
    previousHtmlOverflow = html.style.overflow;
    html.style.overflow = "hidden";
  }

  lockCount += 1;
}

function unlockPageScroll() {
  if (typeof document === "undefined" || lockCount === 0) {
    return;
  }

  lockCount -= 1;
  if (lockCount > 0) {
    return;
  }

  const html = document.documentElement;
  html.style.overflow = previousHtmlOverflow;
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    lockPageScroll();
    return () => {
      unlockPageScroll();
    };
  }, [locked]);
}
