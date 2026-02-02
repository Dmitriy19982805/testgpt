import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface OriginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originRect: DOMRect | null;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "danger";
  className?: string;
  contentClassName?: string;
}

interface TransformState {
  offsetX: number;
  offsetY: number;
  scale: number;
  fallback: boolean;
}

const DEFAULT_TRANSFORM: TransformState = {
  offsetX: 0,
  offsetY: 0,
  scale: 0.96,
  fallback: true,
};

export function OriginModal({
  open,
  onOpenChange,
  originRect,
  title,
  description,
  children,
  footer,
  variant = "default",
  className,
  contentClassName,
}: OriginModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState(open);
  const [isActive, setIsActive] = useState(false);
  const [transformState, setTransformState] = useState<TransformState>(DEFAULT_TRANSFORM);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const transitionDuration = prefersReducedMotion ? 0 : 280;

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

  useLayoutEffect(() => {
    if (!isVisible) {
      return;
    }
    const modal = modalRef.current;
    if (!modal || !originRect) {
      setTransformState(DEFAULT_TRANSFORM);
      return;
    }
    const modalRect = modal.getBoundingClientRect();
    const originCenterX = originRect.left + originRect.width / 2;
    const originCenterY = originRect.top + originRect.height / 2;
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const offsetX = originCenterX - viewportCenterX;
    const offsetY = originCenterY - viewportCenterY;
    const scaleX = 40 / Math.max(modalRect.width, 1);
    const scaleY = 40 / Math.max(modalRect.height, 1);
    const scale = Math.max(0.08, Math.min(0.3, scaleX, scaleY));
    setTransformState({
      offsetX,
      offsetY,
      scale,
      fallback: false,
    });
  }, [originRect, isVisible]);

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

  const { offsetX, offsetY, scale, fallback } = transformState;
  const inactiveTransform = fallback
    ? "scale(0.96)"
    : `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  const activeTransform = "translate(0px, 0px) scale(1)";

  return (
    <>
      <div
        className={
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 " +
          (isActive ? "opacity-100" : "opacity-0")
        }
        aria-hidden="true"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={
            "relative z-[60] flex flex-col rounded-2xl border bg-white/95 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 dark:bg-slate-900/80 " +
            (variant === "danger" ? "border-rose-200/70 dark:border-rose-500/40" : "border-white/40 dark:border-slate-800/70") +
            " origin-center overflow-hidden" +
            (className ? ` ${className}` : "")
          }
          style={{
            transform: prefersReducedMotion ? activeTransform : isActive ? activeTransform : inactiveTransform,
            opacity: isActive ? 1 : 0,
          }}
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
          {children ? (
            <div
              className={`mt-4 flex min-h-0 flex-1 flex-col space-y-4${
                contentClassName ? ` ${contentClassName}` : ""
              }`}
            >
              {children}
            </div>
          ) : null}
          {footer ? <div className="mt-6 flex w-full shrink-0 gap-3">{footer}</div> : null}
        </div>
      </div>
    </>
  );
}
