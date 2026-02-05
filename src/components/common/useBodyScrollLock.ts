import { useEffect } from "react";

let lockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";

function lockBodyScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const body = document.body;
  if (lockCount === 0) {
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;

    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      body.style.paddingRight = previousBodyPaddingRight
        ? `calc(${previousBodyPaddingRight} + ${scrollBarWidth}px)`
        : `${scrollBarWidth}px`;
    }
  }

  lockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === "undefined" || lockCount === 0) {
    return;
  }

  lockCount -= 1;
  if (lockCount > 0) {
    return;
  }

  const body = document.body;
  body.style.overflow = previousBodyOverflow;
  body.style.paddingRight = previousBodyPaddingRight;
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}
