import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  shadcnName?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, shadcnName = "slider", ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      className={cn("shadcn-slider", className)}
      data-testid={`shadcn-slider:${shadcnName}`}
      {...props}
    />
  ),
);

Slider.displayName = "Slider";
