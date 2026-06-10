import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-tight transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-paper hover:bg-ink-soft shadow-[0_2px_0_0_var(--color-gold-deep)]",
        gold: "bg-gold-deep text-white hover:brightness-110 shadow-[0_12px_26px_-14px_var(--color-gold-deep)]",
        outline:
          "border border-line-strong bg-surface text-ink hover:bg-paper-deep",
        ghost: "text-ink-soft hover:bg-paper-deep",
        danger: "border border-debit/30 text-debit hover:bg-debit-soft",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

export { buttonVariants };
