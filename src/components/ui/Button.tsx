"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-sm)] transition-all duration-150 cursor-pointer select-none disabled:opacity-40 disabled:pointer-events-none",
          {
            primary: "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 active:scale-[0.98]",
            ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-2)] active:scale-[0.98]",
            outline: "bg-transparent border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)] active:scale-[0.98]",
            danger: "bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98]",
          }[variant],
          {
            sm: "text-xs px-3 py-1.5 h-7",
            md: "text-sm px-4 py-2 h-9",
            lg: "text-base px-6 py-3 h-11",
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
