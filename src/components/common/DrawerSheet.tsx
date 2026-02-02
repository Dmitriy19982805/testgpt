import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface DrawerSheetProps {
  open: boolean;
  title: ReactNode;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

const focusableSelector =
  "a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex='-1'])";

export function DrawerSheet({ open, title, onOpenChange, children }: DrawerSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [isVisible, setIsVisible] = useState(open);
  const [isActive, setIsActive] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const transitionDuration = prefersReducedMotion ? 0 : 240;

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      if (prefersReducedMotion) {
        setIsActive(true);
        return;
      }
      setIsActive(false);
      const frame = window.requestAnimationFrame(() => {
        setIsActive(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (isVisible) {
      setIsActive(false);
      if (prefersReducedMotion) {
        setIsVisible(false);
      }
    }
  }, [open, isVisible, prefersReducedMotion]);

  useEffect(() => {
    if (open || !isVisible || prefersReducedMotion) {
      return;
    }
    const panel = panelRef.current;
    if (!panel) {
      setIsVisible(false);
      return;
    }
    let finished = false;
    const finalize = () => {
      if (finished) {
        return;
      }
      finished = true;
      panel.removeEventListener("transitionend", handleTransitionEnd);
      window.clearTimeout(timeout);
      setIsVisible(false);
    };
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== panel) {
        return;
      }
      if (event.propertyName !== "opacity" && event.propertyName !== "transform") {
        return;
      }
      finalize();
    };
    const timeout = window.setTimeout(finalize, transitionDuration + 50);
    panel.addEventListener("transitionend", handleTransitionEnd);
    return finalize;
  }, [open, isVisible, prefersReducedMotion, transitionDuration]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible]);

  useEffect(() => {
    if (!open) {
      return;
    }

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusPanel = () => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => !element.hasAttribute("disabled"));
      const target = focusables[0] ?? panel;
      target.focus();
    };

    const frame = window.requestAnimationFrame(focusPanel);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeElement === first || !panel.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [open, onOpenChange]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end">
      <button
        type="button"
        className={
          "absolute inset-0 bg-slate-900/30 transition-opacity duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 " +
          (isActive ? "opacity-100" : "opacity-0")
        }
        aria-label="Закрыть"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          "glass-card relative flex w-full max-w-full flex-col overflow-hidden rounded-t-[32px] transition-[transform,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 md:h-full md:w-[460px] md:max-w-[460px] md:rounded-none max-h-[90vh] md:max-h-none origin-bottom md:origin-right " +
          (isActive
            ? "translate-y-0 md:translate-x-0 opacity-100 scale-100"
            : "translate-y-full md:translate-x-full opacity-0 scale-[0.98]")
        }
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 dark:border-slate-800/60">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-3"
          >
            <X size={16} />
            Закрыть
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
