import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAllOrders } from "../../services/db";
import { formatDateBD } from "../../utils/date";
import { Link } from "react-router-dom";
import {
    collection, getDocs, query, where
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
    DollarSign, ShoppingBag, Users, Clock, Utensils, ArrowRight
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Stat {
    label: string;
    value: number;
    icon: LucideIcon;
    bgColor: string;
    glow: string;
}

export default function ManagerDashboard() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stat[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const ordersData = await getAllOrders();
            const pending = ordersData.filter(o => !o.status || o.status === 'pending').length;

            // Get meals count
            const mealsSnapshot = await getDocs(collection(db, "meals"));
            const mealsCount = mealsSnapshot.docs.length;

            // Get pending balance requests
            const requestsQuery = query(
                collection(db, "balanceRequests"),
                where("status", "==", "pending")
            );
            const requestsSnapshot = await getDocs(requestsQuery);

            setStats([
                {
                    label: "Total Orders",
                    value: ordersData.length,
                    icon: ShoppingBag,
                    bgColor: "linear-gradient(135deg,#0284c7,#38bdf8)",
                    glow: "#38bdf8"
                },
                {
                    label: "Pending Orders",
                    value: pending,
                    icon: Clock,
                    bgColor: "linear-gradient(135deg,#d97706,#fbbf24)",
                    glow: "#fbbf24"
                },
                {
                    label: "Total Meals",
                    value: mealsCount,
                    icon: Utensils,
                    bgColor: "linear-gradient(135deg,#059669,#10b981)",
                    glow: "#10b981"
                },
                {
                    label: "Pending Requests",
                    value: requestsSnapshot.docs.length,
                    icon: DollarSign,
                    bgColor: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                    glow: "#a78bfa"
                }
            ]);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-400 font-medium">
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black" style={{ color: '#ffffff' }}>Manager Dashboard</h2>
                <div className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                    Welcome back, {currentUser?.name}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3" style={{ marginTop: '20px' }}>
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="rounded-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-2xl font-black" style={{ color: '#0f172a' }}>{stat.value}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#64748b' }}>{stat.label}</p>
                            </div>
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: stat.bgColor, boxShadow: `0 4px 12px ${stat.glow}40` }}
                            >
                                <stat.icon size={18} className="text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: '20px' }}>
                <h3 className="text-base font-bold mb-4" style={{ color: '#ffffff' }}>Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                    <Link
                        to="/manager/meals"
                        className="group rounded-2xl hover:-translate-y-0.5 transition-all duration-200"
                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 12px', display: 'block', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(14,165,233,0.12)' }}>
                                <Utensils size={18} style={{ color: '#0284c7' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold flex items-center gap-1" style={{ color: '#0f172a' }}>
                                    Manage Meals
                                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#0284c7' }} />
                                </h4>
                                <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>Add, edit, or remove meals</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/manager/orders"
                        className="group rounded-2xl hover:-translate-y-0.5 transition-all duration-200"
                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 12px', display: 'block', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(5,150,105,0.12)' }}>
                                <ShoppingBag size={18} style={{ color: '#059669' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold flex items-center gap-1" style={{ color: '#0f172a' }}>
                                    View Orders
                                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#059669' }} />
                                </h4>
                                <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>Manage customer orders</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/manager/users"
                        className="group rounded-2xl hover:-translate-y-0.5 transition-all duration-200"
                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 12px', display: 'block', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.12)' }}>
                                <Users size={18} style={{ color: '#7c3aed' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold flex items-center gap-1" style={{ color: '#0f172a' }}>
                                    View Users
                                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#7c3aed' }} />
                                </h4>
                                <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>Manage student accounts</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/manager/balance-requests"
                        className="group rounded-2xl hover:-translate-y-0.5 transition-all duration-200"
                        style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 12px', display: 'block', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(217,119,6,0.12)' }}>
                                <DollarSign size={18} style={{ color: '#d97706' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold flex items-center gap-1" style={{ color: '#0f172a' }}>
                                    Balance Requests
                                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#d97706' }} />
                                </h4>
                                <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>Approve or reject requests</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
