import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
    User,
    Mail,
    Hash,
    Home,
    BookOpen,
    Building2,
    CreditCard,
    Zap,
    UtensilsCrossed,
    Check,
    Loader2,
    Info,
    Calendar,
    Tag,
    RefreshCw,
} from "lucide-react";
import { updateAutoOrderSettings, getMeals } from "../../services/db";
import type { Meal } from "../../types";

// ─── Time slot helpers ────────────────────────────────────────────────────────

const SLOT_META: Record<string, { label: string; labelBn: string; emoji: string; color: string; bgColor: string; borderColor: string }> = {
    breakfast: {
        label: "Breakfast",
        labelBn: "সকালের খাবার",
        emoji: "🌅",
        color: "#d97706",
        bgColor: "#fffbeb",
        borderColor: "#fde68a",
    },
    lunch: {
        label: "Lunch",
        labelBn: "দুপুরের খাবার",
        emoji: "☀️",
        color: "#f97316",
        bgColor: "#fff7ed",
        borderColor: "#fed7aa",
    },
    dinner: {
        label: "Dinner",
        labelBn: "রাতের খাবার",
        emoji: "🌙",
        color: "#6366f1",
        bgColor: "#eef2ff",
        borderColor: "#c7d2fe",
    },
};

const DEFAULT_SLOT = {
    label: "Meal",
    labelBn: "খাবার",
    emoji: "🍽️",
    color: "#64748b",
    bgColor: "#f8fafc",
    borderColor: "#e2e8f0",
};

function getSlotMeta(slot?: string) {
    if (!slot) return DEFAULT_SLOT;
    const key = slot.toLowerCase().trim();
    return SLOT_META[key] ?? DEFAULT_SLOT;
}

/** Format "YYYY-MM-DD" → "25 Jul 2026 (Sat)" */
function formatDateDisplay(dateStr?: string): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-BD", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            weekday: "short",
        });
    } catch {
        return dateStr;
    }
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

interface ToggleSwitchProps {
    id: string;
    checked: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
}

