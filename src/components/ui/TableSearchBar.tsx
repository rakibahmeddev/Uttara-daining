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
                style={{ 
                    backgroundColor: "#ffffff", 
                    color: "#1e293b", 
                    padding: "10px 12px 10px 36px", 
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                }}
                className="w-full text-sm font-medium outline-none transition-all"
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
