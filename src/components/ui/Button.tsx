import React from "react";
import { cn } from "../../utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" | "teal";
    size?: "sm" | "md" | "lg" | "xl";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        const variants = {
            primary:
                "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
            secondary:
                "bg-slate-100 text-slate-700 border border-slate-200/60 hover:bg-slate-200/80 hover:-translate-y-0.5 active:translate-y-0",
            danger:
                "bg-gradient-to-r from-red-650 to-rose-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0",
            outline:
                "border border-orange-500/40 text-orange-500 bg-transparent hover:bg-orange-50 hover:-translate-y-0.5 active:translate-y-0",
            ghost:
                "text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:scale-95",
            teal:
                "bg-gradient-to-r from-teal-650 to-teal-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 active:translate-y-0",
        };

        const sizes = {
            sm: "px-3 py-1.5 text-sm rounded-lg",
            md: "px-5 py-2.5 text-sm rounded-xl",
            lg: "px-7 py-3.5 text-base rounded-2xl",
            xl: "px-8 py-4 text-lg rounded-2xl",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer",
                    variants[variant] || variants.primary,
                    sizes[size] || sizes.md,
                    className
                )}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";
