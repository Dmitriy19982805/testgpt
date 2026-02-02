import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../ui/button";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

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
  const [isClosing, setIsClosing] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const transitionDuration = prefersReducedMotion ? 0 : 240;

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
      setIsClosing(false);
      return;
    }

    if (isVisible) {
      setIsClosing(true);
      const timer = window.setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, transitionDuration);
      return () => window.clearTimeout(timer);
    }
  }, [open, isVisible, transitionDuration]);

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
    const frame = window.requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

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
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [open, onOpenChange, isLoading]);

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

  const isActive = open && !isClosing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className={
          "absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 " +
          (isActive ? "opacity-100" : "opacity-0")
        }
        aria-label="Закрыть"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={
          "glass-card relative w-full max-w-md rounded-2xl border border-white/40 px-6 py-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.25)] transition-[transform,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 dark:border-slate-800/70 " +
          (isActive ? "opacity-100 scale-100" : "opacity-0 scale-[0.96]")
        }
      >
        <h2
          id={titleId}
          className="text-lg font-semibold text-slate-900 dark:text-slate-50"
        >
          {title}
        </h2>
        {description ? (
          <p
            id={descriptionId}
            className="mt-2 text-sm text-slate-500 dark:text-slate-400"
          >
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-2xl bg-white/70 text-slate-700 hover:bg-white/90 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800/80"
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
  );
}
