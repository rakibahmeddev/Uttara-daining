import { useState, useEffect } from "react";
import { getAllOrdersEnriched, updateOrderStatus } from "../../services/db";
import { CustomerCell, RoomNoCell } from "../../components/admin/UserDisplay";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Button } from "../../components/ui/Button";
import { Download, FileText, List } from "lucide-react";
import { format } from "date-fns";
import { formatDateBD } from "../../utils/date";
import { cn } from "../../utils/cn";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function Reports() {
    const [orders, setOrders] = useState([]);
    const [dailyReports, setDailyReports] = useState([]);
    const [activeTab, setActiveTab] = useState("daily");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchOrders(), fetchDailyReports()]);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        const data = await getAllOrdersEnriched();
        setOrders(data);
    };

    const fetchDailyReports = async () => {
        try {
            const q = query(collection(db, "reports"), orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            setDailyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching daily reports:", error);
        }
    };

    const handleStatusUpdate = async (orderId, status) => {
        if (confirm(`Are you sure you want to mark this order as ${status}?`)) {
            await updateOrderStatus(orderId, status);
            fetchOrders();
        }
    };

    const exportCSV = () => {
        const headers = ["Order ID", "Date", "User Email", "Items", "Total Amount", "Status"];
        const rows = orders.map(order => [
            order.id,
            order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A',
            order.userEmail || 'N/A',
            order.items.map(i => `${i.name} x${i.quantity}`).join("; "),
            order.totalAmount,
            order.status || 'pending'
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `orders_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Prepare chart data from daily reports
    const chartData = dailyReports.slice(0, 7).reverse().map(report => ({
        date: report.date?.toDate ? format(report.date.toDate(), 'MMM d') : 'N/A',
        sales: report.totalSales
    }));

    if (loading) return <div className="p-8 text-center">Loading reports...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Reports & Analytics</h2>
                <Button onClick={exportCSV} variant="outline" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                    <Download size={20} className="mr-2 inline" />
                    Export CSV
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-xl bg-slate-50 border border-slate-100 p-1 w-fit">
                <button
                    onClick={() => setActiveTab("daily")}
                    className={cn(
                        "flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                        activeTab === "daily"
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    )}
                >
                    <FileText size={16} className="mr-2" />
                    Daily Summaries
                </button>
                <button
                    onClick={() => setActiveTab("orders")}
                    className={cn(
                        "flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                        activeTab === "orders"
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    )}
                >
                    <List size={16} className="mr-2" />
                    All Orders
                </button>
            </div>

            {/* Content */}
            {activeTab === "daily" ? (
                <div className="space-y-8">
                    {/* Sales Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-black mb-6 text-slate-800">Sales Trend (Last 7 Days)</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.1)' }} formatter={(value) => [`৳${value}`, 'Sales']} />
                                    <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} barSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Daily Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {dailyReports.map((report) => (
                            <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold mb-2 text-slate-800">
                                    {report.date?.toDate ? format(report.date.toDate(), 'MMM d, yyyy') : 'N/A'}
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm">Total Orders</span>
                                        <span className="font-bold text-slate-800">{report.totalOrders}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-sm">Total Sales</span>
                                        <span className="font-bold text-emerald-600">৳{report.totalSales}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Room No.</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {formatDateBD(order.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <CustomerCell
                                            name={order.userName}
                                            email={order.userEmail}
                                            userNumericId={order.userNumericId}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <RoomNoCell roomNumber={order.roomNumber} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">
                                        {order.items.map(i => `${i.name} (${i.quantity})`).join(", ")}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize border
                                            ${order.status === 'completed' || order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                order.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    order.status === 'hold' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                        'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                            {order.status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-extrabold text-slate-800">
                                        ৳{order.totalAmount}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {(!order.status || order.status === 'pending') && (
                                            <>
                                                <Button size="sm" onClick={() => handleStatusUpdate(order.id, 'delivered')} className="bg-green-600 hover:bg-green-700">
                                                    Approve
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => handleStatusUpdate(order.id, 'rejected')}>
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
