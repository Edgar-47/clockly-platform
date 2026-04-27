import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded border border-border-strong bg-white px-3 py-2 text-sm text-ink shadow-inner-sm placeholder:text-ink-xmuted transition-all duration-150",
        "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 focus:shadow-none",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-bg",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
