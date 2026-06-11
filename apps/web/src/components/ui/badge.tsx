import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  shadcnName?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, shadcnName = "badge", ...props }, ref) => (
  <span ref={ref} className={cn("shadcn-badge", className)} data-testid={`shadcn-badge:${shadcnName}`} {...props} />
));

Badge.displayName = "Badge";
