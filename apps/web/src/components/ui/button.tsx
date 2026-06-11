import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "primary" | "ghost" | "row" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  shadcnName?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", shadcnName = "button", ...props }, ref) => (
    <button
      ref={ref}
      className={cn("shadcn-button", `shadcn-button--${variant}`, className)}
      data-testid={`shadcn-button:${shadcnName}`}
      {...props}
    />
  ),
);

Button.displayName = "Button";
