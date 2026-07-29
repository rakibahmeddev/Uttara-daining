import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { getAllOrdersEnriched } from "../../services/db";
import { format, subDays, startOfDay } from "date-fns";
import { formatDateBD } from "../../utils/date";
import { Wallet, TrendingDown, ShoppingBag, ArrowDownLeft, ArrowUpRight, CalendarDays } from "lucide-react";
import type { Order } from "../../types";

const toDate = (ts: any): Date => {
    if (!ts) return new Date(0);
    return ts?.toDate ? ts.toDate() : new Date(ts);
};

type TimeRange = "7" | "30" | "all";

const statusColor = (status: string) =>
    status === "completed" || status === "delivered"
        ? { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" }
        : status === "rejected"
        ? { bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.3)" }
        : { bg: "rgba(148,163,184,0.1)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" };

export default function StudentReports() {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>("all");

    useEffect(() => {
        if (!currentUser?.uid) return;
        const load = async () => {
            setLoading(true);
            try {
                // Fetch all orders for this user
                const allOrders = await getAllOrdersEnriched();
                setOrders(allOrders.filter(o => o.userId === currentUser.uid));

                // Fetch transactions
                const txSnap = await getDocs(query(
                    collection(db, "transactions"),
                    where("userId", "==", currentUser.uid),
                    orderBy("createdAt", "desc")
                ));
                setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Fetch user doc for balance
                const userSnap = await getDocs(query(collection(db, "users"), where("uid", "==", currentUser.uid)));
                if (!userSnap.empty) setUserData({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser?.uid]);

    const cutoff = useMemo(() => {
        if (timeRange === "all") return null;
        return startOfDay(subDays(new Date(), parseInt(timeRange)));
    }, [timeRange]);

    const filteredOrders = useMemo(() =>
        cutoff ? orders.filter(o => toDate(o.createdAt) >= cutoff!) : orders,
        [orders, cutoff]);

    const filteredTxs = useMemo(() =>
        cutoff ? transactions.filter(t => toDate(t.createdAt) >= cutoff!) : transactions,
        [transactions, cutoff]);

    const totalSpent = filteredOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const totalAdded = filteredTxs.filter(t => t.type === "credit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalWithdrawn = filteredTxs.filter(t => t.type === "debit").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const last7Cost = orders
        .filter(o => toDate(o.createdAt) >= startOfDay(subDays(new Date(), 7)))
        .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

    const timeRangeBtns: { label: string; value: TimeRange }[] = [
        { label: "Last 7 Days", value: "7" },
        { label: "Last 30 Days", value: "30" },
        { label: "Lifetime", value: "all" },
    ];

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", color: "#94a3b8", fontSize: "15px" }}>
            Loading your report...
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "16px", paddingBottom: "32px" }}>

            {/* Header */}
            <div>
                <h2 style={{ fontSize: "20px", fontWeight: 900, color: "#fff", margin: 0 }}>My Reports</h2>
                <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>আপনার ব্যালেন্স ও খরচের সারসংক্ষেপ</p>
            </div>

            {/* Time Range Buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {timeRangeBtns.map(btn => (
                    <button
                        key={btn.value}
                        onClick={() => setTimeRange(btn.value)}
                        style={{
                            padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
                            cursor: "pointer", border: "1px solid",
                            background: timeRange === btn.value ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.05)",
                            borderColor: timeRange === btn.value ? "rgba(249,115,22,0.6)" : "rgba(255,255,255,0.1)",
                            color: timeRange === btn.value ? "#fb923c" : "#64748b",
                        }}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>

                {/* Current Balance — always lifetime */}
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <Wallet size={15} color="#10b981" />
                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Current Balance</p>
                    </div>
                    <p style={{ color: "#10b981", fontSize: "22px", fontWeight: 900, margin: 0 }}>৳{(userData?.balance || 0).toLocaleString()}</p>
                    <p style={{ color: "#475569", fontSize: "11px", margin: "3px 0 0" }}>Available now</p>
                </div>

                {/* Last 7 Days Cost — always fixed */}
                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <CalendarDays size={15} color="#fbbf24" />
                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Last 7 Days</p>
                    </div>
                    <p style={{ color: "#fbbf24", fontSize: "22px", fontWeight: 900, margin: 0 }}>৳{last7Cost.toLocaleString()}</p>
                    <p style={{ color: "#475569", fontSize: "11px", margin: "3px 0 0" }}>Meal cost (7d)</p>
                </div>

                {/* Total Spent */}
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <TrendingDown size={15} color="#f87171" />
                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Total Spent</p>
                    </div>
                    <p style={{ color: "#f87171", fontSize: "22px", fontWeight: 900, margin: 0 }}>৳{totalSpent.toLocaleString()}</p>
                    <p style={{ color: "#475569", fontSize: "11px", margin: "3px 0 0" }}>On meals</p>
                </div>

                {/* Total Added */}
                <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <ArrowDownLeft size={15} color="#818cf8" />
                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Added</p>
                    </div>
                    <p style={{ color: "#818cf8", fontSize: "22px", fontWeight: 900, margin: 0 }}>৳{totalAdded.toLocaleString()}</p>
                    <p style={{ color: "#475569", fontSize: "11px", margin: "3px 0 0" }}>Balance recharged</p>
                </div>

                {/* Withdrawals */}
                <div style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <ArrowUpRight size={15} color="#38bdf8" />
                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Withdrawals</p>
                    </div>
                    <p style={{ color: "#38bdf8", fontSize: "22px", fontWeight: 900, margin: 0 }}>৳{totalWithdrawn.toLocaleString()}</p>
                    <p style={{ color: "#475569", fontSize: "11px", margin: "3px 0 0" }}>Deducted</p>
                </div>

                {/* Total Orders */}
                <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <ShoppingBag size={15} color="#10b981" />
                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Orders</p>
                    </div>
                    <p style={{ color: "#10b981", fontSize: "22px", fontWeight: 900, margin: 0 }}>{filteredOrders.length}</p>
                    <p style={{ color: "#475569", fontSize: "11px", margin: "3px 0 0" }}>Total meals</p>
                </div>
            </div>

            {/* Meal History Table */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: 800, margin: 0 }}>🍽️ Meal History ({filteredOrders.length})</h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                {["Order Date", "Meal Date", "Items", "Amount", "Status"].map(h => (
                                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#475569" }}>No orders in this period.</td></tr>
                            ) : (
                                filteredOrders.map((order, i) => {
                                    const sc = statusColor(order.status || "");
                                    const mealDate = order.items?.[0]?.date;
                                    let mealDateStr = "—";
                                    if (mealDate) {
                                        const d = new Date(mealDate);
                                        if (!isNaN(d.getTime())) mealDateStr = format(d, "d MMM yyyy");
                                    }
                                    return (
                                        <tr key={order.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                                            <td style={{ padding: "10px 14px", color: "#94a3b8", whiteSpace: "nowrap", fontSize: "12px" }}>
                                                {formatDateBD(order.createdAt)}
                                            </td>
                                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                                                <span style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>
                                                    {mealDateStr}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 14px", color: "#e2e8f0", maxWidth: "160px" }}>
                                                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {order.items.map(it => `${it.name} ×${it.quantity}`).join(", ")}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 14px", color: "#f87171", fontWeight: 800, whiteSpace: "nowrap" }}>
                                                ৳{Number(order.totalAmount).toLocaleString()}
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
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

            {/* Transaction History Table */}
            {filteredTxs.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <h3 style={{ color: "#fff", fontSize: "14px", fontWeight: 800, margin: 0 }}>💳 Transaction History ({filteredTxs.length})</h3>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                    {["Date", "Type", "Description", "Amount"].map(h => (
                                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTxs.map((tx, i) => {
                                    const isCredit = tx.type === "credit";
                                    return (
                                        <tr key={tx.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                                            <td style={{ padding: "10px 14px", color: "#94a3b8", whiteSpace: "nowrap", fontSize: "12px" }}>
                                                {formatDateBD(tx.createdAt)}
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{
                                                    background: isCredit ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                                    color: isCredit ? "#10b981" : "#f87171",
                                                    border: `1px solid ${isCredit ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                                                    borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700
                                                }}>
                                                    {isCredit ? "↑ Added" : "↓ Deducted"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: "12px" }}>
                                                {tx.description || "—"}
                                            </td>
                                            <td style={{ padding: "10px 14px", color: isCredit ? "#10b981" : "#f87171", fontWeight: 800, whiteSpace: "nowrap" }}>
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
