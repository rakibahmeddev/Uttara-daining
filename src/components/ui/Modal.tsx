import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "light" | "glass";
}

const sizeMap = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-3xl",
};

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    size = "md",
    variant = "glass",
}: ModalProps) {
    if (!isOpen) return null;

    const isGlass = variant === "glass";

    return createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto">
            {/* Full-screen backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
                aria-hidden
            />

            {/* Centering flex wrapper */}
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                    className={cn(
                        "relative z-10 w-full transform rounded-2xl text-left shadow-2xl transition-all animate-fade-in-up",
                        "max-h-[90vh] flex flex-col",
                        sizeMap[size],
                        isGlass
                            ? "border border-violet-500/20 bg-slate-900/90 backdrop-blur-md shadow-violet-500/10"
                            : "border border-slate-200 bg-white"
                    )}
                    role="dialog"
                    aria-modal="true"
                >
                    {isGlass && (
                        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                    )}

                    {/* Header — fixed, never scrolls away */}
                    <div className="relative shrink-0 border-b px-6 pt-6 pb-4"
                        style={{ borderColor: isGlass ? "rgba(255,255,255,0.08)" : "#f1f5f9" }}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h3
                                    className={cn(
                                        "text-lg font-black tracking-tight",
                                        isGlass ? "text-white" : "text-slate-800"
                                    )}
                                >
                                    {title}
                                </h3>
                                {subtitle && (
                                    <p className={cn("mt-1 text-sm", isGlass ? "text-slate-400" : "text-slate-500")}>
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className={cn(
                                    "shrink-0 rounded-xl p-2 transition-colors",
                                    isGlass
                                        ? "text-slate-400 hover:bg-white/10 hover:text-white"
                                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                )}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Body — scrollable when content is tall */}
                    <div className={cn("relative flex-1 overflow-y-auto px-6 py-5", isGlass ? "text-slate-200" : "text-slate-700")}>
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
