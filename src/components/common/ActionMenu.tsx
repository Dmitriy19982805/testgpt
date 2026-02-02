import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ActionSheet } from "./ActionSheet";
import { cn } from "../ui/utils";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface ActionMenuLabels {
  edit?: ReactNode;
  delete?: ReactNode;
  cancel?: ReactNode;
}

interface ActionMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  labels?: ActionMenuLabels;
  anchorEl?: HTMLElement | null;
}

const DESKTOP_QUERY = "(min-width: 768px)";
const POPOVER_PADDING = 12;
const POPOVER_OFFSET = 8;

export function ActionMenu({
  open,
  onOpenChange,
  onEdit,
  onDelete,
  labels,
  anchorEl,
}: ActionMenuProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(open);
  const [isActive, setIsActive] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const transitionDuration = prefersReducedMotion ? 0 : 240;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsActive(false);
      if (prefersReducedMotion) {
        setIsActive(true);
      }
      return;
    }

    if (isVisible) {
      setIsActive(false);
      if (!isDesktop || prefersReducedMotion) {
        setIsVisible(false);
      }
    }
  }, [open, isVisible, isDesktop, prefersReducedMotion]);

  useEffect(() => {
    if (!open || !isDesktop || !isVisible) {
      return;
    }
    if (!position.ready) {
      return;
    }
    if (prefersReducedMotion) {
      setIsActive(true);
      return;
    }
    setIsActive(false);
    const frame = window.requestAnimationFrame(() => {
      setIsActive(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, isDesktop, isVisible, position.ready, prefersReducedMotion]);

  useEffect(() => {
    if (open || !isVisible || !isDesktop || prefersReducedMotion) {
      return;
    }
    setIsActive(false);
    const menu = menuRef.current;
    if (!menu) {
      setIsVisible(false);
      return;
    }
    let finished = false;
    const finalize = () => {
      if (finished) {
        return;
      }
      finished = true;
      menu.removeEventListener("transitionend", handleTransitionEnd);
      window.clearTimeout(timeout);
      setIsVisible(false);
    };
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== menu) {
        return;
      }
      if (event.propertyName !== "opacity" && event.propertyName !== "transform") {
        return;
      }
      finalize();
    };
    const timeout = window.setTimeout(finalize, transitionDuration + 50);
    menu.addEventListener("transitionend", handleTransitionEnd);
    return finalize;
  }, [open, isVisible, isDesktop, prefersReducedMotion, transitionDuration]);

  useEffect(() => {
    if (!open || !isDesktop) {
      return;
    }
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      if (anchorEl?.contains(target as Node)) {
        return;
      }
      onOpenChange(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, isDesktop, anchorEl, onOpenChange]);

  const updatePosition = () => {
    if (!anchorEl) {
      return;
    }
    const rect = anchorEl.getBoundingClientRect();
    const menu = menuRef.current;
    const menuWidth = menu?.offsetWidth ?? 200;
    const menuHeight = menu?.offsetHeight ?? 0;
    const maxLeft = window.innerWidth - menuWidth - POPOVER_PADDING;
    let left = rect.right - menuWidth;
    left = Math.min(Math.max(left, POPOVER_PADDING), Math.max(POPOVER_PADDING, maxLeft));
    let top = rect.bottom + POPOVER_OFFSET;
    if (top + menuHeight > window.innerHeight - POPOVER_PADDING) {
      top = rect.top - menuHeight - POPOVER_OFFSET;
    }
    top = Math.min(
      Math.max(top, POPOVER_PADDING),
      Math.max(POPOVER_PADDING, window.innerHeight - menuHeight - POPOVER_PADDING)
    );
    setPosition({ top, left, ready: true });
  };

  useLayoutEffect(() => {
    if (!open || !isDesktop || !anchorEl) {
      return;
    }
    setPosition((prev) => ({ ...prev, ready: false }));
    updatePosition();
  }, [open, isDesktop, anchorEl]);

  useEffect(() => {
    if (!open || !isDesktop || !anchorEl) {
      return;
    }
    const handleUpdate = () => updatePosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [open, isDesktop, anchorEl]);

  if (!isVisible) {
    return null;
  }

  const handleEdit = () => {
    onOpenChange(false);
    onEdit();
  };

  const handleDelete = () => {
    onOpenChange(false);
    onDelete();
  };

  if (!isDesktop) {
    return (
      <ActionSheet
        open={open}
        actions={[
          { label: labels?.edit ?? "Редактировать", onSelect: handleEdit },
          {
            label: labels?.delete ?? "Удалить",
            tone: "destructive",
            onSelect: handleDelete,
          },
        ]}
        onClose={() => onOpenChange(false)}
        cancelLabel={labels?.cancel ?? "Отмена"}
      />
    );
  }

  if (!anchorEl) {
    return null;
  }

  const isReady = position.ready && isActive;

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 min-w-[180px] transition-[transform,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0 origin-top-right",
        isReady
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-[0.98]"
      )}
      style={{ top: position.top, left: position.left }}
    >
      <div className="glass-card rounded-2xl border border-white/40 shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:border-slate-800/70">
        <div className="py-1 text-sm">
          <button
            type="button"
            className="w-full px-4 py-2.5 text-left font-medium text-slate-700 transition hover:bg-white/50 dark:text-slate-100 dark:hover:bg-slate-800/50"
            onClick={handleEdit}
          >
            {labels?.edit ?? "Редактировать"}
          </button>
          <button
            type="button"
            className="w-full px-4 py-2.5 text-left font-medium text-rose-500 transition hover:bg-white/50 hover:text-rose-600 dark:hover:bg-slate-800/50"
            onClick={handleDelete}
          >
            {labels?.delete ?? "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}
