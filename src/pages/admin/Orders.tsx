import { useState, useEffect } from "react";
import { getAllOrdersEnriched, updateOrderStatus } from "../../services/db";
import { Button } from "../../components/ui/Button";
import { formatDateBD } from "../../utils/date";
import { cn } from "../../utils/cn";
import { CustomerCell, RoomNoCell } from "../../components/admin/UserDisplay";
import type { Order } from "../../types";

export default function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await getAllOrdersEnriched();
            setOrders(data);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId: string, status: string) => {
        if (confirm(`Mark order as ${status}?`)) {
            await updateOrderStatus(orderId, status);
            fetchOrders();
        }
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        const status = order.status || 'pending';
        if (filter === 'delivered') return status === 'delivered' || status === 'completed';
        return status === filter;
    });

    const tabs = [
        { id: "pending", label: "Pending" },
        { id: "hold", label: "Hold" },
        { id: "delivered", label: "Delivered" },
        { id: "rejected", label: "Rejected" },
        { id: "all", label: "All Orders" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px] text-sm text-slate-400">
                Loading orders…
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up manage-Orders-admin
">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800">Manage Orders</h2>
                <Button onClick={fetchOrders} variant="outline" size="sm">Refresh</Button>
            </div>

            <div className="flex space-x-1 rounded-xl bg-slate-50 border border-slate-100 p-1 mb-6 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                            filter === tab.id
                                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Room No.</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-slate-500 text-sm">
                                        No orders found in "{filter}"
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order, index) => (
                                    <tr key={order.id}>
                                        <td className="whitespace-nowrap text-sm font-bold text-slate-800">
                                            #{String(index + 1).padStart(4, "0")}
                                        </td>
                                        <td className="whitespace-nowrap text-sm text-slate-500">
                                            {order.createdAt ? formatDateBD(order.createdAt) : "—"}
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
                                        <td className="text-sm text-slate-600 max-w-xs truncate">
                                            {order.items.map(i => `${i.name} (${i.quantity})`).join(", ")}
                                        </td>
                                        <td className="whitespace-nowrap text-sm font-extrabold text-slate-800">
                                            ৳{order.totalAmount?.toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize border
                                            ${(order.status === 'delivered' || order.status === 'completed') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                order.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    order.status === 'hold' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                        'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                {order.status || 'pending'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            {order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'rejected' && (
                                                <>
                                                    <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'delivered')} className="bg-green-600 hover:bg-green-700">
                                                        Deliver
                                                    </Button>
                                                    {order.status !== 'hold' && (
                                                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => handleStatusUpdate(order.id, 'hold')}>
                                                            Hold
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="danger" onClick={() => handleStatusUpdate(order.id, 'rejected')}>
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            {order.status === 'hold' && (
                                                <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'pending')} variant="outline">
                                                    Unhold
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
