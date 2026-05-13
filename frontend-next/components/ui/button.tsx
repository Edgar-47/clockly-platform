import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-semibold tracking-[-0.01em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary-gradient text-white shadow-sm hover:shadow-glow-sm hover:brightness-110 active:scale-[0.98] active:brightness-95",
        secondary:
          "bg-white text-ink border border-border-strong shadow-xs hover:bg-surface-bg hover:border-border-strong active:scale-[0.98]",
        ghost:
          "text-ink-muted hover:bg-surface-bg hover:text-ink active:scale-[0.98]",
        danger:
          "bg-danger text-white shadow-sm hover:bg-danger/90 active:scale-[0.98]",
        success:
          "bg-success text-white shadow-sm hover:bg-success/90 active:scale-[0.98]",
        outline:
          "border border-border-strong bg-transparent text-ink hover:bg-surface-bg active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded",
        default: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-sm rounded-md",
        xl: "h-12 px-8 text-[15px] rounded-md",
        icon: "h-8 w-8 rounded",
        "icon-sm": "h-7 w-7 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
