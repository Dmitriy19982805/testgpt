import * as React from "react";
import { cn } from "./utils";

export interface SwitchProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={checked}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full transition",
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
          checked ? "translate-x-7" : "translate-x-1"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
