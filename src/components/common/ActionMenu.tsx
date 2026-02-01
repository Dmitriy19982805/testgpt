import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActionSheet, type ActionSheetAction } from "./ActionSheet";
import { cn } from "../ui/utils";

interface ActionMenuProps {
  open: boolean;
  actions: ActionSheetAction[];
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

const DESKTOP_QUERY = "(min-width: 768px)";
const POPOVER_PADDING = 12;
const POPOVER_OFFSET = 8;

export function ActionMenu({ open, actions, onClose, anchorEl }: ActionMenuProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (!open || !isDesktop) {
      return;
    }
    setPosition((prev) => ({ ...prev, ready: false }));
    updatePosition();
  }, [open, isDesktop, actions.length, anchorEl]);

  useEffect(() => {
    if (!open || !isDesktop) {
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

  if (!open) {
    return null;
  }

  if (!isDesktop) {
    return <ActionSheet open={open} actions={actions} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className={cn(
          "fixed min-w-[180px] transition-opacity",
          position.ready ? "opacity-100" : "opacity-0"
        )}
        style={{ top: position.top, left: position.left }}
      >
        <div className="glass-card rounded-2xl border border-white/40 shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:border-slate-800/70">
          <div className="py-1 text-sm">
            {actions.map((action, index) => (
              <button
                key={`${index}-${String(action.label)}`}
                type="button"
                className={cn(
                  "w-full px-4 py-2.5 text-left font-medium transition hover:bg-white/50 dark:hover:bg-slate-800/50",
                  action.tone === "destructive"
                    ? "text-rose-500 hover:text-rose-600"
                    : "text-slate-700 dark:text-slate-100"
                )}
                onClick={action.onSelect}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
