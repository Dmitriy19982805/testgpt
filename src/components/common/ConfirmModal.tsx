import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../ui/button";

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
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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

  if (!open) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="glass-card relative w-full max-w-md rounded-2xl border border-white/40 px-6 py-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.25)] dark:border-slate-800/70"
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
