import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: LucideIcon;
    variant?: "light" | "dark";
    error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, icon: Icon, variant = "light", error, ...props }, ref) => {
        const isDark = variant === "dark";

        return (
            <div className="relative">
                {Icon && (
                    <div
                        className={cn(
                            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2",
                            isDark ? "text-slate-500" : "text-slate-400"
                        )}
                    >
                        <Icon size={16} />
                    </div>
                )}
                <input
                    ref={ref}
                    style={{ padding: Icon ? "10px 14px 10px 42px" : "10px 14px" }}
                    className={cn(
                        "w-full rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                        "focus:outline-none focus:ring-2",
                        Icon && "pl-11",
                        isDark
                            ? "border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-violet-500/20"
                            : "border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-orange-500/60 focus:bg-white focus:ring-orange-500/20",
                        error && (isDark ? "border-red-500/60 focus:ring-red-500/20" : "border-red-400 focus:ring-red-500/20"),
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    variant?: "light" | "dark";
    error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, variant = "light", error, ...props }, ref) => {
        const isDark = variant === "dark";

        return (
            <textarea
                ref={ref}
                style={{ padding: "10px 14px" }}
                className={cn(
                    "w-full resize-none rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    "focus:outline-none focus:ring-2",
                    isDark
                        ? "border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:bg-white/[0.07] focus:ring-violet-500/20"
                        : "border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-orange-500/60 focus:bg-white focus:ring-orange-500/20",
                    error && (isDark ? "border-red-500/60" : "border-red-400"),
                    className
                )}
                {...props}
            />
        );
    }
);

Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    variant?: "light" | "dark";
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, variant = "light", children, ...props }, ref) => {
        const isDark = variant === "dark";

        return (
            <select
                ref={ref}
                style={{ padding: "10px 14px" }}
                className={cn(
                    "w-full rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    "focus:outline-none focus:ring-2",
                    isDark
                        ? "border border-white/10 bg-white/5 text-white focus:border-violet-500/50 focus:ring-violet-500/20"
                        : "border border-slate-200 bg-slate-50 text-slate-800 focus:border-orange-500/60 focus:ring-orange-500/20",
                    className
                )}
                {...props}
            >
                {children}
            </select>
        );
    }
);

Select.displayName = "Select";

interface FormFieldProps {
    label: string;
    children: React.ReactNode;
    hint?: string;
    error?: string;
    variant?: "light" | "dark";
}

export function FormField({ label, children, hint, error, variant = "dark" }: FormFieldProps) {
    const isDark = variant === "dark";
    return (
        <div>
            <label
                className={cn(
                    "mb-1.5 block text-sm font-semibold",
                    isDark ? "text-slate-300" : "text-slate-700"
                )}
            >
                {label}
            </label>
            {children}
            {error && <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>}
            {hint && !error && (
                <p className={cn("mt-1.5 text-xs", isDark ? "text-slate-500" : "text-slate-400")}>{hint}</p>
            )}
        </div>
    );
}
