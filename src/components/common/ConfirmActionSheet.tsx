import { useEffect, useId, useRef, useState } from "react";

interface ConfirmActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  loadingText?: string;
}

export function ConfirmActionSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Удалить",
  cancelText = "Отмена",
  onConfirm,
  loadingText = "Удаление...",
}: ConfirmActionSheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [isVisible, setIsVisible] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
      setIsLoading(false);
      return;
    }

    if (isVisible) {
      setIsClosing(true);
      const timer = window.setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 240);
      return () => window.clearTimeout(timer);
    }
  }, [open, isVisible]);

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
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange, isLoading]);

  if (!isVisible) {
    return null;
  }

  const isActive = open && !isClosing;

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
      // Intentionally ignore errors to keep the sheet open.
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className={
          "fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-[240ms] ease-out " +
          (isActive ? "opacity-100" : "opacity-0")
        }
        aria-label="Закрыть"
        onClick={handleClose}
      />
      <div className="relative z-[60] w-full max-w-md px-4 pb-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={
            "glass-card overflow-hidden rounded-[28px] text-center transition-transform duration-[240ms] ease-out " +
            (isActive ? "translate-y-0" : "translate-y-full")
          }
        >
          <div className="px-6 pb-4 pt-5">
            <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-2 text-xs text-slate-500 dark:text-slate-400"
              >
                {description}
              </p>
            ) : null}
          </div>
          <div className="divide-y divide-slate-200/70 text-sm dark:divide-slate-800/70">
            <button
              type="button"
              className="w-full px-4 py-3 font-semibold text-rose-500 transition hover:bg-white/40 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-60 dark:hover:bg-slate-800/40"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? loadingText : confirmText}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="glass-card w-full rounded-[28px] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white/50 disabled:pointer-events-none disabled:opacity-60 dark:text-slate-100 dark:hover:bg-slate-800/50"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
