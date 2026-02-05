import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../ui/button";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useBodyScrollLock } from "./useBodyScrollLock";

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  loadingText?: string;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Удалить",
  cancelText = "Отмена",
  onConfirm,
  loadingText = "Удаление...",
}: ConfirmModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(open);
  const [isShown, setIsShown] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const transitionDuration = prefersReducedMotion ? 0 : 200;
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (open) {
      setIsLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      if (prefersReducedMotion) {
        setIsShown(true);
        return;
      }
      setIsShown(false);
      const frame = window.requestAnimationFrame(() => {
        setIsShown(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (isVisible) {
      setIsShown(false);
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

  useBodyScrollLock(isVisible);

  useEffect(() => {
    if (!open) {
      return;
    }

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusDelay = prefersReducedMotion ? 0 : transitionDuration;
    const focusTimeout = window.setTimeout(() => {
      cancelButtonRef.current?.focus({ preventScroll: true });
    }, focusDelay);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isLoading) {
          onOpenChange(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [open, onOpenChange, isLoading, prefersReducedMotion, transitionDuration]);

  if (!isVisible) {
    return null;
  }

  const handleClose = () => {
    if (isLoading) {
      return;
    }
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      await onConfirm();
      if (mountedRef.current) {
        onOpenChange(false);
      }
    } catch {
      // Intentionally ignore errors to keep the modal open.
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={
          "absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-[180ms] ease-out motion-reduce:transition-none motion-reduce:duration-0 " +
          (isShown ? "opacity-100" : "opacity-0")
        }
        aria-label="Закрыть"
        onClick={handleClose}
      />
      <div className="relative flex min-h-full w-full items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={
            "relative z-[60] w-full max-w-[520px] rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xl transition-[transform,opacity] duration-[200ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0 origin-center will-change-[transform,opacity] sm:p-8 " +
            (isShown
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-[0.96] translate-y-2")
          }
          onClick={(event) => event.stopPropagation()}
        >
          <h2
            id={titleId}
            className="text-lg font-semibold text-slate-900"
          >
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mt-2 text-sm text-slate-500"
            >
              {description}
            </p>
          ) : null}
          <div className="mt-6 flex w-full gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={handleClose}
              disabled={isLoading}
              ref={cancelButtonRef}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-2xl bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? loadingText : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
