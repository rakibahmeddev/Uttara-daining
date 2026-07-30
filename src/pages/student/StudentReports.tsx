import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { format, subDays, startOfDay } from "date-fns";
import { formatDateBD } from "../../utils/date";
import { Wallet, UtensilsCrossed, ShoppingBag, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Order } from "../../types";

// ── helpers ────────────────────────────────────────────────────────────────────
const toDate = (ts: any): Date => {
    if (!ts) return new Date(0);
    return ts?.toDate ? ts.toDate() : new Date(ts);
};

type TimeRange = "7" | "30" | "all";

// ── SummaryCard ─────────────────────────────────────────────────────────────────
interface CardProps {
    icon: any;
    label: string;
    value: string;
    sub: string;
    iconColor: string;
    iconBg: string;
    valueColor: string;
}
function SummaryCard({ icon: Icon, label, value, sub, iconColor, iconBg, valueColor }: CardProps) {
    return (
        <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "20px 18px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <div style={{ background: iconBg, borderRadius: "10px", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color={iconColor} />
                </div>
                <p style={{ color: "#64748b", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                    {label}
                </p>
            </div>
            <p style={{ color: valueColor, fontSize: "26px", fontWeight: 900, margin: "0 0 6px", lineHeight: 1 }}>
                {value}
            </p>
            <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0, fontWeight: 500 }}>
                {sub}
            </p>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StudentReports() {
    const { currentUser } = useAuth();

    const [orders, setOrders]       = useState<any[]>([]);
    const [txs, setTxs]             = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>("all");

    // ── Real-time listeners — same approach as WithdrawalRequest.tsx ──────────
    useEffect(() => {
        if (!currentUser?.uid) return;
        const uid = currentUser.uid;

        const unsubOrders = onSnapshot(
            query(collection(db, "orders"), where("userId", "==", uid)),
            (snap) => {
                setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => { console.error("orders:", err); setLoading(false); }
        );

        const unsubTx = onSnapshot(
            query(collection(db, "transactions"), where("userId", "==", uid)),
            (snap) => setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            (err) => console.error("transactions:", err)
        );

        return () => { unsubOrders(); unsubTx(); };
    }, [currentUser?.uid]);

    // ── Time range filter ─────────────────────────────────────────────────────
    const cutoff = useMemo(() =>
        timeRange === "all" ? null : startOfDay(subDays(new Date(), parseInt(timeRange))),
        [timeRange]);

    const filteredOrders = useMemo(() =>
        (cutoff ? orders.filter(o => toDate(o.createdAt) >= cutoff!) : orders)
            .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()),
        [orders, cutoff]);

    const filteredTxs = useMemo(() =>
        (cutoff ? txs.filter(t => toDate(t.createdAt) >= cutoff!) : txs)
            .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()),
        [txs, cutoff]);

    // ── Computed summary numbers ──────────────────────────────────────────────
    const mealCost    = filteredOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const totalAdded  = filteredTxs.filter(t => t.type === "credit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalDeduct = filteredTxs.filter(t => t.type === "debit" && t.description !== "Order Payment")
                                   .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const timeRangeBtns: { label: string; value: TimeRange }[] = [
        { label: "Last 7 Days",  value: "7"   },
        { label: "Last 30 Days", value: "30"  },
        { label: "Lifetime",     value: "all" },
    ];

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "260px" }}>
            <div>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium text-center">Loading your report…</p>
            </div>
        </div>
    );

    return (
        <div style={{ paddingTop: "24px", paddingBottom: "48px", paddingLeft: "16px", paddingRight: "16px", display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* ── Page Header ── */}
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>
                    My Reports
                </h1>
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                    আপনার ব্যালেন্স ও খরচের সারসংক্ষেপ
                </p>
            </div>

            {/* ── Time Range Buttons ── */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {timeRangeBtns.map(btn => {
                    const active = timeRange === btn.value;
                    return (
                        <button
                            key={btn.value}
                            onClick={() => setTimeRange(btn.value)}
                            style={{
                                padding: "8px 18px",
                                borderRadius: "10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px solid",
                                background:  active ? "#fff7ed" : "#ffffff",
                                borderColor: active ? "#f97316" : "#e2e8f0",
                                color:       active ? "#ea580c" : "#64748b",
                                boxShadow:   active ? "0 0 0 1px #f97316" : "0 1px 2px rgba(0,0,0,0.05)",
                            }}
                        >
                            {btn.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Summary Cards (2 column) ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

                {/* Current balance — from AuthContext (live) */}
                <SummaryCard
                    icon={Wallet}
                    label="Current Balance"
                    value={`৳${(currentUser?.balance || 0).toLocaleString()}`}
                    sub="Available in wallet"
                    iconColor="#059669"
                    iconBg="#d1fae5"
                    valueColor="#059669"
                />

                {/* Meal cost — filtered */}
                <SummaryCard
                    icon={UtensilsCrossed}
                    label="Meal Cost"
                    value={`৳${mealCost.toLocaleString()}`}
                    sub="Total food expense"
                    iconColor="#dc2626"
                    iconBg="#fee2e2"
                    valueColor="#dc2626"
                />

                {/* Balance added — filtered */}
                <SummaryCard
                    icon={ArrowDownLeft}
                    label="Balance Added"
                    value={`৳${totalAdded.toLocaleString()}`}
                    sub="Recharged to wallet"
                    iconColor="#7c3aed"
                    iconBg="#ede9fe"
                    valueColor="#7c3aed"
                />

                {/* Withdrawals — filtered */}
                <SummaryCard
                    icon={ArrowUpRight}
                    label="Withdrawals"
                    value={`৳${totalDeduct.toLocaleString()}`}
                    sub="Deducted from wallet"
                    iconColor="#0284c7"
                    iconBg="#e0f2fe"
                    valueColor="#0284c7"
                />

                {/* Total orders — filtered */}
                <SummaryCard
                    icon={ShoppingBag}
                    label="Total Orders"
                    value={String(filteredOrders.length)}
                    sub="Meals ordered"
                    iconColor="#d97706"
                    iconBg="#fef3c7"
                    valueColor="#d97706"
                />
            </div>

            {/* ── Meal History Table ── */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: 800, margin: 0 }}>🍽️ Meal History</h3>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600 }}>{filteredOrders.length} orders</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "480px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                {["Order Date", "Meal Date", "Items", "Amount", "Status"].map(h => (
                                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No orders in this period.</td></tr>
                            ) : filteredOrders.map((order, i) => {
                                const rawDate = order.items?.[0]?.date;
                                const mealDateStr = rawDate && !isNaN(new Date(rawDate).getTime())
                                    ? format(new Date(rawDate), "d MMM yyyy") : "—";
                                const status = order.status || "pending";
                                const isOk  = status === "completed" || status === "delivered";
                                const isRej = status === "rejected";
                                const sc = isOk
                                    ? { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }
                                    : isRej
                                    ? { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }
                                    : { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
                                return (
                                    <tr key={order.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>
                                            {formatDateBD(order.createdAt)}
                                        </td>
                                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                                            <span style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "2px 10px", fontSize: "11px", fontWeight: 700 }}>
                                                {mealDateStr}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#334155", maxWidth: "160px" }}>
                                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px" }}>
                                                {(order.items || []).map((it: any) => `${it.name} ×${it.quantity}`).join(", ")}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#dc2626", fontWeight: 800, whiteSpace: "nowrap", fontSize: "14px" }}>
                                            ৳{Number(order.totalAmount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ ...sc, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                                                {status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Transaction History Table ── */}
            {filteredTxs.length > 0 && (
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 style={{ color: "#0f172a", fontSize: "15px", fontWeight: 800, margin: 0 }}>💳 Transaction History</h3>
                        <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600 }}>{filteredTxs.length} records</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                    {["Date", "Type", "Description", "Amount"].map(h => (
                                        <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTxs.map((tx, i) => {
                                    const isCredit = tx.type === "credit";
                                    return (
                                        <tr key={tx.id} style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>
                                                {formatDateBD(tx.createdAt)}
                                            </td>
                                            <td style={{ padding: "12px 16px" }}>
                                                <span style={{
                                                    background: isCredit ? "#d1fae5" : "#fee2e2",
                                                    color:      isCredit ? "#065f46" : "#991b1b",
                                                    border:     `1px solid ${isCredit ? "#6ee7b7" : "#fca5a5"}`,
                                                    borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700,
                                                }}>
                                                    {isCredit ? "↑ Added" : "↓ Deducted"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 16px", color: "#475569", fontSize: "13px" }}>
                                                {tx.description || "—"}
                                            </td>
                                            <td style={{ padding: "12px 16px", color: isCredit ? "#059669" : "#dc2626", fontWeight: 800, whiteSpace: "nowrap", fontSize: "14px" }}>
                                                {isCredit ? "+" : "−"}৳{Number(tx.amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
