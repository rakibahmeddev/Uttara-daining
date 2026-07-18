import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { formatDateBD } from "../../utils/date";
import { Clock, CheckCircle, XCircle, Package, Calendar, Search, Filter } from "lucide-react";
import type { Order } from "../../types";

const slotOptions = ["breakfast", "lunch", "dinner"];

const getSlot = (order: any) => {
    if (order.slot) return order.slot;
    if (order.timeSlot) return order.timeSlot;
    if (order.items && order.items.length > 0) {
        if (order.items[0].timeSlot) return order.items[0].timeSlot;
    }
    return "—";
};

export default function OrderHistory() {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [slotFilter, setSlotFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("");

    useEffect(() => {
        if (!currentUser?.uid) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.uid)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const ordersData = snapshot.docs.map(doc => {
                    const data = { id: doc.id, ...doc.data() } as Order;
                    return data;
                });

                ordersData.sort((a, b) => {
                    const aTime = a.createdAt?.seconds || 0;
                    const bTime = b.createdAt?.seconds || 0;
                    return bTime - aTime;
                });

                setOrders(ordersData);
                setError(null);
                setLoading(false);
            },
            (err) => {
                console.error("Error in orders listener:", err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Slot filter
            if (slotFilter !== "all") {
                const orderSlot = getSlot(order).toLowerCase();
                if (slotFilter === "—" && orderSlot !== "—") {
                    if (slotOptions.includes(orderSlot)) return false;
                } else if (slotFilter !== "—" && orderSlot !== slotFilter.toLowerCase()) {
                    return false;
                }
            }
            
            // Date filter
            if (dateFilter) {
                if (!order.createdAt) return false;
                const orderDate = new Date(order.createdAt.seconds * 1000);
                const filterDate = new Date(dateFilter);
                if (
                    orderDate.getFullYear() !== filterDate.getFullYear() ||
                    orderDate.getMonth() !== filterDate.getMonth() ||
                    orderDate.getDate() !== filterDate.getDate()
                ) {
                    return false;
                }
            }
            
            return true;
        });
    }, [orders, slotFilter, dateFilter]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-slate-400 font-medium">Loading your orders...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-6 w-full max-w-4xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center max-w-xl mx-auto">
                    <h3 className="text-xl font-bold text-red-650 mb-2">Error Loading Orders</h3>
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl py-8 mx-auto" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', margin: '16px auto' }}>
            <div className="w-full text-center mb-8">
                <h1 className="text-2xl font-black text-slate-800">
                    Order History
                </h1>
                <p className="text-sm text-slate-500 mt-1">Track and manage your dining order history</p>
            </div>

            {/* Filters */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                <div className="relative w-full sm:w-auto" style={{ marginBottom: '10px' }}>
                    <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                        value={slotFilter}
                        onChange={(e) => setSlotFilter(e.target.value)}
                        className="w-full sm:w-48 appearance-none py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer text-slate-700 font-medium"
                        style={{ paddingLeft: '40px', paddingRight: '32px' }}
                    >
                        <option value="all">All Slots</option>
                        {slotOptions.map(s => (
                            <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                        <option value="—">Unknown</option>
                    </select>
                </div>

                <div className="relative w-full sm:w-auto" style={{ marginBottom: '10px' }}>
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full sm:w-48 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-700"
                        style={{ paddingLeft: '40px', paddingRight: '16px' }}
                    />
                </div>
                
                {(slotFilter !== "all" || dateFilter) && (
                    <button
                        onClick={() => { setSlotFilter("all"); setDateFilter(""); }}
                        className="text-sm font-semibold text-orange-500 hover:text-orange-600 px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Orders List / Table */}
            {orders.length === 0 ? (
                <div className="w-full bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                    <div className="p-6 bg-slate-50 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6" >
                        <Package className="text-slate-400" size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Orders Yet</h3>
                    <p className="text-slate-500 font-medium">Start ordering delicious meals from our menu!</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="w-full bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">No Matching Orders</h3>
                    <p className="text-slate-500">Try changing your filter options.</p>
                </div>
            ) : (
                <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto" style={{ width: '100%', WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full text-left border-collapse" style={{ minWidth: '650px' }}>
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200">
                                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider" style={{ padding: '16px 24px' }}>#</th>
                                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider" style={{ padding: '16px 24px' }}>Date & Slot</th>
                                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider" style={{ padding: '16px 24px' }}>Items</th>
                                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider" style={{ padding: '16px 24px' }}>Total</th>
                                    <th className="text-xs font-bold text-slate-500 uppercase tracking-wider" style={{ padding: '16px 24px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOrders.map((order, index) => {
                                    const actualIndex = orders.findIndex(o => o.id === order.id);
                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="whitespace-nowrap text-sm font-semibold text-slate-700" style={{ padding: '16px 24px' }}>
                                                {orders.length - actualIndex}
                                            </td>
                                            <td className="whitespace-nowrap" style={{ padding: '16px 24px' }}>
                                                <div className="text-sm font-semibold text-slate-800">
                                                    {order.createdAt ? formatDateBD(order.createdAt) : 'Just now'}
                                                </div>
                                                <div className="text-xs text-slate-500 capitalize font-medium mt-0.5">
                                                    Slot: {getSlot(order)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div className="flex flex-col gap-1 min-w-[140px]">
                                                    {order.items && order.items.map((item, idx) => (
                                                        <div key={idx} className="text-sm text-slate-600 flex items-center justify-between">
                                                            <span className="truncate pr-2">{item.name}</span>
                                                            <span className="font-semibold text-slate-400 shrink-0">×{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap text-sm font-black text-slate-800" style={{ padding: '16px 24px' }}>
                                                ৳{order.totalAmount}
                                            </td>
                                            <td className="whitespace-nowrap" style={{ padding: '16px 24px' }}>
                                                <StatusBadge status={order.status || 'pending'} />
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

function StatusBadge({ status }: { status: string }) {
    const config = {
        pending: {
            icon: Clock,
            bg: "bg-amber-50",
            border: "border-amber-200",
            text: "text-amber-600",
            label: "Pending"
        },
        completed: {
            icon: CheckCircle,
            bg: "bg-emerald-50",
            border: "border-emerald-200",
            text: "text-emerald-600",
            label: "Completed"
        },
        delivered: {
            icon: CheckCircle,
            bg: "bg-emerald-50",
            border: "border-emerald-200",
            text: "text-emerald-600",
            label: "Delivered"
        },
        rejected: {
            icon: XCircle,
            bg: "bg-red-50",
            border: "border-red-200",
            text: "text-red-650",
            label: "Rejected"
        },
        cancelled: {
            icon: XCircle,
            bg: "bg-red-50",
            border: "border-red-200",
            text: "text-red-650",
            label: "Cancelled"
        }
    };

    const { icon: Icon, bg, border, text, label } = config[status] || config.pending;

    return (
        <div className={`${bg} border ${border} px-2.5 py-1 rounded-full flex items-center gap-1.5 inline-flex`}>
            <Icon size={12} className={text} />
            <span className={`text-[10px] font-bold ${text}`}>
                {label}
            </span>
        </div>
    );
}
