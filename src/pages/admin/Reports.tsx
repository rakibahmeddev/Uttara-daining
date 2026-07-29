import { useState, useEffect, useMemo } from "react";
import { getAllOrdersEnriched } from "../../services/db";
import { Avatar } from "../../components/admin/UserDisplay";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Button } from "../../components/ui/Button";
import { Download, TrendingUp, ShoppingBag, DollarSign, Users, Filter, X, Wallet, ArrowDownLeft, ArrowUpRight, CalendarDays } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { formatDateBD } from "../../utils/date";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { Order } from "../../types";

// ── helpers ────────────────────────────────────────────────────────────────
const toDateStr = (createdAt: any): string => {
    if (!createdAt) return "";
    const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    return format(d, "yyyy-MM-dd");
};

const toDate = (createdAt: any): Date => {
    if (!createdAt) return new Date(0);
    return createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
};

const getSlot = (order: Order): string => {
    const raw = (order as any).slot || (order as any).timeSlot || (order.items?.[0] as any)?.timeSlot || "";
    if (!raw) return "";
    const lower = raw.toLowerCase();
    if (lower.includes("break") || lower.includes("সকাল")) return "Breakfast";
    if (lower.includes("lunch") || lower.includes("দুপুর")) return "Lunch";
    if (lower.includes("dinner") || lower.includes("রাত") || lower.includes("সন্ধ্যা")) return "Dinner";
    return raw;
};

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px 16px" }}>
            <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color, fontSize: "13px", fontWeight: 700 }}>
                    {p.name === "Revenue" ? `৳${p.value.toLocaleString()}` : `${p.value} orders`}
                </p>
            ))}
        </div>
    );
};

// Stat Card
const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) => (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px 22px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ background: color, borderRadius: "12px", padding: "12px", flexShrink: 0 }}>
            <Icon size={22} color="#fff" />
        </div>
        <div>
            <p style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ color: "#fff", fontSize: "22px", fontWeight: 900 }}>{value}</p>
            {sub && <p style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>{sub}</p>}
        </div>
    </div>
);

type TimeRange = "7" | "14" | "30" | "all";

