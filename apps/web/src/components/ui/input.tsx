import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  shadcnName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, shadcnName = "input", ...props }, ref) => (
  <input ref={ref} className={cn("shadcn-input", className)} data-testid={`shadcn-input:${shadcnName}`} {...props} />
));

Input.displayName = "Input";
