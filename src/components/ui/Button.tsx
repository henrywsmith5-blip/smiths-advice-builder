"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "#C08B6F",
    color: "white",
    border: "none",
    boxShadow: "0 1px 2px rgba(192,139,111,0.3)",
  },
  secondary: {
    background: "transparent",
    color: "#3D3D3D",
    border: "1px solid #E5E1DC",
  },
  ghost: {
    background: "transparent",
    color: "#C08B6F",
    border: "1px solid transparent",
  },
};

const hoverStyles: Record<Variant, React.CSSProperties> = {
  primary: { background: "#B07D63" },
  secondary: { background: "#FAFAF9" },
  ghost: { background: "rgba(192,139,111,0.06)" },
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-6 py-3 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", style, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${className}`}
        style={{ ...styles[variant], ...style }}
        onMouseEnter={(e) => {
          if (!props.disabled) {
            Object.assign((e.target as HTMLElement).style, hoverStyles[variant]);
          }
        }}
        onMouseLeave={(e) => {
          Object.assign((e.target as HTMLElement).style, styles[variant]);
          if (style) Object.assign((e.target as HTMLElement).style, style);
        }}
        onMouseDown={(e) => {
          (e.target as HTMLElement).style.transform = "scale(0.98)";
        }}
        onMouseUp={(e) => {
          (e.target as HTMLElement).style.transform = "scale(1)";
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
