import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAllOrdersEnriched, getUsers, getCustomCSS, saveCustomCSS } from "../../services/db";
import { formatDateBD } from "../../utils/date";
import { enrichWithdrawalsWithUserData } from "../../utils/userMapping";
import { CustomerCell, RoomNoCell } from "../../components/admin/UserDisplay";
import { Link } from "react-router-dom";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    ShoppingBag, Users, Clock,
    ArrowRight, TrendingUp, TrendingDown,
    CheckCircle, Wallet, ChefHat, Settings,
    Code2, Sparkles, Save, RotateCcw, Eye, EyeOff, Copy, Check, AlertTriangle,
} from "lucide-react";
import { db } from "../../services/firebase";
import { injectCSS, useCustomCSS } from "../../hooks/useCustomCSS";
import type { Order, WithdrawalRequest } from "../../types";

/* ─────────────────────────────────────────────
   Tiny reusable card shell
───────────────────────────────────────────── */
function Card({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
    return (
        <div
            id={id}
            className={`admin-card bg-white rounded-2xl border border-slate-200 ${className}`}
            style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.07)" }}
        >
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Card header row
───────────────────────────────────────────── */
function CardHeader({ title, subtitle, action }: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}) {
    return (
        <div
            className="admin-card-header flex items-center justify-between px-6 py-4 gap-4"
            style={{ borderBottom: "1px solid #f1f5f9" }}
        >
            <div className="min-w-0">
                <h3 className="admin-card-header-title text-sm font-bold text-slate-800 truncate">{title}</h3>
                {subtitle && <p className="admin-card-header-sub text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Pill link / badge
───────────────────────────────────────────── */
function PillLink({ to, color, bg, border, children }: {
    to: string; color: string; bg: string; border: string; children: React.ReactNode;
}) {
    return (
        <Link
            to={to}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ color, background: bg, border: `1px solid ${border}` }}
        >
            {children}
        </Link>
    );
}

/* ─────────────────────────────────────────────
   StatusBadge
───────────────────────────────────────────── */
function StatusBadge({ status }: { status?: string }) {
    const label = (status || "pending").toLowerCase();
    const map: Record<string, { bg: string; color: string; border: string }> = {
        completed: { bg: "#f0fdf4", color: "#059669", border: "#bbf7d0" },
        delivered: { bg: "#f0fdf4", color: "#059669", border: "#bbf7d0" },
        pending:   { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
        rejected:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
        cancelled: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
        hold:      { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
    };
    const s = map[label] ?? map.pending;
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
            {label}
        </span>
    );
}

/* ═══════════════════════════════════════════
   Main Dashboard
═══════════════════════════════════════════ */
export default function AdminDashboard() {
    const { currentUser } = useAuth();
    // Load & inject saved custom CSS on every dashboard visit
    useCustomCSS();
    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
    const [loading, setLoading] = useState(true);

    // ── CSS editor state ──────────────────────────────────────
    const [css, setCssValue] = useState("");
    const [savedCss, setSavedCss] = useState("");
    const [cssSaving, setCssSaving] = useState(false);
    const [cssLoading, setCssLoading] = useState(true);
    const [cssPreview, setCssPreview] = useState(true);
    const [cssCopied, setCssCopied] = useState(false);
    const [cssSaveOk, setCssSaveOk] = useState(false);
    const cssRef = useRef<HTMLTextAreaElement>(null);

    const STARTER = `/* ═══════════════════════════════════════
   Admin Dashboard – Custom CSS
   Use the class names from the reference
   panel below to style any element.
═══════════════════════════════════════ */

/* Example: dark stat cards */
/* .admin-stat-card { background: #1e293b !important; } */

/* Example: custom banner gradient */
/* .admin-banner { background: linear-gradient(135deg,#0f172a,#4f46e5) !important; } */
`;

    const CSS_CLASSES = [
        { label: "Dashboard", cls: [".admin-dashboard", ".admin-banner", ".admin-banner-title", ".admin-banner-sub"] },
        { label: "Stat Cards", cls: [".admin-stat-cards", ".admin-stat-card", ".admin-stat-card-icon", ".admin-stat-card-value", ".admin-stat-card-label", ".admin-stat-card-badge"] },
        { label: "Charts", cls: [".admin-chart-revenue", ".admin-chart-revenue-empty", ".admin-chart-status"] },
        { label: "Orders Table", cls: [".admin-orders-card", ".admin-orders-table", ".admin-orders-th", ".admin-orders-td", ".admin-orders-row"] },
        { label: "Withdrawals", cls: [".admin-withdrawals-card", ".admin-withdrawals-table", ".admin-withdrawals-th", ".admin-withdrawals-td", ".admin-withdrawals-row"] },
        { label: "Common", cls: [".admin-card", ".admin-card-header", ".admin-card-header-title", ".admin-card-header-sub", ".admin-status-badge", ".admin-uid-badge"] },
    ];

    const SNIPPETS = [
        { label: "Dark stat cards", code: ".admin-stat-card {\n  background: #1e293b !important;\n  border-color: #334155 !important;\n  color: #f1f5f9 !important;\n}" },
        { label: "Custom banner", code: ".admin-banner {\n  background: linear-gradient(135deg,#0f172a,#4f46e5) !important;\n}" },
        { label: "Orange card borders", code: ".admin-card {\n  border-color: rgba(249,115,22,0.4) !important;\n}" },
        { label: "Large metric font", code: ".admin-stat-card-value {\n  font-size: 2rem !important;\n}" },
        { label: "Teal UID badges", code: ".admin-uid-badge {\n  background: #0d9488 !important;\n  color: #fff !important;\n  border-color: transparent !important;\n}" },
        { label: "Rounded table rows", code: ".admin-orders-row td { border-radius: 0; }\n.admin-orders-row:hover { background: #f0f9ff !important; }" },
    ];

    const [stats, setStats] = useState({ revenue: 0, totalOrders: 0, pendingOrders: 0, totalUsers: 0 });
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
    const [revenueData, setRevenueData] = useState<{ name: string; revenue: number }[]>([]);
    const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => { fetchDashboardData(); }, []);

    // Load saved CSS when Settings tab is opened
    useEffect(() => {
        getCustomCSS().then(s => {
            const val = s || STARTER;
            setCssValue(val);
            setSavedCss(val);
        }).catch(console.error).finally(() => setCssLoading(false));
    }, []);

    // Live preview
    useEffect(() => {
        if (cssPreview) injectCSS(css);
    }, [css, cssPreview]);

    const fetchDashboardData = async () => {
        try {
            const [ordersData, usersData] = await Promise.all([getAllOrdersEnriched(), getUsers()]);
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const snap = await getDocs(query(
                collection(db, "balanceRequests"),
                where("type", "==", "withdraw"),
                where("status", "==", "pending")
            ));
            const withdrawalsRaw = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
            const withdrawalsData = enrichWithdrawalsWithUserData(withdrawalsRaw, usersData);

            const totalRevenue = ordersData.reduce((s, o) => s + (o.totalAmount || 0), 0);
            const pending = ordersData.filter(o => !o.status || o.status === 'pending').length;
            setStats({ revenue: totalRevenue, totalOrders: ordersData.length, pendingOrders: pending, totalUsers: usersData.length });
            setRecentOrders(ordersData.slice(0, 6));
            setWithdrawalRequests(withdrawalsData.slice(0, 5));

            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            setRevenueData(last7Days.map(date => ({
                name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: ordersData
                    .filter(o => { const dv = o.createdAt as any; return dv?.toDate?.()?.toISOString().split('T')[0] === date; })
                    .reduce((s, o) => s + (o.totalAmount || 0), 0),
            })));

            const statusCounts = ordersData.reduce((acc: Record<string, number>, o) => {
                const s = o.status || 'pending'; acc[s] = (acc[s] || 0) + 1; return acc;
            }, {});
            setStatusData(Object.keys(statusCounts).map(k => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: statusCounts[k] })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const PIE_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

    // ── CSS editor helpers ────────────────────────────────────
    const handleCssSave = async () => {
        setCssSaving(true);
        try {
            await saveCustomCSS(css);
            setSavedCss(css);
            injectCSS(css);
            setCssSaveOk(true);
            setTimeout(() => setCssSaveOk(false), 2500);
        } catch { alert("Failed to save."); }
        finally { setCssSaving(false); }
    };
    const insertSnippet = (code: string) => {
        const ta = cssRef.current;
        if (!ta) return;
        const s = ta.selectionStart;
        const next = css.slice(0, s) + "\n" + code + "\n" + css.slice(s);
        setCssValue(next);
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + code.length + 2; ta.focus(); }, 0);
    };
    const cssDirty = css !== savedCss;

    // ── Stat card definitions ──────────────────────────────────────────
    const statCards = [
        {
            label: "Total Revenue",
            value: `৳${stats.revenue.toLocaleString()}`,
            sub: "All time earnings",
            icon: Wallet,
            iconBg: "linear-gradient(135deg,#059669,#10b981)",
            glow: "#10b981",
            badge: "+12.5%",
            up: true,
        },
        {
            label: "Total Orders",
            value: stats.totalOrders.toLocaleString(),
            sub: "Orders placed",
            icon: ShoppingBag,
            iconBg: "linear-gradient(135deg,#0284c7,#38bdf8)",
            glow: "#38bdf8",
            badge: "+8.2%",
            up: true,
        },
        {
            label: "Pending Orders",
            value: stats.pendingOrders.toLocaleString(),
            sub: "Awaiting fulfillment",
            icon: Clock,
            iconBg: "linear-gradient(135deg,#d97706,#fbbf24)",
            glow: "#fbbf24",
            badge: "-3.1%",
            up: false,
        },
        {
            label: "Total Users",
            value: stats.totalUsers.toLocaleString(),
            sub: "Registered students",
            icon: Users,
            iconBg: "linear-gradient(135deg,#7c3aed,#a78bfa)",
            glow: "#a78bfa",
            badge: "+21.4%",
            up: true,
        },
    ];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center gap-4">
                <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse"
                    style={{ background: "linear-gradient(135deg,#f97316,#fbbf24)" }}
                >
                    <ChefHat size={28} className="text-white" />
                </div>
                <p className="text-sm font-medium text-slate-400">Loading dashboard…</p>
            </div>
        </div>
    );

    return (
        <div className="admin-dashboard space-y-6">

            {/* Welcome Banner */}
            <div
                className="admin-banner relative overflow-hidden rounded-2xl px-7 py-8"
                style={{
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #312e81 100%)",
                    boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
                }}
            >
                {/* decorative blobs */}
                <div className="pointer-events-none absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-20"
                    style={{ background: "radial-gradient(circle,#f97316,transparent 70%)" }} />
                <div className="pointer-events-none absolute bottom-0 right-48 w-36 h-36 rounded-full opacity-10"
                    style={{ background: "radial-gradient(circle,#8b5cf6,transparent 70%)" }} />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    {/* left text */}
                    <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: "#fb923c" }}>
                            👋 Welcome back,
                        </p>
                        <h2 className="admin-banner-title text-2xl sm:text-3xl font-black text-white leading-tight">
                            {currentUser?.name || "Admin"}!
                        </h2>
                        <p className="admin-banner-sub text-sm mt-1.5 text-white/50">
                            Here's what's happening with your dining platform today.
                        </p>
                    </div>

                    {/* right date pill */}
                    <div
                        className="flex items-center gap-3 self-start sm:self-auto px-4 py-3 rounded-xl shrink-0"
                        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "linear-gradient(135deg,#f97316,#fbbf24)" }}
                        >
                            <ChefHat size={18} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>
                                {new Date().toLocaleDateString("en-US", { weekday: "long" })}
                            </span>
                            <span className="text-sm font-bold text-white leading-tight">
                                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tab Switcher ── */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'overview'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === 'settings'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Settings size={16} />
                    Settings
                </button>
            </div>

            {activeTab === 'overview' ? (
                <>
                    {/* ══════════════════════════════════════
                        Stat Cards — uniform p-6, flex-col justify-between
                    ══════════════════════════════════════ */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card
                            key={i}
                            className="admin-stat-card hover:-translate-y-0.5 transition-transform duration-200 cursor-default"
                            style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.07)" } as React.CSSProperties}
                        >
                            {/* top row: icon + trend badge — never overflow */}
                            <div className="flex items-start justify-between gap-3">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                    style={{
                                        background: stat.iconBg,
                                        boxShadow: `0 6px 16px ${stat.glow}40`,
                                    }}
                                >
                                    <Icon size={20} className="text-white" />
                                </div>

                                <span
                                    className="admin-stat-card-badge inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap"
                                    style={stat.up
                                        ? { background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0" }
                                        : { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }
                                    }
                                >
                                    {stat.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                    {stat.badge}
                                </span>
                            </div>

                            {/* bottom block: value + label — anchored to bottom via justify-between */}
                            <div className="mt-4">
                                <p className="admin-stat-card-value text-2xl font-black text-slate-800 leading-tight">
                                    {stat.value}
                                </p>
                                <p className="admin-stat-card-label text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                                    {stat.label}
                                </p>
                                <p className="text-[11px] text-slate-300 mt-0.5">{stat.sub}</p>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Area Chart ── 2 cols */}
                <Card className="admin-chart-revenue lg:col-span-2 p-6">
                    {/* header */}
                    <div className="flex items-center justify-between mb-5 gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Revenue Overview</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Last 7 days performance</p>
                        </div>
                        <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#059669" }}
                        >
                            <TrendingUp size={13} /> Revenue
                        </span>
                    </div>

                    {/* chart — empty state when all zeros */}
                    {revenueData.every(d => d.revenue === 0) ? (
                        <div
                            className="admin-chart-revenue-empty h-56 flex flex-col items-center justify-center gap-3 rounded-xl"
                            style={{ background: "#f8fafc", border: "1px dashed #e2e8f0" }}
                        >
                            <TrendingUp size={32} className="text-slate-300" />
                            <p className="text-sm font-semibold text-slate-400">No revenue data this week</p>
                            <p className="text-xs text-slate-300">Orders will appear here once placed</p>
                        </div>
                    ) : (
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name"
                                        tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Outfit" }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis
                                        tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "Outfit" }}
                                        axisLine={false} tickLine={false}
                                        domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 100)]}
                                    />
                                    <Tooltip
                                        formatter={(v) => [`৳${v}`, "Revenue"]}
                                        contentStyle={{
                                            background: "#fff", border: "1px solid #e2e8f0",
                                            borderRadius: "12px", fontFamily: "Outfit",
                                            boxShadow: "0 8px 24px rgba(15,23,42,0.1)",
                                        }}
                                        labelStyle={{ color: "#64748b", fontSize: "12px" }}
                                        itemStyle={{ color: "#f97316", fontWeight: "700" }}
                                        cursor={{ stroke: "#f97316", strokeWidth: 1, strokeDasharray: "4 2" }}
                                    />
                                    <Area
                                        type="monotone" dataKey="revenue"
                                        stroke="#f97316" strokeWidth={2.5}
                                        fill="url(#revGrad)"
                                        dot={{ fill: "#f97316", strokeWidth: 2, r: 4, stroke: "#fff" }}
                                        activeDot={{ r: 6, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* Pie Chart ── 1 col */}
                <Card className="admin-chart-status p-6">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-800">Order Status</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Distribution breakdown</p>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%" cy="42%"
                                    innerRadius={50} outerRadius={78}
                                    paddingAngle={3} dataKey="value"
                                >
                                    {statusData.map((_, idx) => (
                                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "#fff", border: "1px solid #e2e8f0",
                                        borderRadius: "10px", fontFamily: "Outfit", fontSize: "13px",
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom" iconType="circle" iconSize={8}
                                    wrapperStyle={{ fontSize: "11px", color: "#64748b", fontFamily: "Outfit" }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* ══════════════════════════════════════
                Recent Orders table
            ══════════════════════════════════════ */}
            <Card>
                <CardHeader
                    title="Recent Orders"
                    subtitle={`Latest ${recentOrders.length} transactions`}
                    action={
                        <PillLink to="/admin/orders" color="#f97316" bg="#fff7ed" border="#fed7aa">
                            View All <ArrowRight size={13} />
                        </PillLink>
                    }
                />

                <div className="overflow-x-auto">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                {["Order #", "Customer", "Room No.", "Amount", "Status", "Date"].map(h => (
                                    <th key={h}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-sm text-slate-400">
                                        No recent orders found
                                    </td>
                                </tr>
                            ) : recentOrders.map((order, idx) => (
                                <tr key={order.id}>
                                    <td className="whitespace-nowrap">
                                        <Link
                                            to="/admin/orders"
                                            className="text-sm font-bold"
                                            style={{ color: "#0ea5e9" }}
                                        >
                                            #{String(idx + 1).padStart(4, "0")}
                                        </Link>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <CustomerCell
                                            name={order.userName}
                                            email={order.userEmail}
                                            userNumericId={order.userNumericId}
                                        />
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <RoomNoCell roomNumber={order.roomNumber} />
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <span className="text-sm font-extrabold" style={{ color: "#059669" }}>
                                            ৳{order.totalAmount?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="whitespace-nowrap text-sm text-slate-500">
                                        {order.createdAt ? formatDateBD(order.createdAt as any) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Pending Withdrawals table */}
            <Card className="admin-withdrawals-card">
                <CardHeader
                    title="Pending Withdrawals"
                    subtitle={`${withdrawalRequests.length} request${withdrawalRequests.length !== 1 ? "s" : ""} awaiting approval`}
                    action={
                        <PillLink to="/admin/balance-requests" color="#d97706" bg="#fffbeb" border="#fde68a">
                            View All <ArrowRight size={13} />
                        </PillLink>
                    }
                />

                {withdrawalRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-14">
                        <CheckCircle size={36} style={{ color: "#10b981" }} />
                        <p className="text-sm font-medium text-slate-500">
                            All caught up! No pending withdrawal requests.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    {["Request #", "Student", "Amount", "bKash No.", "Reason", "Date"].map(h => (
                                        <th key={h}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawalRequests.map(req => (
                                    <tr key={req.id}>
                                        <td className="whitespace-nowrap">
                                            <span className="text-sm font-bold" style={{ color: "#d97706" }}>
                                                #{req.requestNumber || "—"}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <CustomerCell
                                                name={req.userName}
                                                email={req.userEmail}
                                                userNumericId={req.userNumericId}
                                            />
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span className="text-sm font-extrabold" style={{ color: "#dc2626" }}>
                                                ৳{Math.abs(req.amount).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span
                                                className="text-sm font-mono px-2.5 py-1 rounded-lg"
                                                style={{ background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0" }}
                                            >
                                                {req.bkashNumber || "—"}
                                            </span>
                                        </td>
                                        <td className="max-w-[160px]">
                                            <p className="text-sm text-slate-500 truncate">
                                                {req.reason || "—"}
                                            </p>
                                        </td>
                                        <td className="whitespace-nowrap text-sm text-slate-500">
                                            {req.createdAt ? formatDateBD(req.createdAt as any) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            </>
            ) : (
                <div className="space-y-5 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Code2 size={22} className="text-orange-500" />
                                Custom CSS Editor
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Write CSS targeting the admin dashboard class names. Changes apply instantly with live preview.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setCssPreview(p => !p)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                    cssPreview ? "bg-emerald-50 border border-emerald-200 text-emerald-600" : "bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                {cssPreview ? <Eye size={14} /> : <EyeOff size={14} />}
                                {cssPreview ? "Live Preview ON" : "Preview OFF"}
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(css).then(() => {
                                        setCssCopied(true);
                                        setTimeout(() => setCssCopied(false), 2000);
                                    });
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 transition-all"
                            >
                                {cssCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                {cssCopied ? "Copied!" : "Copy"}
                            </button>
                            <button
                                onClick={() => { if (confirm("Reset to last saved version?")) setCssValue(savedCss); }}
                                disabled={!cssDirty}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:text-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <RotateCcw size={14} /> Reset
                            </button>
                            <button
                                onClick={handleCssSave}
                                disabled={cssSaving || !cssDirty}
                                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                                    cssSaveOk ? "bg-emerald-500 text-white" : "bg-orange-500 text-white hover:bg-orange-600"
                                }`}
                            >
                                {cssSaveOk ? <><Check size={14} /> Saved!</> : cssSaving ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : <><Save size={14} /> Save CSS</>}
                            </button>
                        </div>
                    </div>
                    {cssDirty && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                            <AlertTriangle size={14} />
                            You have unsaved changes — click "Save CSS" to persist them.
                        </div>
                    )}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                        <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xl flex flex-col">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-950/50">
                                <div className="flex items-center gap-2.5">
                                    <Code2 size={15} className="text-orange-400" />
                                    <span className="text-xs font-bold text-slate-300">styles.css</span>
                                    {cssDirty && <span className="w-2 h-2 rounded-full bg-orange-400" title="Unsaved changes" />}
                                </div>
                            </div>
                            <div className="relative flex flex-1">
                                <div className="select-none shrink-0 pt-4 pb-4 text-right pr-3 pl-3 text-[11px] font-mono leading-6 text-slate-500 border-r border-white/10 bg-slate-900/50" aria-hidden>
                                    {css.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
                                </div>
                                <textarea
                                    ref={cssRef}
                                    value={css}
                                    onChange={(e) => setCssValue(e.target.value)}
                                    spellCheck={false}
                                    className="flex-1 resize-none bg-transparent p-4 text-[13px] font-mono leading-6 text-slate-200 outline-none placeholder-slate-600 min-h-[480px]"
                                    placeholder="/* Write your custom CSS here */"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                    <Sparkles size={14} className="text-amber-500" />
                                    <span className="text-xs font-bold text-slate-700">Quick Snippets</span>
                                </div>
                                <div className="p-3 space-y-2">
                                    {SNIPPETS.map(({ label, code }) => (
                                        <button key={label} onClick={() => insertSnippet(code)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-orange-500 transition-colors border border-transparent hover:border-slate-100">+ {label}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex-1">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                    <Code2 size={14} className="text-violet-500" />
                                    <span className="text-xs font-bold text-slate-700">Class Reference</span>
                                </div>
                                <div className="overflow-y-auto max-h-80 p-3 space-y-3">
                                    {CSS_CLASSES.map(({ label, cls }) => (
                                        <div key={label}>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {cls.map((c) => (
                                                    <button key={c} onClick={() => insertSnippet(`${c} {\n  \n}`)} className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-violet-600 bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-colors">{c}</button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
