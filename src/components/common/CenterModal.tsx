import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { useBodyScrollLock } from "./useBodyScrollLock";

interface CenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  showCloseButton?: boolean;
}

export function CenterModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  containerClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  showCloseButton = false,
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

  useBodyScrollLock(isVisible);

  useEffect(() => {
    if (!open) {
      return;
    }

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      lastFocusedRef.current?.focus();
    };
  }, [open, onOpenChange]);

  if (!isVisible) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const handleClose = () => {
    onOpenChange(false);
  };

  const baseModalClassName =
    "relative z-[10000] w-full transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 origin-center ";
  const defaultShellClassName =
    "glass-card max-w-[520px] rounded-2xl border border-white/40 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] dark:border-slate-800/70";
  const shellClassName = className ?? defaultShellClassName;
  const headerClasses = headerClassName ?? "space-y-1";
  const bodyClasses = bodyClassName ?? "mt-4 space-y-4";
  const containerClasses = containerClassName ?? "fixed inset-0 z-[9999] overflow-hidden overflow-y-auto";
  const footerClasses = footerClassName ?? "mt-6 flex w-full gap-3";

  return createPortal(
    <div className={containerClasses} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={
          "fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm transition-opacity duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 " +
          (isActive ? "opacity-100" : "opacity-0")
        }
        aria-label="Закрыть"
        onClick={(event) => {
          event.stopPropagation();
          handleClose();
        }}
      />
      <div className="relative flex min-h-full w-full items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={
            `${baseModalClassName}${shellClassName} ` +
            (isActive
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-[0.98] translate-y-3")
          }
          onClick={(event) => event.stopPropagation()}
        >
          <div className={headerClasses}>
            <div className="flex items-start justify-between gap-4">
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
              {showCloseButton ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full border border-slate-200/70 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                  aria-label="Закрыть"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
          </div>
          {children ? <div className={bodyClasses}>{children}</div> : null}
          {footer ? <div className={footerClasses}>{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
