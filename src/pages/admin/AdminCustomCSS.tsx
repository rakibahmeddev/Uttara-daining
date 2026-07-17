import { useState, useEffect, useRef } from "react";
import { getCustomCSS, saveCustomCSS } from "../../services/db";
import { injectCSS } from "../../hooks/useCustomCSS";
import {
    Save, RotateCcw, Eye, EyeOff, Copy, Check,
    Paintbrush, Code2, Sparkles, AlertTriangle,
} from "lucide-react";

/* ── Class reference table ───────────────────────────────────────── */
const CLASS_REFERENCE = [
    { section: "Dashboard Wrapper", classes: [".admin-dashboard"] },
    { section: "Welcome Banner", classes: [".admin-banner", ".admin-banner-title", ".admin-banner-sub"] },
    { section: "Stat Cards", classes: [".admin-stat-cards", ".admin-stat-card", ".admin-stat-card-icon", ".admin-stat-card-value", ".admin-stat-card-label", ".admin-stat-card-badge"] },
    { section: "Revenue Chart Card", classes: [".admin-chart-revenue", ".admin-chart-revenue-empty"] },
    { section: "Order Status Pie", classes: [".admin-chart-status"] },
    { section: "Recent Orders Table", classes: [".admin-orders-card", ".admin-orders-table", ".admin-orders-th", ".admin-orders-td", ".admin-orders-row"] },
    { section: "Pending Withdrawals", classes: [".admin-withdrawals-card", ".admin-withdrawals-table", ".admin-withdrawals-th", ".admin-withdrawals-td", ".admin-withdrawals-row"] },
    { section: "Status Badges", classes: [".admin-status-badge", ".admin-uid-badge"] },
    { section: "Card Shell", classes: [".admin-card"] },
    { section: "Card Header", classes: [".admin-card-header", ".admin-card-header-title", ".admin-card-header-sub"] },
];

const STARTER_CSS = `/* ═══════════════════════════════════════════════
   Admin Dashboard – Custom CSS
   All targetable class names are listed in the
   Class Reference panel on the right.
═══════════════════════════════════════════════ */

/* Example: change stat card background */
/* .admin-stat-card { background: #1e293b !important; } */

/* Example: change banner gradient */
/* .admin-banner { background: linear-gradient(135deg, #0f172a, #4f46e5) !important; } */

/* Example: change card border radius */
/* .admin-card { border-radius: 8px !important; } */
`;

