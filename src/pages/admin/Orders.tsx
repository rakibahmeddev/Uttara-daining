import { useState, useEffect, useMemo } from "react";
import { getAllOrdersEnriched, updateOrderStatus } from "../../services/db";
import { Button } from "../../components/ui/Button";
import { formatDateBD, formatDateShortBD } from "../../utils/date";
import { cn } from "../../utils/cn";
import { CustomerCell, RoomNoCell } from "../../components/admin/UserDisplay";
import type { Order } from "../../types";
import { Search, Filter, X } from "lucide-react";

const getSlot = (order: Order): string => {
    const raw = (order as any).slot || (order as any).timeSlot || (order.items?.[0] as any)?.timeSlot || order.items?.[0]?.name || "";
    if (!raw) return "";
    const lower = raw.toLowerCase();
    if (lower.includes("break") || lower.includes("সকাল")) return "Breakfast";
    if (lower.includes("lunch") || lower.includes("দুপুর")) return "Lunch";
    if (lower.includes("dinner") || lower.includes("রাত") || lower.includes("সন্ধ্যা")) return "Dinner";
    return raw;
};

export default function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [slotFilter, setSlotFilter] = useState("all");
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


    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Status filter
            if (filter !== 'all') {
                const status = order.status || 'pending';
                if (filter === 'delivered' && status !== 'delivered' && status !== 'completed') return false;
                if (filter !== 'delivered' && status !== filter) return false;
            }

            // Slot filter
            if (slotFilter !== 'all') {
                const s = getSlot(order) || "—";
                if (s !== slotFilter) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const nameMatch = order.userName?.toLowerCase().includes(q) || false;
                const emailMatch = order.userEmail?.toLowerCase().includes(q) || false;
                const uidMatch = String(order.userNumericId || "").includes(q);
                const roomMatch = order.roomNumber?.toLowerCase().includes(q) || false;
                const hallMatch = (order as any).hallName?.toLowerCase().includes(q) || false;
                
                if (!nameMatch && !emailMatch && !uidMatch && !roomMatch && !hallMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [orders, filter, searchQuery, slotFilter]);

    const tabs = [
        { id: "pending", label: "Pending" },
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

    const hasFilters = searchQuery || slotFilter !== "all";

    return (
        <div className="animate-fade-in-up manage-Orders-admin">
            <div className="flex justify-between items-center mb-6">
                <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>Manage Orders</h2>
                <Button onClick={fetchOrders} variant="outline" size="sm" style={{ padding: "2px 4px" }}>Refresh</Button>
            </div>

            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 border border-slate-100 p-1 w-full max-w-full">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            style={{
                                padding: "6px 10px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                border: "none",
                                transition: "all 0.2s",
                                flex: "1 1 auto",
                                textAlign: "center",
                                background: filter === tab.id
                                    ? "linear-gradient(to right, #f97316, #f59e0b)"
                                    : "transparent",
                                color: filter === tab.id ? "#ffffff" : "#64748b",
                                boxShadow: filter === tab.id ? "0 4px 12px rgba(249,115,22,0.3)" : "none",
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    <div className="relative w-full">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, ID, room..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            style={{ padding: "12px 16px 12px 42px", width: "100%" }}
                        />
                    </div>
                    
                    <div className="relative w-full sm:w-auto min-w-[160px]">
                        <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={slotFilter}
                            onChange={(e) => setSlotFilter(e.target.value)}
                            className="appearance-none bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer text-slate-700 font-medium"
                            style={{ padding: "12px 36px 12px 42px", width: "100%" }}
                        >
                            <option value="all">All Slots</option>
                            <option value="Breakfast">Breakfast</option>
                            <option value="Lunch">Lunch</option>
                            <option value="Dinner">Dinner</option>
                        </select>
                    </div>

                    {hasFilters && (
                        <button
                            onClick={() => { setSearchQuery(""); setSlotFilter("all"); }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Clear filters"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ marginTop: "10px" }}>
                <div className="overflow-x-auto">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Slot</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center text-slate-500 text-sm py-8">
                                        No orders found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order, index) => {
                                    const slot = getSlot(order);
                                    return (
                                    <tr key={order.id}>
                                        <td className="whitespace-nowrap text-sm font-bold text-slate-800">
                                            #{index + 1}
                                        </td>
                                        <td className="whitespace-nowrap text-sm text-slate-500">
                                            {order.createdAt ? formatDateShortBD(order.createdAt) : "—"}
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <CustomerCell
                                                name={order.userName}
                                                email={order.userEmail}
                                                userNumericId={order.userNumericId}
                                                roomNumber={order.roomNumber}
                                            />
                                        </td>
                                        <td className="whitespace-nowrap">
                                            {slot ? (
                                                <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md px-2 py-0.5 text-[11px] font-bold">
                                                    {slot}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="text-sm text-slate-600 max-w-xs">
                                            <div className="flex flex-col gap-1.5">
                                                {order.items.map((i, idx) => {
                                                    const rawDate = i.date || order.date;
                                                    let dateStr = "";
                                                    if (rawDate) {
                                                        const d = new Date(rawDate);
                                                        if (!isNaN(d.getTime())) {
                                                            dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                                        }
                                                    }
                                                    return (
                                                        <div key={idx} className="flex flex-col">
                                                            <span className="font-bold text-slate-700 text-[13px] leading-tight">{i.name} ({i.quantity})</span>
                                                            {dateStr && <span className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">{dateStr}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
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
                                        <td className="whitespace-nowrap text-right text-sm font-medium">
                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "2px" }}>
                                            {order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'rejected' && (
                                                <>
                                                    <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'delivered')} className="bg-green-600 hover:bg-green-700" style={{ padding: "2px 5px", fontSize: "11px", margin: "2px" }}>
                                                        Deliver
                                                    </Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleStatusUpdate(order.id, 'rejected')} style={{ padding: "2px 5px", fontSize: "11px", margin: "2px" }}>
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            </div>
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
