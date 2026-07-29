import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { getAllOrdersEnriched } from "../../services/db";
import { format, subDays, startOfDay } from "date-fns";
import { formatDateBD } from "../../utils/date";
import { Wallet, TrendingDown, ShoppingBag, ArrowDownLeft, ArrowUpRight, CalendarDays } from "lucide-react";
import type { Order } from "../../types";

// ── helpers ────────────────────────────────────────────────────────────
const toDate = (ts: any): Date => {
    if (!ts) return new Date(0);
    return ts?.toDate ? ts.toDate() : new Date(ts);
};

const statusStyle = (status: string) =>
    status === "completed" || status === "delivered"
        ? { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" }
        : status === "rejected"
        ? { bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.3)" }
        : { bg: "rgba(148,163,184,0.1)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" };

type TimeRange = "7" | "30" | "all";

// ── Sub-components ─────────────────────────────────────────────────────
function SummaryCard({
    icon: Icon,
    label,
    value,
    sub,
    iconColor,
    cardBg,
    cardBorder,
    valueColor,
}: {
    icon: any; label: string; value: string; sub: string;
    iconColor: string; cardBg: string; cardBorder: string; valueColor: string;
}) {
    return (
        <div style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: "14px",
            padding: "18px 16px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <Icon size={15} color={iconColor} />
                <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                    {label}
                </p>
            </div>
            <p style={{ color: valueColor, fontSize: "24px", fontWeight: 900, margin: "0 0 4px" }}>{value}</p>
            <p style={{ color: "#64748b", fontSize: "12px", margin: 0 }}>{sub}</p>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function StudentReports() {
    const { currentUser } = useAuth();

    const [orders, setOrders]           = useState<Order[]>([]);
    const [transactions, setTxs]        = useState<any[]>([]);
    const [userData, setUserData]       = useState<any>(null);
    const [loading, setLoading]         = useState(true);
    const [timeRange, setTimeRange]     = useState<TimeRange>("all");

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

    // ── Derived values ─────────────────────────────────────────────────
    const cutoff = useMemo(() =>
        timeRange === "all" ? null : startOfDay(subDays(new Date(), parseInt(timeRange))),
        [timeRange]);

    const filteredOrders = useMemo(() =>
        cutoff ? orders.filter(o => toDate(o.createdAt) >= cutoff!) : orders,
        [orders, cutoff]);

    const filteredTxs = useMemo(() =>
        cutoff ? transactions.filter(t => toDate(t.createdAt) >= cutoff!) : transactions,
        [transactions, cutoff]);

    const totalSpent     = filteredOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const totalAdded     = filteredTxs.filter(t => t.type === "credit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalWithdrawn = filteredTxs.filter(t => t.type === "debit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const last7Cost      = orders
        .filter(o => toDate(o.createdAt) >= startOfDay(subDays(new Date(), 7)))
        .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

    const timeRangeBtns: { label: string; value: TimeRange }[] = [
        { label: "Last 7 Days",  value: "7"   },
        { label: "Last 30 Days", value: "30"  },
        { label: "Lifetime",     value: "all" },
    ];

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "260px", color: "#94a3b8", fontSize: "15px" }}>
            Loading your report...
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingTop: "20px", paddingBottom: "40px" }}>

            {/* ── Page Header ── */}
            <div style={{ paddingBottom: "4px" }}>
                <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#fff", margin: "0 0 6px" }}>
                    My Reports
                </h2>
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                    আপনার ব্যালেন্স ও খরচের সারসংক্ষেপ
                </p>
            </div>

            {/* ── Time Range Filter ── */}
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
                                transition: "all 0.15s",
                                background:   active ? "rgba(249,115,22,0.2)"  : "rgba(255,255,255,0.05)",
                                borderColor:  active ? "rgba(249,115,22,0.55)" : "rgba(255,255,255,0.1)",
                                color:        active ? "#fb923c"               : "#64748b",
                            }}
                        >
                            {btn.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Summary Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>

                {/* Current Balance — always live */}
                <SummaryCard
                    icon={Wallet}
                    label="Current Balance"
                    value={`৳${(userData?.balance || 0).toLocaleString()}`}
                    sub="Available now"
                    iconColor="#10b981"
                    cardBg="rgba(16,185,129,0.08)"
                    cardBorder="rgba(16,185,129,0.22)"
                    valueColor="#10b981"
                />

                {/* Last 7 Days — always fixed, not affected by filter */}
                <SummaryCard
                    icon={CalendarDays}
                    label="Last 7 Days"
                    value={`৳${last7Cost.toLocaleString()}`}
                    sub="Meal cost (7d)"
                    iconColor="#fbbf24"
                    cardBg="rgba(245,158,11,0.08)"
                    cardBorder="rgba(245,158,11,0.22)"
                    valueColor="#fbbf24"
                />

                {/* Total Spent */}
                <SummaryCard
                    icon={TrendingDown}
                    label="Total Spent"
                    value={`৳${totalSpent.toLocaleString()}`}
                    sub="On meals"
                    iconColor="#f87171"
                    cardBg="rgba(239,68,68,0.08)"
                    cardBorder="rgba(239,68,68,0.2)"
                    valueColor="#f87171"
                />

                {/* Balance Added */}
                <SummaryCard
                    icon={ArrowDownLeft}
                    label="Added"
                    value={`৳${totalAdded.toLocaleString()}`}
                    sub="Balance recharged"
                    iconColor="#818cf8"
                    cardBg="rgba(99,102,241,0.08)"
                    cardBorder="rgba(99,102,241,0.2)"
                    valueColor="#818cf8"
                />

                {/* Withdrawals */}
                <SummaryCard
                    icon={ArrowUpRight}
                    label="Withdrawals"
                    value={`৳${totalWithdrawn.toLocaleString()}`}
                    sub="Deducted"
                    iconColor="#38bdf8"
                    cardBg="rgba(14,165,233,0.08)"
                    cardBorder="rgba(14,165,233,0.2)"
                    valueColor="#38bdf8"
                />

                {/* Total Orders */}
                <SummaryCard
                    icon={ShoppingBag}
                    label="Orders"
                    value={String(filteredOrders.length)}
                    sub="Total meals"
                    iconColor="#34d399"
                    cardBg="rgba(16,185,129,0.06)"
                    cardBorder="rgba(16,185,129,0.18)"
                    valueColor="#34d399"
                />
            </div>

            {/* ── Meal History Table ── */}
            <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                overflow: "hidden",
            }}>
                {/* Table header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: 800, margin: 0 }}>
                        🍽️ Meal History ({filteredOrders.length})
                    </h3>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                {["Order Date", "Meal Date", "Items", "Amount", "Status"].map(h => (
                                    <th key={h} style={{
                                        padding: "10px 16px",
                                        textAlign: "left",
                                        color: "#64748b",
                                        fontWeight: 700,
                                        fontSize: "11px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
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
                                    <td colSpan={5} style={{ padding: "36px", textAlign: "center", color: "#475569", fontSize: "13px" }}>
                                        No orders in this period.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order, i) => {
                                    const sc = statusStyle(order.status || "");
                                    const mealDate = order.items?.[0]?.date;
                                    let mealDateStr = "—";
                                    if (mealDate) {
                                        const d = new Date(mealDate);
                                        if (!isNaN(d.getTime())) mealDateStr = format(d, "d MMM yyyy");
                                    }
                                    return (
                                        <tr key={order.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                                            <td style={{ padding: "11px 16px", color: "#94a3b8", whiteSpace: "nowrap", fontSize: "12px" }}>
                                                {formatDateBD(order.createdAt)}
                                            </td>
                                            <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                                                <span style={{
                                                    background: "rgba(99,102,241,0.15)",
                                                    color: "#a5b4fc",
                                                    border: "1px solid rgba(99,102,241,0.25)",
                                                    borderRadius: "6px",
                                                    padding: "2px 9px",
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                }}>
                                                    {mealDateStr}
                                                </span>
                                            </td>
                                            <td style={{ padding: "11px 16px", color: "#e2e8f0", maxWidth: "160px" }}>
                                                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {order.items.map(it => `${it.name} ×${it.quantity}`).join(", ")}
                                                </span>
                                            </td>
                                            <td style={{ padding: "11px 16px", color: "#f87171", fontWeight: 800, whiteSpace: "nowrap" }}>
                                                ৳{Number(order.totalAmount).toLocaleString()}
                                            </td>
                                            <td style={{ padding: "11px 16px" }}>
                                                <span style={{
                                                    background: sc.bg,
                                                    color: sc.text,
                                                    border: `1px solid ${sc.border}`,
                                                    borderRadius: "6px",
                                                    padding: "2px 9px",
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    textTransform: "capitalize",
                                                    whiteSpace: "nowrap",
                                                }}>
                                                    {order.status || "pending"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Transaction History Table ── */}
            {filteredTxs.length > 0 && (
                <div style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    overflow: "hidden",
                }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: 800, margin: 0 }}>
                            💳 Transaction History ({filteredTxs.length})
                        </h3>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                    {["Date", "Type", "Description", "Amount"].map(h => (
                                        <th key={h} style={{
                                            padding: "10px 16px",
                                            textAlign: "left",
                                            color: "#64748b",
                                            fontWeight: 700,
                                            fontSize: "11px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.06em",
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
                                    return (
                                        <tr key={tx.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                                            <td style={{ padding: "11px 16px", color: "#94a3b8", whiteSpace: "nowrap", fontSize: "12px" }}>
                                                {formatDateBD(tx.createdAt)}
                                            </td>
                                            <td style={{ padding: "11px 16px" }}>
                                                <span style={{
                                                    background: isCredit ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                                    color:      isCredit ? "#10b981"               : "#f87171",
                                                    border:     `1px solid ${isCredit ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                                                    borderRadius: "6px",
                                                    padding: "2px 9px",
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                }}>
                                                    {isCredit ? "↑ Added" : "↓ Deducted"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "11px 16px", color: "#94a3b8", fontSize: "12px" }}>
                                                {tx.description || "—"}
                                            </td>
                                            <td style={{
                                                padding: "11px 16px",
                                                color: isCredit ? "#10b981" : "#f87171",
                                                fontWeight: 800,
                                                whiteSpace: "nowrap",
                                            }}>
                                                {isCredit ? "+" : "-"}৳{Number(tx.amount).toLocaleString()}
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
