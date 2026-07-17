import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { formatDateBD } from "../../utils/date";
import { Clock, CheckCircle, XCircle, Package, Calendar } from "lucide-react";
import type { Order } from "../../types";

export default function OrderHistory() {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser?.uid) {
            setLoading(false);
            return;
        }

        // Simple query without orderBy to avoid index requirement
        const q = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.uid)
        );

        // Real-time listener
        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const ordersData = snapshot.docs.map(doc => {
                    const data = { id: doc.id, ...doc.data() } as Order;
                    return data;
                });

                // Sort manually by createdAt
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

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, [currentUser]);

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
            <div className="py-6">
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
        <div className="w-full py-6" style={{width: '100%', display:'block', margin: '20px 50px'}}>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-800">
                    Order History
                </h1>
                <p className="text-xs text-slate-500 mt-1">Track and manage your dining order history</p>
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                    <div className="p-6 bg-slate-50 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6" >
                        <Package className="text-slate-400" size={36} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Orders Yet</h3>
                    <p className="text-slate-500 font-medium">Start ordering delicious meals from our menu!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order, index) => (
                        <div 
                            key={order.id} 
                            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
                            style={{padding: '10px', margin: '10px 0'}}
                        >
                            {/* Order Info Left */}
                            <div className="flex gap-4 items-center">
                                <div>
                                    <h4 className="text-slate-800 font-bold text-lg mb-0.5">Order #{index + 1}</h4>
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                                        <Calendar size={12} />
                                        <span>{order.createdAt ? formatDateBD(order.createdAt) : 'Just now'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items Middle */}
                            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3.5 w-full md:w-auto">
                                <div className="space-y-1.5">
                                    {order.items && order.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 font-medium">
                                                {item.name} <span className="text-slate-400 ml-1">× {item.quantity}</span>
                                            </span>
                                            <span className="text-slate-800 font-bold">৳{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Order Status & Total Right */}
                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4">
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={order.status || 'pending'} />
                                    <div className="text-right">
                                        <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">Total Paid</span>
                                        <span className="text-xl font-black text-orange-600">
                                            ৳{order.totalAmount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