export default function Reports() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Global Filters
    const [filterPerson, setFilterPerson] = useState("");

    // Person profile data
    const [personData, setPersonData] = useState<any>(null);
    const [personTransactions, setPersonTransactions] = useState<any[]>([]);
    const [personTimeRange, setPersonTimeRange] = useState<TimeRange>("all");
    const [personLoading, setPersonLoading] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const ordersData = await getAllOrdersEnriched();
            setOrders(ordersData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // When person filter changes, load that person's data
    useEffect(() => {
        if (!filterPerson) { setPersonData(null); setPersonTransactions([]); return; }
        loadPersonData(filterPerson);
    }, [filterPerson]);

    const loadPersonData = async (name: string) => {
        setPersonLoading(true);
        try {
            // Find userId from orders
            const personOrder = orders.find(o => o.userName === name);
            if (!personOrder?.userId) { setPersonLoading(false); return; }
            const userId = personOrder.userId;

            // Fetch user doc
            const usersSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", userId)));
            const userData = usersSnap.empty ? null : { id: usersSnap.docs[0].id, ...usersSnap.docs[0].data() };

            // Fetch transactions
            const txSnap = await getDocs(query(
                collection(db, "transactions"),
                where("userId", "==", userId),
                orderBy("createdAt", "desc")
            ));
            const txs = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            setPersonData(userData);
            setPersonTransactions(txs);
        } catch (e) {
            console.error(e);
        } finally {
            setPersonLoading(false);
        }
    };

    // Unique persons
    const personOptions = useMemo(() => {
        const map = new Map<string, string>();
        orders.forEach(o => {
            if (o.userName) {
                const room = (o as any).roomNumber || "";
                if (!map.has(o.userName)) map.set(o.userName, room);
            }
        });
        return Array.from(map.entries())
            .map(([name, room]) => ({ name, room }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [orders]);

    const hasFilter = !!filterPerson;

    // Filtered orders (global)
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (filterPerson && o.userName !== filterPerson) return false;
            return true;
        });
    }, [orders, filterPerson]);

    // Person-specific time-range cutoff
    const personCutoff = useMemo(() => {
        if (personTimeRange === "all") return null;
        return startOfDay(subDays(new Date(), parseInt(personTimeRange)));
    }, [personTimeRange]);

    // Person orders filtered by time range
    const personOrders = useMemo(() => {
        if (!filterPerson) return [];
        return orders.filter(o => {
            if (o.userName !== filterPerson) return false;
            if (personCutoff && toDate(o.createdAt) < personCutoff) return false;
            return true;
        });
    }, [orders, filterPerson, personCutoff]);

    // Person transactions filtered by time range
    const personTxsFiltered = useMemo(() => {
        if (!personCutoff) return personTransactions;
        return personTransactions.filter(t => toDate(t.createdAt) >= personCutoff);
    }, [personTransactions, personCutoff]);

    const personTotalAdded = useMemo(() =>
        personTxsFiltered.filter(t => t.type === "credit").reduce((s, t) => s + (Number(t.amount) || 0), 0),
        [personTxsFiltered]);

    const personTotalSpent = useMemo(() =>
        personOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
        [personOrders]);

    // Revenue chart — last 14 days
    const revenueChartData = useMemo(() => {
        const map: Record<string, { date: string; Revenue: number; Orders: number }> = {};
        const today = new Date();
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = format(d, "yyyy-MM-dd");
            map[key] = { date: format(d, "MMM d"), Revenue: 0, Orders: 0 };
        }
        filteredOrders.forEach(o => {
            const key = toDateStr(o.createdAt);
            if (map[key]) {
                map[key].Revenue += Number(o.totalAmount) || 0;
                map[key].Orders += 1;
            }
        });
        return Object.values(map);
    }, [filteredOrders]);

    // Summary stats
    const totalRevenue = filteredOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const totalOrders = filteredOrders.reduce((total, o) =>
        total + (o.items && Array.isArray(o.items) ? o.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) : 1), 0);
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const uniqueCustomers = new Set(filteredOrders.map(o => o.userId)).size;

    const exportCSV = () => {
        const headers = ["Order ID", "Date", "User", "Room", "Slot", "Items", "Total", "Status"];
        const rows = filteredOrders.map(o => [
            o.id,
            o.createdAt ? format((o.createdAt as any).toDate?.() ?? new Date(o.createdAt as any), "yyyy-MM-dd HH:mm") : "N/A",
            o.userName || "N/A",
            (o as any).roomNumber || "N/A",
            getSlot(o),
            o.items.map(i => `${i.name} x${i.quantity}`).join("; "),
            o.totalAmount,
            o.status || "pending",
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `orders_${format(new Date(), "yyyy-MM-dd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const statusColor = (status: string) =>
        status === "completed" || status === "delivered"
            ? { bg: "rgba(16,185,129,0.15)", text: "#10b981", border: "rgba(16,185,129,0.3)" }
            : status === "rejected"
            ? { bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.3)" }
            : { bg: "rgba(148,163,184,0.1)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" };

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", color: "#94a3b8", fontSize: "15px" }}>
            Loading reports...
        </div>
    );

    const timeRangeBtns: { label: string; value: TimeRange }[] = [
        { label: "Last 7 Days", value: "7" },
        { label: "Last 14 Days", value: "14" },
        { label: "Last 30 Days", value: "30" },
        { label: "Lifetime", value: "all" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#fff", margin: 0 }}>Reports & Analytics</h2>
                    <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>Revenue, orders, and transaction insights</p>
                </div>
                <Button onClick={exportCSV} variant="outline" style={{ padding: "8px 16px", fontSize: "13px" }}>
                    <Download size={16} style={{ marginRight: "6px", display: "inline" }} />
                    Export CSV
                </Button>
            </div>

            {/* Filter Bar */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "13px", fontWeight: 600 }}>
                    <Filter size={14} />
                    Filter by:
                </div>

                <select
                    value={filterPerson}
                    onChange={e => setFilterPerson(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px", padding: "6px 10px", outline: "none", cursor: "pointer" }}
                >
                    <option value="">All Persons</option>
                    {personOptions.map(({ name, room }) => (
                        <option key={name} value={name} style={{ background: "#1e293b" }}>
                            {name}{room ? ` — Room: ${room}` : ""}
                        </option>
                    ))}
                </select>

                {hasFilter && (
                    <button
                        onClick={() => { setFilterPerson(""); }}
                        style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "12px", padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}
                    >
                        <X size={12} /> Clear
                    </button>
                )}
            </div>

            {/* ── PERSON PROFILE SECTION ─────────────────────────────────── */}
            {filterPerson && (
                <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "18px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>

                    {/* Person Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                        <Avatar name={filterPerson} email="" size={12} />
                        <div style={{ flex: 1 }}>
                            <p style={{ color: "#fff", fontSize: "20px", fontWeight: 900, margin: 0 }}>{filterPerson}</p>
                            <p style={{ color: "#64748b", fontSize: "12px", margin: "4px 0 0" }}>Individual student report</p>
                        </div>
                    </div>

                    {/* Time Range Filter */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {timeRangeBtns.map(btn => (
                            <button
                                key={btn.value}
                                onClick={() => setPersonTimeRange(btn.value)}
                                style={{
                                    padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", border: "1px solid",
                                    background: personTimeRange === btn.value ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
                                    borderColor: personTimeRange === btn.value ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)",
                                    color: personTimeRange === btn.value ? "#a5b4fc" : "#64748b",
                                }}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {personLoading ? (
                        <p style={{ color: "#64748b", fontSize: "13px" }}>Loading person data...</p>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>

                                {/* ID Card */}
                                <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "12px", padding: "16px" }}>
                                    <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>Student ID</p>
                                    <p style={{ color: "#c4b5fd", fontSize: "22px", fontWeight: 900, margin: 0 }}>#{(personData as any)?.userId || "—"}</p>
                                    <p style={{ color: "#475569", fontSize: "11px", margin: "2px 0 0" }}>Unique identifier</p>
                                </div>

                                {/* Room Card */}
                                <div style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.25)", borderRadius: "12px", padding: "16px" }}>
                                    <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>Room No.</p>
                                    <p style={{ color: "#38bdf8", fontSize: "22px", fontWeight: 900, margin: 0 }}>{(personData as any)?.roomNumber || "—"}</p>
                                    <p style={{ color: "#475569", fontSize: "11px", margin: "2px 0 0" }}>Assigned room</p>
                                </div>

                                {/* Balance Card */}
                                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "12px", padding: "16px" }}>
                                    <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>Current Balance</p>
                                    <p style={{ color: "#10b981", fontSize: "22px", fontWeight: 900, margin: 0 }}>৳{((personData as any)?.balance || 0).toLocaleString()}</p>
                                    <p style={{ color: "#475569", fontSize: "11px", margin: "2px 0 0" }}>Available balance</p>
                                </div>

                                {/* Total Added */}
                                <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: "12px", padding: "16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                        <ArrowDownLeft size={14} color="#10b981" />
                                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Total Added</p>
                                    </div>
                                    <p style={{ color: "#10b981", fontSize: "20px", fontWeight: 900, margin: 0 }}>৳{personTotalAdded.toLocaleString()}</p>
                                    <p style={{ color: "#475569", fontSize: "11px", margin: "2px 0 0" }}>Balance recharged</p>
                                </div>

                                {/* Total Spent */}
                                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", padding: "16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                        <ArrowUpRight size={14} color="#f87171" />
                                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Total Spent</p>
                                    </div>
                                    <p style={{ color: "#f87171", fontSize: "20px", fontWeight: 900, margin: 0 }}>৳{personTotalSpent.toLocaleString()}</p>
                                    <p style={{ color: "#475569", fontSize: "11px", margin: "2px 0 0" }}>On meals</p>
                                </div>

                                {/* Total Orders */}
                                <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", padding: "16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                        <ShoppingBag size={14} color="#818cf8" />
                                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Total Orders</p>
                                    </div>
                                    <p style={{ color: "#818cf8", fontSize: "20px", fontWeight: 900, margin: 0 }}>{personOrders.length}</p>
                                    <p style={{ color: "#475569", fontSize: "11px", margin: "2px 0 0" }}>Meals ordered</p>
                                </div>

                                {/* Avg Per Order */}
                                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px", padding: "16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                        <CalendarDays size={14} color="#fbbf24" />
                                        <p style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Avg Per Order</p>
                                    </div>
                                    <p style={{ color: "#fbbf24", fontSize: "20px", fontWeight: 900, margin: 0 }}>
                                        ৳{personOrders.length > 0 ? Math.round(personTotalSpent / personOrders.length).toLocaleString() : 0}
                                    </p>
                                    <p style={{ color: "#475569", fontSize: "11px", margin: "2px 0 0" }}>Average cost</p>
                                </div>

                            </div>

                            {/* Meal Order History Table */}
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <h4 style={{ color: "#fff", fontSize: "14px", fontWeight: 800, margin: 0 }}>
                                        🍽️ Meal History ({personOrders.length})
                                    </h4>
                                </div>
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                        <thead>
                                            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                                {["Order Date & Time", "Meal Date", "Meal", "Slot", "Amount", "Status"].map(h => (
                                                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {personOrders.length === 0 ? (
                                                <tr><td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#475569", fontSize: "13px" }}>No orders in this time range.</td></tr>
                                            ) : (
                                                personOrders.map((order, i) => {
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
                                                                <span style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "6px", padding: "2px 8px", fontSize: "12px", fontWeight: 700 }}>
                                                                    {mealDateStr}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: "10px 14px", color: "#e2e8f0", maxWidth: "180px" }}>
                                                                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    {order.items.map(it => `${it.name} (×${it.quantity})`).join(", ")}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                                                                {getSlot(order) ? (
                                                                    <span style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>{getSlot(order)}</span>
                                                                ) : <span style={{ color: "#475569" }}>—</span>}
                                                            </td>
                                                            <td style={{ padding: "10px 14px", color: "#10b981", fontWeight: 800, whiteSpace: "nowrap" }}>
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

                            {/* Balance Transaction History */}
                            {personTxsFiltered.length > 0 && (
                                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                                    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                        <h4 style={{ color: "#fff", fontSize: "14px", fontWeight: 800, margin: 0 }}>
                                            💳 Balance Transactions ({personTxsFiltered.length})
                                        </h4>
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
                                                {personTxsFiltered.map((tx, i) => {
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
                                                                    borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700, textTransform: "capitalize"
                                                                }}>
                                                                    {isCredit ? "↑ Added" : "↓ Debit"}
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
                        </>
                    )}
                </div>
            )}

            {/* Stat Cards (overall) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <StatCard icon={DollarSign} label="Total Revenue" value={`৳${totalRevenue.toLocaleString()}`} sub="from filtered orders" color="rgba(16,185,129,0.7)" />
                <StatCard icon={ShoppingBag} label="Total Orders" value={totalOrders.toLocaleString()} sub="across all slots" color="rgba(99,102,241,0.7)" />
                <StatCard icon={TrendingUp} label="Avg. Order Value" value={`৳${avgOrder.toLocaleString()}`} sub="per order" color="rgba(245,158,11,0.7)" />
                <StatCard icon={Users} label="Unique Customers" value={uniqueCustomers.toLocaleString()} sub="unique persons" color="rgba(14,165,233,0.7)" />
            </div>

            {/* Revenue Chart */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", padding: "24px" }}>
                <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 800, marginBottom: "20px" }}>
                    💰 Revenue — Last 14 Days
                </h3>
                <div style={{ height: "260px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="date" stroke="#475569" tick={{ fill: "#64748b", fontSize: 11 }} />
                            <YAxis stroke="#475569" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `৳${v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revenueGrad)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Orders Chart */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", padding: "24px" }}>
                <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 800, marginBottom: "20px" }}>
                    📦 Total Orders — Last 14 Days
                </h3>
                <div style={{ height: "220px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="date" stroke="#475569" tick={{ fill: "#64748b", fontSize: 11 }} />
                            <YAxis stroke="#475569" tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="Orders" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Orders Table */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", overflow: "hidden" }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ color: "#fff", fontSize: "15px", fontWeight: 800, margin: 0 }}>
                        📋 Orders ({filteredOrders.length})
                    </h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                                {["Date", "Customer", "Slot", "Items", "Status", "Total"].map(h => (
                                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#475569", fontSize: "14px" }}>
                                        No orders found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order, i) => {
                                    const sc = statusColor(order.status || "");
                                    return (
                                        <tr key={order.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                                            <td style={{ padding: "12px 16px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                                                {formatDateBD(order.createdAt)}
                                            </td>
                                            <td style={{ padding: "12px 16px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <Avatar name={order.userName} email={order.userEmail} size={8} />
                                                    <div>
                                                        <p style={{ color: "#ffffff", fontSize: "13px", fontWeight: 700, margin: 0 }}>
                                                            {order.userName || order.userEmail || "Unknown"}
                                                            {order.userNumericId != null && (
                                                                <span style={{ color: "#64748b", fontWeight: 500, fontSize: "12px" }}> (UID: {order.userNumericId})</span>
                                                            )}
                                                        </p>
                                                        {order.userEmail && (
                                                            <p style={{ color: "#64748b", fontSize: "11px", margin: "2px 0 0" }}>{order.userEmail}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                                                {getSlot(order) ? (
                                                    <span style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>
                                                        {getSlot(order)}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#475569", fontSize: "12px" }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ padding: "12px 16px", color: "#cbd5e1", maxWidth: "200px" }}>
                                                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {order.items.map(it => `${it.name} (${it.quantity})`).join(", ")}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 16px" }}>
                                                <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                                                    {order.status || "pending"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 16px", color: "#10b981", fontWeight: 800, whiteSpace: "nowrap" }}>
                                                ৳{Number(order.totalAmount).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
