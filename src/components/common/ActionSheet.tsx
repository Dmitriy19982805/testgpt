import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../ui/utils";

export interface ActionSheetAction {
  label: ReactNode;
  onSelect: () => void;
  tone?: "default" | "destructive";
}

interface ActionSheetProps {
  open: boolean;
  actions: ActionSheetAction[];
  onClose: () => void;
  cancelLabel?: ReactNode;
}

export function ActionSheet({
  open,
  actions,
  onClose,
  cancelLabel = "Отмена",
}: ActionSheetProps) {
  if (!open) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={(event) => { event.stopPropagation(); onClose(); }}
      />
      <div className="relative z-[10000] w-full max-w-md px-4 pb-6">
        <div className="glass-card overflow-hidden rounded-[28px]">
          <div className="divide-y divide-slate-200/70 text-center text-sm dark:divide-slate-800/70">
            {actions.map((action, index) => (
              <button
                key={`${index}-${String(action.label)}`}
                type="button"
                className={cn(
                  "w-full px-4 py-3 font-medium transition hover:bg-white/40 dark:hover:bg-slate-800/40",
                  action.tone === "destructive"
                    ? "text-rose-500 hover:text-rose-600"
                    : "text-slate-700 dark:text-slate-100"
                )}
                onClick={(event) => { event.stopPropagation(); action.onSelect(); }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="glass-card w-full rounded-[28px] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white/50 dark:text-slate-100 dark:hover:bg-slate-800/50"
            onClick={(event) => { event.stopPropagation(); onClose(); }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
