import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "aside" | "footer" | "div";
  shadcnName?: string;
}

export const Card = forwardRef<HTMLElement, CardProps>(
  ({ as: Comp = "section", className, shadcnName = "card", ...props }, ref) => (
    <Comp
      ref={ref as never}
      className={cn("shadcn-card", className)}
      data-testid={`shadcn-card:${shadcnName}`}
      {...props}
    />
  ),
);

Card.displayName = "Card";