function ToggleSwitch({ id, checked, onChange, disabled = false }: ToggleSwitchProps) {
    return (
        <button
            id={id}
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            style={{
                display: "inline-flex",
                alignItems: "center",
                width: 48,
                height: 28,
                borderRadius: 14,
                background: checked ? "linear-gradient(135deg, #f97316, #ea580c)" : "#cbd5e1",
                border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                padding: 0,
                position: "relative",
                transition: "background 250ms cubic-bezier(0.4,0,0.2,1)",
                opacity: disabled ? 0.5 : 1,
                flexShrink: 0,
                boxShadow: checked ? "0 0 0 3px rgba(249,115,22,0.2)" : "none",
                outline: "none",
            }}
        >
            <span
                style={{
                    display: "block",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#ffffff",
                    position: "absolute",
                    left: checked ? 23 : 3,
                    transition: "left 250ms cubic-bezier(0.4,0,0.2,1)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                }}
            />
        </button>
    );
}

// ─── Meal Row Card ────────────────────────────────────────────────────────────

interface MealRowProps {
    meal: Meal;
    checked: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
}

function MealRow({ meal, checked, onChange, disabled = false }: MealRowProps) {
    const meta = getSlotMeta(meal.timeSlot);
    const dateDisplay = formatDateDisplay(meal.date);

    return (
        <label
            htmlFor={`auto-order-meal-${meal.id}`}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 14,
                background: checked ? meta.bgColor : "#f8fafc",
                border: `2px solid ${checked ? meta.borderColor : "#e2e8f0"}`,
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "all 220ms ease",
                opacity: disabled ? 0.5 : 1,
                userSelect: "none",
            }}
        >
            {/* Hidden native checkbox */}
            <input
                id={`auto-order-meal-${meal.id}`}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
            />

            {/* Custom checkbox */}
            <span
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${checked ? meta.color : "#cbd5e1"}`,
                    background: checked ? meta.color : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 200ms ease",
                    flexShrink: 0,
                }}
            >
                {checked && <Check size={13} color="white" strokeWidth={3} />}
            </span>

            {/* Emoji slot badge */}
            <span
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    background: checked ? meta.bgColor : "#f1f5f9",
                    border: `1.5px solid ${checked ? meta.borderColor : "#e2e8f0"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                    transition: "all 200ms ease",
                }}
            >
                {meta.emoji}
            </span>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: checked ? meta.color : "#334155",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        transition: "color 200ms ease",
                    }}
                >
                    {meal.name}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    {/* Time slot pill */}
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: meta.color,
                            background: checked ? meta.bgColor : "#f1f5f9",
                            border: `1px solid ${checked ? meta.borderColor : "#e2e8f0"}`,
                            borderRadius: 20,
                            padding: "2px 8px",
                            transition: "all 200ms ease",
                        }}
                    >
                        <Tag size={9} />
                        {meta.label} · {meta.labelBn}
                    </span>

                    {/* Date pill */}
                    {dateDisplay && (
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#64748b",
                                background: "#f1f5f9",
                                border: "1px solid #e2e8f0",
                                borderRadius: 20,
                                padding: "2px 8px",
                            }}
                        >
                            <Calendar size={9} />
                            {dateDisplay}
                        </span>
                    )}
                </div>
            </div>

            {/* Right side: price + qty badge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span
                    style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: checked ? meta.color : "#64748b",
                        transition: "color 200ms ease",
                    }}
                >
                    ৳{meal.price}
                </span>
                <span
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#94a3b8",
                        background: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        borderRadius: 20,
                        padding: "2px 8px",
                    }}
                >
                    qty: 1
                </span>
            </div>
        </label>
    );
}

// ─── Main Profile Component ───────────────────────────────────────────────────

export default function Profile() {
    const { currentUser } = useAuth();

    // ── Auto Order top-level toggle ──
    const [autoOrderEnabled, setAutoOrderEnabled] = useState(false);

    // ── Meals from Firestore ──
    const [meals, setMeals] = useState<Meal[]>([]);
    const [mealsLoading, setMealsLoading] = useState(true);

    // ── Per-meal selection: meal.id → boolean ──
    // Initialised from currentUser.autoOrderMealIds (array saved in Firestore)
    const [selectedMealIds, setSelectedMealIds] = useState<Set<string>>(new Set());

    // ── Save state ──
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // ── Sync main toggle from Firestore ──
    useEffect(() => {
        if (!currentUser) return;
        setAutoOrderEnabled(currentUser.autoOrderEnabled ?? false);
        // Restore selected meal IDs from Firestore field
        const ids: string[] = (currentUser as any).autoOrderMealIds ?? [];
        setSelectedMealIds(new Set(ids));
    }, [
        currentUser?.autoOrderEnabled,
        (currentUser as any)?.autoOrderMealIds,
    ]);

    // ── Fetch available meals ──
    useEffect(() => {
        let cancelled = false;
        setMealsLoading(true);
        getMeals()
            .then((data) => {
                if (cancelled) return;
                const available = data.filter((m) => m.available);
                setMeals(available);
            })
            .catch((e) => console.error("[AutoOrder] getMeals error:", e))
            .finally(() => {
                if (!cancelled) setMealsLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    // ── Persist all auto-order prefs to Firestore ──
    const persist = async (patch: {
        autoOrderEnabled?: boolean;
        selectedIds?: Set<string>;
    }) => {
        if (!currentUser?.uid) return;
        setSaving(true);
        setSaved(false);
        try {
            const enabled = patch.autoOrderEnabled ?? autoOrderEnabled;
            const ids = patch.selectedIds ?? selectedMealIds;

            // Derive legacy lunch/dinner flags from selected meals for backwards compat
            const lunchMeal = meals.find(
                (m) => m.timeSlot?.toLowerCase() === "lunch" && ids.has(m.id)
            );
            const dinnerMeal = meals.find(
                (m) => m.timeSlot?.toLowerCase() === "dinner" && ids.has(m.id)
            );

            await updateAutoOrderSettings(currentUser.uid, {
                autoOrderEnabled: enabled,
                autoOrderLunch: !!lunchMeal,
                autoOrderDinner: !!dinnerMeal,
            });

            // Also persist the meal IDs list
            const { doc, updateDoc } = await import("firebase/firestore");
            const { db } = await import("../../services/firebase");
            await updateDoc(doc(db, "users", currentUser.uid), {
                autoOrderMealIds: Array.from(ids),
            });

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error("[AutoOrder] persist error:", err);
            alert("সেটিং সেভ করতে ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleMain = (val: boolean) => {
        setAutoOrderEnabled(val);
        persist({ autoOrderEnabled: val });
    };

    const handleToggleMeal = (mealId: string, val: boolean) => {
        setSelectedMealIds((prev) => {
            const next = new Set(prev);
            if (val) next.add(mealId); else next.delete(mealId);
            persist({ selectedIds: next });
            return next;
        });
    };

    if (!currentUser)
        return <div className="p-8 text-center text-slate-500">Loading profile...</div>;

    const profileFields = [
        { icon: User, label: "Full Name", value: currentUser.name },
        { icon: Mail, label: "Email", value: currentUser.email },
        { icon: Hash, label: "Student ID", value: currentUser.idNumber },
        { icon: Hash, label: "Registration Number", value: currentUser.registrationNumber },
        { icon: Home, label: "Room Number", value: currentUser.roomNumber },
        { icon: BookOpen, label: "Department", value: currentUser.departmentName },
        { icon: Building2, label: "Hall Name", value: currentUser.hallName },
        {
            icon: CreditCard,
            label: "Balance",
            value: `৳${currentUser.balance || 0}`,
            highlight: true,
        },
    ];

    return (
        <div
            style={{
                width: "100%",
                maxWidth: 680,
                margin: "24px auto 64px",
                padding: "0 16px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
            }}
        >
            {/* ── Profile Info Card ──────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                    style={{ padding: "28px 24px" }}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-3xl font-extrabold shadow-inner shrink-0">
                            {currentUser.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black">{currentUser.name}</h1>
                            <p className="text-orange-100 font-medium capitalize mt-0.5">
                                {currentUser.role}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Note */}
                <div className="bg-amber-50 border-b border-slate-100" style={{ padding: "16px 24px" }}>
                    <p className="text-sm text-amber-700 font-medium">
                        <strong>Note:</strong> This information can only be updated by an administrator.
                        If you need to change any details, please contact the admin.
                    </p>
                </div>

                {/* Fields */}
                <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {profileFields.map((field, index) => {
                        const Icon = field.icon;
                        return (
                            <div
                                key={index}
                                className={`flex items-center rounded-xl border transition-all ${
                                    field.highlight
                                        ? "bg-orange-50 border-orange-200/55 text-orange-700"
                                        : "bg-slate-50 border-slate-100"
                                }`}
                                style={{ padding: "14px 16px", gap: "14px" }}
                            >
                                <div
                                    className={`p-2.5 rounded-xl border flex items-center justify-center ${
                                        field.highlight
                                            ? "bg-orange-100 border-orange-200 text-orange-600"
                                            : "bg-white border-slate-200 text-slate-400"
                                    }`}
                                >
                                    <Icon size={20} />
                                </div>
                                <div className="flex-1" style={{ padding: "0 4px" }}>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        {field.label}
                                    </p>
                                    <p
                                        className={`text-lg font-bold mt-0.5 ${
                                            field.highlight ? "text-orange-600" : "text-slate-800"
                                        }`}
                                    >
                                        {field.value || "Not provided"}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>



            {/* Keyframes */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
        </div>
    );
}
