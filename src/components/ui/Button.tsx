"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-5 py-2 text-[13px]",
  lg: "px-6 py-2.5 text-[14px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, disabled, ...props }, ref) => {

    const baseClass = `inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none ${sizes[size]} ${className}`;

    if (variant === "primary") {
      return (
        <button
          ref={ref}
          className={baseClass}
          disabled={disabled}
          style={{
            background: "linear-gradient(135deg, #C08B6F 0%, #B37A5E 100%)",
            color: "white",
            border: "none",
            boxShadow: "0 1px 3px rgba(192,139,111,0.3), 0 1px 2px rgba(0,0,0,0.06)",
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              (e.currentTarget).style.boxShadow = "0 3px 12px rgba(192,139,111,0.35), 0 1px 3px rgba(0,0,0,0.08)";
              (e.currentTarget).style.transform = "translateY(-0.5px)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget).style.boxShadow = "0 1px 3px rgba(192,139,111,0.3), 0 1px 2px rgba(0,0,0,0.06)";
            (e.currentTarget).style.transform = "translateY(0)";
          }}
          onMouseDown={(e) => {
            if (!disabled) (e.currentTarget).style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget).style.transform = "translateY(-0.5px)";
          }}
          {...props}
        >
          {children}
        </button>
      );
    }

    if (variant === "secondary") {
      return (
        <button
          ref={ref}
          className={baseClass}
          disabled={disabled}
          style={{
            background: "white",
            color: "#3D3D3D",
            border: "1px solid #E5E1DC",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              (e.currentTarget).style.background = "#FAFAF9";
              (e.currentTarget).style.borderColor = "#D5D0CB";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget).style.background = "white";
            (e.currentTarget).style.borderColor = "#E5E1DC";
          }}
          onMouseDown={(e) => {
            if (!disabled) (e.currentTarget).style.transform = "scale(0.98)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget).style.transform = "scale(1)";
          }}
          {...props}
        >
          {children}
        </button>
      );
    }

    // ghost
    return (
      <button
        ref={ref}
        className={baseClass}
        disabled={disabled}
        style={{
          background: "transparent",
          color: "#8A8A8A",
          border: "1px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            (e.currentTarget).style.color = "#C08B6F";
            (e.currentTarget).style.background = "rgba(192,139,111,0.05)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget).style.color = "#8A8A8A";
          (e.currentTarget).style.background = "transparent";
        }}
        onMouseDown={(e) => {
          if (!disabled) (e.currentTarget).style.transform = "scale(0.98)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget).style.transform = "scale(1)";
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
