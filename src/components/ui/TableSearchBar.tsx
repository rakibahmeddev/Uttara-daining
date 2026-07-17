import { Search, X } from "lucide-react";
import { cn } from "../../utils/cn";

interface TableSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    resultCount?: number;
    totalCount?: number;
}

export default function TableSearchBar({
    value,
    onChange,
    placeholder = "Search records…",
    className,
    resultCount,
    totalCount,
}: TableSearchBarProps) {
    return (
        <div className={cn("relative w-full", className)}>
            <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm font-medium text-white placeholder:text-slate-500 transition-all focus:border-violet-500/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Clear search"
                >
                    <X size={14} />
                </button>
            )}
            {typeof resultCount === "number" && typeof totalCount === "number" && value && (
                <p className="absolute -bottom-5 left-0 text-[11px] text-slate-500">
                    {resultCount} of {totalCount} results
                </p>
            )}
        </div>
    );
}

export function filterBySearch<T>(
    items: T[],
    query: string,
    getSearchableText: (item: T) => string
): T[] {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => getSearchableText(item).toLowerCase().includes(q));
}