export default function AdminCustomCSS() {
    const [css, setCss] = useState("");
    const [saved, setSaved] = useState("");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [preview, setPreview] = useState(true);
    const [copied, setCopied] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load saved CSS
    useEffect(() => {
        getCustomCSS()
            .then((s) => {
                const val = s || STARTER_CSS;
                setCss(val);
                setSaved(val);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Live preview injection
    useEffect(() => {
        if (preview) injectCSS(css);
        else injectCSS(""); // clear preview
    }, [css, preview]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveCustomCSS(css);
            setSaved(css);
            injectCSS(css);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (e) {
            console.error(e);
            alert("Failed to save CSS. Check console.");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (!confirm("Reset to last saved version?")) return;
        setCss(saved);
    };

    const handleClear = () => {
        if (!confirm("Clear all custom CSS?")) return;
        setCss("");
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(css).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const isDirty = css !== saved;

    const insertSnippet = (snippet: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newCss = css.slice(0, start) + snippet + css.slice(end);
        setCss(newCss);
        setTimeout(() => {
            ta.selectionStart = ta.selectionEnd = start + snippet.length;
            ta.focus();
        }, 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="flex flex-col items-center gap-3">
                    <Paintbrush size={32} className="text-orange-400 animate-pulse" />
                    <p className="text-slate-400 text-sm font-medium">Loading CSS editor…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-in-up">

            {/* ── Page Header ─────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <Paintbrush size={22} className="text-orange-400" />
                        Custom CSS Editor
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Write CSS targeting the admin dashboard class names. Changes apply instantly with live preview.
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Preview toggle */}
                    <button
                        onClick={() => setPreview(p => !p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            preview
                                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                                : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                        }`}
                    >
                        {preview ? (
                            <span className="flex items-center gap-1.5"><Eye size={14} /> Live Preview ON</span>
                        ) : (
                            <span className="flex items-center gap-1.5"><EyeOff size={14} /> Preview OFF</span>
                        )}
                    </button>

                    {/* Copy */}
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        {copied ? (
                            <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Copied!</span>
                        ) : (
                            <span className="flex items-center gap-1.5"><Copy size={14} /> Copy</span>
                        )}
                    </button>

                    {/* Reset */}
                    <button
                        onClick={handleReset}
                        disabled={!isDirty}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-slate-400 hover:text-orange-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="flex items-center gap-1.5"><RotateCcw size={14} /> Reset</span>
                    </button>

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                            saveSuccess
                                ? "bg-emerald-500 text-white"
                                : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
                        }`}
                    >
                        {saveSuccess ? (
                            <span className="flex items-center gap-1.5"><Check size={14} /> Saved!</span>
                        ) : saving ? (
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</span>
                        ) : (
                            <span className="flex items-center gap-1.5"><Save size={14} /> Save CSS</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Dirty warning */}
            {isDirty && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
                    <AlertTriangle size={14} />
                    You have unsaved changes — click "Save CSS" to persist them across sessions.
                </div>
            )}

            {/* ── Main 2-col grid ─────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                {/* Editor — 2 cols */}
                <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70 shadow-xl flex flex-col">
                    {/* Editor header bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-slate-950/40">
                        <div className="flex items-center gap-2.5">
                            <Code2 size={15} className="text-orange-400" />
                            <span className="text-xs font-bold text-slate-300">styles.css</span>
                            {isDirty && <span className="w-2 h-2 rounded-full bg-orange-400" title="Unsaved changes" />}
                        </div>
                        <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-red-500/60" />
                            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                            <span className="w-3 h-3 rounded-full bg-green-500/60" />
                        </div>
                    </div>

                    {/* Line numbers + textarea */}
                    <div className="relative flex flex-1">
                        {/* Line numbers column */}
                        <div
                            className="select-none shrink-0 pt-4 pb-4 text-right pr-3 pl-3 text-[11px] font-mono leading-6 text-slate-600 border-r border-white/[0.05] bg-slate-950/20"
                            aria-hidden
                        >
                            {css.split("\n").map((_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </div>

                        {/* Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={css}
                            onChange={(e) => setCss(e.target.value)}
                            spellCheck={false}
                            className="flex-1 resize-none bg-transparent p-4 text-[13px] font-mono leading-6 text-slate-200 outline-none placeholder-slate-600 min-h-[480px]"
                            placeholder="/* Write your custom CSS here */"
                            style={{ caretColor: "#f97316" }}
                        />
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between px-5 py-2 border-t border-white/[0.06] bg-slate-950/30 text-[11px] text-slate-500">
                        <span>{css.split("\n").length} lines · {css.length} chars</span>
                        <span className="font-mono">CSS</span>
                    </div>
                </div>

                {/* Right panel — class reference + quick snippets */}
                <div className="flex flex-col gap-4">

                    {/* Quick Snippets */}
                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70">
                        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                            <Sparkles size={14} className="text-amber-400" />
                            <span className="text-xs font-bold text-slate-300">Quick Snippets</span>
                        </div>
                        <div className="p-3 space-y-2">
                            {[
                                { label: "Dark stat cards", snippet: ".admin-stat-card {\n  background: #1e293b !important;\n  border-color: #334155 !important;\n}" },
                                { label: "Custom banner gradient", snippet: ".admin-banner {\n  background: linear-gradient(135deg, #0f172a, #4f46e5) !important;\n}" },
                                { label: "Rounded table rows", snippet: ".admin-orders-row:first-child td:first-child { border-top-left-radius: 12px; }\n.admin-orders-row:first-child td:last-child { border-top-right-radius: 12px; }" },
                                { label: "Orange card borders", snippet: ".admin-card {\n  border-color: rgba(249,115,22,0.3) !important;\n}" },
                                { label: "Teal accent badges", snippet: ".admin-uid-badge {\n  background: #0d9488 !important;\n  color: #fff !important;\n  border-color: #0d9488 !important;\n}" },
                                { label: "Custom font size", snippet: ".admin-stat-card-value {\n  font-size: 1.75rem !important;\n}" },
                            ].map(({ label, snippet }) => (
                                <button
                                    key={label}
                                    onClick={() => insertSnippet("\n" + snippet + "\n")}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-orange-300 transition-colors border border-transparent hover:border-white/[0.08]"
                                >
                                    + {label}
                                </button>
                            ))}
                            <button
                                onClick={handleClear}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                            >
                                🗑 Clear all CSS
                            </button>
                        </div>
                    </div>

                    {/* Class Reference */}
                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/70 flex-1">
                        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                            <Code2 size={14} className="text-violet-400" />
                            <span className="text-xs font-bold text-slate-300">Class Reference</span>
                        </div>
                        <div className="overflow-y-auto max-h-80 p-3 space-y-3">
                            {CLASS_REFERENCE.map(({ section, classes }) => (
                                <div key={section}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{section}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {classes.map((cls) => (
                                            <button
                                                key={cls}
                                                onClick={() => insertSnippet(`${cls} {\n  \n}`)}
                                                title={`Insert ${cls} block`}
                                                className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 hover:text-violet-200 transition-colors cursor-pointer"
                                            >
                                                {cls}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
