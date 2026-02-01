import * as React from "react";
import { cn } from "../ui/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass-card", className)} {...props} />
  )
);

GlassCard.displayName = "GlassCard";
