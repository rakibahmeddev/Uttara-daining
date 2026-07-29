import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { getAllOrdersEnriched } from "../../services/db";
import { format, subDays, startOfDay } from "date-fns";
import { formatDateBD } from "../../utils/date";
import { Wallet, UtensilsCrossed, ShoppingBag, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Order } from "../../types";

// ── helpers ────────────────────────────────────────────────────────────────────
const toDate = (ts: any): Date => {
    if (!ts) return new Date(0);
    return ts?.toDate ? ts.toDate() : new Date(ts);
};

const txBadge = (isCredit: boolean) => ({
    background: isCredit ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
    color:      isCredit ? "#10b981"               : "#f87171",
    border:     `1px solid ${isCredit ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
});

const orderBadge = (status: string) =>
    status === "completed" || status === "delivered"
        ? { background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }
        : status === "rejected"
        ? { background: "rgba(239,68,68,0.15)",  color: "#f87171", border: "1px solid rgba(239,68,68,0.3)"  }
        : { background: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.3)" };

type TimeRange = "7" | "30" | "all";

// ── SummaryCard ─────────────────────────────────────────────────────────────────
interface CardProps {
    icon: any; label: string; value: string; sub: string;
    iconColor: string; bg: string; border: string; valueColor: string;
}
function SummaryCard({ icon: Icon, label, value, sub, iconColor, bg, border, valueColor }: CardProps) {
    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: "16px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={{ background: `${iconColor}25`, borderRadius: "8px", padding: "6px", display: "flex" }}>
                    <Icon size={15} color={iconColor} />
                </div>
                <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
                    {label}
                </p>
            </div>
            <p style={{ color: valueColor, fontSize: "26px", fontWeight: 900, margin: "0 0 6px", lineHeight: 1.1 }}>
                {value}
            </p>
            <p style={{ color: "#64748b", fontSize: "12px", margin: 0, fontWeight: 500 }}>
                {sub}
            </p>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StudentReports() {
    const { currentUser } = useAuth();

    const [orders, setOrders]       = useState<Order[]>([]);
    const [txs, setTxs]             = useState<any[]>([]);
    const [userData, setUserData]   = useState<any>(null);
    const [loading, setLoading]     = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>("all");

    useEffect(() => {
        if (!currentUser?.uid) return;
        (async () => {
            setLoading(true);
            try {
                const [allOrders, txSnap, userSnap] = await Promise.all([
                    getAllOrdersEnriched(),
                    getDocs(query(
                        collection(db, "transactions"),
                        where("userId", "==", currentUser.uid),
                        orderBy("createdAt", "desc")
                    )),
                    getDocs(query(collection(db, "users"), where("uid", "==", currentUser.uid))),
                ]);
                setOrders(allOrders.filter(o => o.userId === currentUser.uid));
                setTxs(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                if (!userSnap.empty) setUserData({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [currentUser?.uid]);

    // ── Filtered data based on selected time range ─────────────────────────────
    const cutoff = useMemo(() =>
        timeRange === "all" ? null : startOfDay(subDays(new Date(), parseInt(timeRange))),
        [timeRange]);

    const filteredOrders = useMemo(() =>
        cutoff ? orders.filter(o => toDate(o.createdAt) >= cutoff!) : orders,
        [orders, cutoff]);

    const filteredTxs = useMemo(() =>
        cutoff ? txs.filter(t => toDate(t.createdAt) >= cutoff!) : txs,
        [txs, cutoff]);

    // ── Summary numbers ────────────────────────────────────────────────────────
    const mealCost    = filteredOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const totalAdded  = filteredTxs.filter(t => t.type === "credit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalDeduct = filteredTxs.filter(t => t.type === "debit").reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const timeRangeBtns: { label: string; value: TimeRange }[] = [
        { label: "Last 7 Days",  value: "7"   },
        { label: "Last 30 Days", value: "30"  },
        { label: "Lifetime",     value: "all" },
    ];

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "260px", color: "#94a3b8", fontSize: "15px" }}>
            Loading your report…
        </div>
    );

    return (
        <div style={{ paddingTop: "24px", paddingBottom: "48px", display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "18px" }}>
                <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#f1f5f9", margin: "0 0 6px" }}>
                    My Reports
                </h2>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                    আপনার ব্যালেন্স ও খরচের সারসংক্ষেপ
                </p>
            </div>

            {/* ── Time Range Buttons ───────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {timeRangeBtns.map(btn => {
                    const active = timeRange === btn.value;
                    return (
                        <button
                            key={btn.value}
                            onClick={() => setTimeRange(btn.value)}
                            style={{
                                padding: "9px 20px",
                                borderRadius: "10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px solid",
                                background:  active ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.05)",
                                borderColor: active ? "#f97316"               : "rgba(255,255,255,0.1)",
                                color:       active ? "#fb923c"               : "#94a3b8",
                            }}
                        >
                            {btn.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Summary Cards ────────────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "14px" }}>

                {/* Always shows live balance from Firestore */}
                <SummaryCard
                    icon={Wallet}
                    label="Current Balance"
                    value={`৳${(userData?.balance || 0).toLocaleString()}`}
                    sub="Available in wallet"
                    iconColor="#10b981"
                    bg="rgba(16,185,129,0.07)"
                    border="rgba(16,185,129,0.2)"
                    valueColor="#10b981"
                />

                {/* Dynamic — filtered by selected time range */}
                <SummaryCard
                    icon={UtensilsCrossed}
                    label="Meal Cost"
                    value={`৳${mealCost.toLocaleString()}`}
                    sub="Total food expense"
                    iconColor="#f87171"
                    bg="rgba(239,68,68,0.07)"
                    border="rgba(239,68,68,0.2)"
                    valueColor="#f87171"
                />

                <SummaryCard
                    icon={ArrowDownLeft}
                    label="Balance Added"
                    value={`৳${totalAdded.toLocaleString()}`}
                    sub="Recharged to wallet"
                    iconColor="#818cf8"
                    bg="rgba(99,102,241,0.07)"
                    border="rgba(99,102,241,0.2)"
                    valueColor="#818cf8"
                />

                <SummaryCard
                    icon={ArrowUpRight}
                    label="Withdrawals"
                    value={`৳${totalDeduct.toLocaleString()}`}
                    sub="Deducted from wallet"
                    iconColor="#38bdf8"
                    bg="rgba(14,165,233,0.07)"
                    border="rgba(14,165,233,0.2)"
                    valueColor="#38bdf8"
                />

                <SummaryCard
                    icon={ShoppingBag}
                    label="Total Orders"
                    value={String(filteredOrders.length)}
                    sub="Meals ordered"
                    iconColor="#34d399"
                    bg="rgba(16,185,129,0.06)"
                    border="rgba(16,185,129,0.18)"
                    valueColor="#34d399"
                />
            </div>

            {/* ── Meal History Table ────────────────────────────────────────────── */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>

                <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: 800, margin: 0 }}>
                        🍽️ Meal History
                    </h3>
                    <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
                        {filteredOrders.length} orders
                    </span>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                                {["Order Date", "Meal Date", "Items", "Amount", "Status"].map(h => (
                                    <th key={h} style={{
                                        padding: "11px 18px",
                                        textAlign: "left",
                                        color: "#64748b",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.07em",
                                        whiteSpace: "nowrap",
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
                                        No orders in this period.
                                    </td>
                                </tr>
                            ) : filteredOrders.map((order, i) => {
                                const sc = orderBadge(order.status || "");
                                const rawDate = order.items?.[0]?.date;
                                const mealDateStr = rawDate && !isNaN(new Date(rawDate).getTime())
                                    ? format(new Date(rawDate), "d MMM yyyy")
                                    : "—";
                                return (
                                    <tr key={order.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                                        <td style={{ padding: "12px 18px", color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                                            {formatDateBD(order.createdAt)}
                                        </td>
                                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                                            <span style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                                                {mealDateStr}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 18px", color: "#cbd5e1", maxWidth: "170px" }}>
                                            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px" }}>
                                                {order.items.map(it => `${it.name} ×${it.quantity}`).join(", ")}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 18px", color: "#f87171", fontWeight: 800, whiteSpace: "nowrap", fontSize: "14px" }}>
                                            ৳{Number(order.totalAmount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: "12px 18px" }}>
                                            <span style={{ ...sc, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                                                {order.status || "pending"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Transaction History Table ─────────────────────────────────────── */}
            {filteredTxs.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>

                    <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: 800, margin: 0 }}>
                            💳 Transaction History
                        </h3>
                        <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
                            {filteredTxs.length} records
                        </span>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                                    {["Date", "Type", "Description", "Amount"].map(h => (
                                        <th key={h} style={{
                                            padding: "11px 18px",
                                            textAlign: "left",
                                            color: "#64748b",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.07em",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTxs.map((tx, i) => {
                                    const isCredit = tx.type === "credit";
                                    const badge = txBadge(isCredit);
                                    return (
                                        <tr key={tx.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                                            <td style={{ padding: "12px 18px", color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                                                {formatDateBD(tx.createdAt)}
                                            </td>
                                            <td style={{ padding: "12px 18px" }}>
                                                <span style={{ ...badge, borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700 }}>
                                                    {isCredit ? "↑ Added" : "↓ Deducted"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 18px", color: "#94a3b8", fontSize: "13px" }}>
                                                {tx.description || "—"}
                                            </td>
                                            <td style={{ padding: "12px 18px", color: isCredit ? "#10b981" : "#f87171", fontWeight: 800, whiteSpace: "nowrap", fontSize: "14px" }}>
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
