import { useState, useEffect, useMemo } from "react";
import { getAllOrdersEnriched, updateOrderStatus, getMeals } from "../../services/db";
import { Button } from "../../components/ui/Button";
import { formatDateBD, formatDateShortBD, formatDateOnlyBD } from "../../utils/date";
import { cn } from "../../utils/cn";
import { CustomerCell, RoomNoCell } from "../../components/admin/UserDisplay";
import type { Order } from "../../types";
import { Search, Filter, X, Trash2, RefreshCw, Utensils } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

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
    const [meals, setMeals] = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [slotFilter, setSlotFilter] = useState("all");
    const [mealFilter, setMealFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersData, mealsData] = await Promise.all([
                getAllOrdersEnriched(),
                getMeals()
            ]);
            setOrders(ordersData);
            setMeals(mealsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        
        const isConfirmed = window.confirm(
            `⚠️ Are you sure you want to delete ${selectedIds.length} order(s)?\n\nThis will permanently remove them from the database.`
        );
        
        if (!isConfirmed) return;
        
        setLoading(true);
        try {
            const deletePromises = selectedIds.map(id => deleteDoc(doc(db, "orders", id)));
            await Promise.all(deletePromises);
            alert(`✅ Successfully deleted ${selectedIds.length} order(s).`);
            setSelectedIds([]);
            fetchData();
        } catch (error: any) {
            console.error("Error deleting orders:", error);
            alert("❌ Failed to delete some orders.");
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status. Please try again.");
        }
    };

    const handleDelete = async (orderId: string) => {
        if (!window.confirm("Are you sure you want to delete this order?")) return;
        try {
            await deleteDoc(doc(db, "orders", orderId));
            setOrders(orders.filter(order => order.id !== orderId));
        } catch (error) {
            console.error("Error deleting order:", error);
            alert("Failed to delete order. Please try again.");
        }
    };

    const toggleSelection = (orderId: string) => {
        setSelectedIds(prev => 
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    const toggleAllSelection = () => {
        if (selectedIds.length === filteredOrders.length && filteredOrders.length > 0) {
            setSelectedIds([]); // Deselect all
        } else {
            setSelectedIds(filteredOrders.map(o => o.id)); // Select all filtered
        }
    };

    const handleStatusUpdate = async (orderId: string, status: string) => {
        if (confirm(`Mark order as ${status}?`)) {
            await updateOrderStatus(orderId, status);
            fetchData();
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

            // Meal filter
            if (mealFilter !== 'all') {
                const hasMeal = order.items && Array.isArray(order.items) && order.items.some(item => item.name === mealFilter);
                if (!hasMeal) return false;
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
    }, [orders, filter, searchQuery, slotFilter, mealFilter]);

    const pendingCount = orders.reduce((total, o) => {
        if (o.status === 'pending' || !o.status) {
            return total + (o.items && Array.isArray(o.items) ? o.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) : 1);
        }
        return total;
    }, 0);

    const deliveredCount = orders.reduce((total, o) => {
        if (o.status === 'delivered' || o.status === 'completed') {
            return total + (o.items && Array.isArray(o.items) ? o.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) : 1);
        }
        return total;
    }, 0);

    const allCount = orders.reduce((total, o) => {
        return total + (o.items && Array.isArray(o.items) ? o.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) : 1);
    }, 0);

    const slotCounts = useMemo(() => {
        const counts = { Breakfast: 0, Lunch: 0, Dinner: 0 };
        orders.forEach(order => {
            const status = order.status || 'pending';
            const matchesFilter = filter === 'all' 
                ? true 
                : filter === 'delivered' 
                    ? (status === 'delivered' || status === 'completed')
                    : status === filter;

            if (matchesFilter) {
                const s = getSlot(order);
                // Calculate total quantity for this order
                let qty = 1;
                if (order.items && Array.isArray(order.items)) {
                    qty = order.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
                }

                if (s === 'Breakfast') counts.Breakfast += qty;
                if (s === 'Lunch') counts.Lunch += qty;
                if (s === 'Dinner') counts.Dinner += qty;
            }
        });
        return counts;
    }, [orders, filter]);

    const availableMeals = useMemo(() => {
        return [...meals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [meals]);

    const mealCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        availableMeals.forEach(m => { counts[m.id] = 0; });

        orders.forEach(order => {
            const status = order.status || 'pending';
            const matchesFilter = filter === 'all' 
                ? true 
                : filter === 'delivered' 
                    ? (status === 'delivered' || status === 'completed')
                    : status === filter;

            if (matchesFilter && order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    availableMeals.forEach(m => {
                        if (item.name === m.name && item.date === m.date) {
                            counts[m.id] += (Number(item.quantity) || 1);
                        }
                    });
                });
            }
        });
        return counts;
    }, [orders, filter, availableMeals]);

    const tabs = [
        { id: "pending", label: "Pending", count: pendingCount },
        { id: "delivered", label: "Delivered", count: deliveredCount },
        { id: "all", label: "All Orders", count: allCount },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px] text-sm text-slate-400">
                Loading orders…
            </div>
        );
    }

    const hasFilters = searchQuery || slotFilter !== "all" || mealFilter !== "all";

    return (
        <div className="animate-fade-in-up manage-Orders-admin">
            <div className="flex justify-between items-center mb-6">
                <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>Manage Orders</h2>
                <div>
                    {selectedIds.length > 0 ? (
                        <Button 
                            onClick={handleBulkDelete} 
                            disabled={loading}
                            className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg" 
                            size="sm" 
                            style={{ padding: "6px 12px" }}
                        >
                            {loading ? "Deleting..." : (
                                <>
                                    <Trash2 size={16} className="mr-2 inline" />
                                    Delete {selectedIds.length} Selected
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button onClick={fetchData} variant="outline" size="sm" style={{ padding: "4px 8px" }}>
                            <RefreshCw size={14} className="mr-1.5 inline" />
                            Refresh
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4 mb-6">
                {/* 1. Search Bar */}
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

                {/* 2. Tabs */}
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
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                background: filter === tab.id
                                    ? "linear-gradient(to right, #f97316, #f59e0b)"
                                    : "transparent",
                                color: filter === tab.id ? "#ffffff" : "#64748b",
                                boxShadow: filter === tab.id ? "0 4px 12px rgba(249,115,22,0.3)" : "none",
                            }}
                        >
                            {tab.label}
                            <span style={{ 
                                backgroundColor: filter === tab.id ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)", 
                                padding: "1px 6px", 
                                borderRadius: "10px", 
                                fontSize: "11px",
                                fontWeight: 800
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* 3. Filters & Clear */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    <div className="relative w-full sm:w-auto min-w-[160px]">
                        <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={slotFilter}
                            onChange={(e) => { setSlotFilter(e.target.value); setMealFilter("all"); }}
                            className="appearance-none bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer text-slate-700 font-medium"
                            style={{ padding: "12px 36px 12px 42px", width: "100%" }}
                        >
                            <option value="all">All Slots</option>
                            <option value="Breakfast">Breakfast ({slotCounts.Breakfast})</option>
                            <option value="Lunch">Lunch ({slotCounts.Lunch})</option>
                            <option value="Dinner">Dinner ({slotCounts.Dinner})</option>
                        </select>
                    </div>

                    <div className="relative w-full sm:w-auto min-w-[180px] flex-1">
                        <Utensils size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={mealFilter}
                            onChange={(e) => { setMealFilter(e.target.value); setSlotFilter("all"); }}
                            className="appearance-none bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer text-slate-700 font-medium"
                            style={{ padding: "12px 36px 12px 42px", width: "100%", textOverflow: "ellipsis" }}
                        >
                            <option value="all">Available Meals</option>
                            {availableMeals.map(m => (
                                <option key={m.id} value={m.name}>
                                    {m.name}, {formatDateOnlyBD(m.date)} (Order={mealCounts[m.id] || 0})
                                </option>
                            ))}
                        </select>
                    </div>

                    {hasFilters && (
                        <button
                            onClick={() => { setSearchQuery(""); setSlotFilter("all"); setMealFilter("all"); }}
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
                                <th style={{ width: "40px", textAlign: "center" }}>
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                        checked={selectedIds.length > 0 && selectedIds.length === filteredOrders.length}
                                        onChange={toggleAllSelection}
                                        disabled={filteredOrders.length === 0}
                                    />
                                </th>
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
                                    <tr 
                                        key={order.id} 
                                        className={`transition-colors ${selectedIds.includes(order.id) ? 'bg-orange-50/80' : 'hover:bg-slate-50'}`}
                                    >
                                        <td className="text-center">
                                            <input 
                                                type="checkbox"
                                                className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                                checked={selectedIds.includes(order.id)}
                                                onChange={() => toggleSelection(order.id)}
                                            />
                                        </td>
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
