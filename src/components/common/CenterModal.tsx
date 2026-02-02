import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface CenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function CenterModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: CenterModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState(open);
  const [isActive, setIsActive] = useState(false);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const transitionDuration = prefersReducedMotion ? 0 : 260;

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
    const modal = modalRef.current;
    if (!modal) {
      setIsVisible(false);
      return;
    }
    let finished = false;
    const finalize = () => {
      if (finished) {
        return;
      }
      finished = true;
      modal.removeEventListener("transitionend", handleTransitionEnd);
      window.clearTimeout(timeout);
      setIsVisible(false);
    };
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== modal) {
        return;
      }
      if (event.propertyName !== "opacity" && event.propertyName !== "transform") {
        return;
      }
      finalize();
    };
    const timeout = window.setTimeout(finalize, transitionDuration + 50);
    modal.addEventListener("transitionend", handleTransitionEnd);
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [open, onOpenChange]);

  if (!isVisible) {
    return null;
  }

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className={
          "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 " +
          (isActive ? "opacity-100" : "opacity-0")
        }
        aria-label="Закрыть"
        onClick={handleClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={
          "glass-card relative z-[60] w-full max-w-[520px] rounded-2xl border border-white/40 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 dark:border-slate-800/70 origin-center " +
          (isActive ? "opacity-100 scale-100" : "opacity-0 scale-[0.96]")
        }
      >
        <div className="space-y-1">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        {children ? <div className="mt-4 space-y-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex w-full gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
