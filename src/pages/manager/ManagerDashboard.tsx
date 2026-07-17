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
                <h2 className="text-2xl font-black text-slate-800">Manager Dashboard</h2>
                <div className="text-sm text-slate-500 font-medium">
                    Welcome back, {currentUser?.name}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                        style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.07)" }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">{stat.label}</p>
                            </div>
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: stat.bgColor, boxShadow: `0 6px 16px ${stat.glow}40` }}
                            >
                                <stat.icon size={22} className="text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions Header */}
            <div>
                <h3 className="text-base font-bold text-slate-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Link
                        to="/manager/meals"
                        className="group bg-white border border-slate-200 rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-200"
                        style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600 transition-colors group-hover:bg-sky-100">
                                <Utensils size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 group-hover:text-sky-600 transition-colors flex items-center gap-1.5">
                                    Manage Meals
                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">Add, edit, or remove meals</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/manager/orders"
                        className="group bg-white border border-slate-200 rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-200"
                        style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-100">
                                <ShoppingBag size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                                    View Orders
                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">Manage customer orders</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        to="/manager/users"
                        className="group bg-white border border-slate-200 rounded-2xl p-6 hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all duration-200"
                        style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 transition-colors group-hover:bg-purple-100">
                                <Users size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                                    View Users
                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">Request balance changes</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
