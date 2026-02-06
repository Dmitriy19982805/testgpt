import { useEffect } from "react";

let lockCount = 0;
let previousHtmlOverflow = "";
let previousBodyPaddingRight = "";

function lockPageScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const html = document.documentElement;
  const body = document.body;
  if (lockCount === 0) {
    previousHtmlOverflow = html.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
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
  const body = document.body;
  html.style.overflow = previousHtmlOverflow;
  body.style.paddingRight = previousBodyPaddingRight;
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
