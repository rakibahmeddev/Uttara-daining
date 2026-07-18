import { useState, useEffect } from "react";
import { collection, onSnapshot, query, writeBatch, doc, getDocs, where, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import type { UserDoc } from "../../types";
import { Search, Filter, Calendar, X } from "lucide-react";

export default function AssignDelivery() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoom, setSelectedRoom] = useState("all");
    const [filterDateMode, setFilterDateMode] = useState<"all" | "today" | "custom">("all");
    const [customDate, setCustomDate] = useState("");
    const [users, setUsers] = useState<UserDoc[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserDoc[]>([]);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    
    // Assign Modal state
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
    const [assignTargetDate, setAssignTargetDate] = useState("");

    // Get local date in YYYY-MM-DD
    const getLocalTodayString = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 10);
        return localISOTime;
    };
    
    const todayDateStr = getLocalTodayString();
    
    // Extract unique rooms for the filter
    const uniqueRooms = Array.from(new Set(users.map(u => u.roomNumber).filter(Boolean))).sort();

    useEffect(() => {
        // Fetch users real-time
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc));
            setUsers(usersData);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const q = searchQuery.toLowerCase();
        const filtered = users.filter((u) => {
            const matchesSearch = 
                u.name?.toLowerCase().includes(q) || 
                u.idNumber?.toLowerCase().includes(q) || 
                String(u.userId || "").includes(q) ||
                u.roomNumber?.toLowerCase().includes(q);
            
            const matchesRoom = selectedRoom === "all" || u.roomNumber === selectedRoom;
            
            let matchesDate = true;
            if (filterDateMode === "today") {
                matchesDate = u.assignedDeliveryDate === todayDateStr;
            } else if (filterDateMode === "custom" && customDate) {
                matchesDate = u.assignedDeliveryDate === customDate;
            }
            
            return matchesSearch && matchesRoom && matchesDate;
        });
        
        const sortedFiltered = filtered.sort((a, b) => {
            const aAssigned = !!a.assignedDeliveryDate;
            const bAssigned = !!b.assignedDeliveryDate;
            
            // 1. Assigned users come first
            if (aAssigned && !bAssigned) return -1;
            if (!aAssigned && bAssigned) return 1;
            
            // 2. Sort by User ID numerically ascending
            const aId = Number(a.userId) || Number.MAX_SAFE_INTEGER;
            const bId = Number(b.userId) || Number.MAX_SAFE_INTEGER;
            return aId - bId;
        });
        
        setFilteredUsers(sortedFiltered);
    }, [searchQuery, selectedRoom, users, filterDateMode, customDate, todayDateStr]);

    const handleAssignClick = (userId: string) => {
        setAssigningUserId(userId);
        setAssignTargetDate(todayDateStr);
        setAssignModalOpen(true);
    };

    const handleConfirmAssign = async () => {
        if (!assigningUserId || !assignTargetDate) return;
        
        setAssignModalOpen(false);
        setLoadingId(assigningUserId);
        try {
            const batch = writeBatch(db);
            
            // 1. Find all users currently assigned for the target date and clear them
            const currentlyAssignedQuery = query(collection(db, "users"), where("assignedDeliveryDate", "==", assignTargetDate));
            const currentlyAssignedDocs = await getDocs(currentlyAssignedQuery);
            
            currentlyAssignedDocs.forEach((d) => {
                batch.update(d.ref, { assignedDeliveryDate: null });
            });
            
            // 2. Assign the new user
            const userRef = doc(db, "users", assigningUserId);
            batch.update(userRef, { assignedDeliveryDate: assignTargetDate });
            
            await batch.commit();
        } catch (error) {
            console.error("Error assigning delivery duty:", error);
            alert("Failed to assign delivery duty.");
        } finally {
            setLoadingId(null);
            setAssigningUserId(null);
        }
    };

    const handleCancelAssign = async (userId: string) => {
        if (!window.confirm("Are you sure you want to cancel this delivery assignment?")) return;
        
        setLoadingId(userId);
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { assignedDeliveryDate: null });
        } catch (error) {
            console.error("Error cancelling assignment:", error);
            alert("Failed to cancel assignment.");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>Delivery Assignment</h2>
                        <p className="text-xs text-slate-500 mt-1">Assign a student to be the delivery rider.</p>
                    </div>
                </div>
                
                <div className="flex flex-col gap-3 mt-4 mb-2">
                    <div className="relative w-full">
                        <Search className="absolute left-4 text-slate-400" size={18} style={{ top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" 
                            placeholder="Search by Name, ID, or Room..." 
                            className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
                            style={{ padding: "12px 20px 12px 44px" }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 sm:flex-none">
                            <Filter className="absolute left-4 text-slate-400" size={18} style={{ top: '50%', transform: 'translateY(-50%)' }} />
                            <select
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(e.target.value)}
                                className="appearance-none h-full w-full rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm cursor-pointer"
                                style={{ padding: "12px 36px 12px 44px", minWidth: "140px" }}
                            >
                                <option value="all">All Rooms</option>
                                {uniqueRooms.map(room => (
                                    <option key={room} value={room}>Room {room}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 pointer-events-none text-slate-400" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div className="relative flex flex-1 sm:flex-none gap-2">
                            <div className="relative flex-1 sm:flex-none">
                                <Calendar className="absolute left-4 text-slate-400" size={18} style={{ top: '50%', transform: 'translateY(-50%)' }} />
                                <select
                                    value={filterDateMode}
                                    onChange={(e) => setFilterDateMode(e.target.value as "all"|"today"|"custom")}
                                    className="appearance-none h-full w-full rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm cursor-pointer"
                                    style={{ padding: "12px 36px 12px 44px", minWidth: "150px" }}
                                >
                                    <option value="all">All Assignees</option>
                                    <option value="today">Today's Riders</option>
                                    <option value="custom">Custom Date</option>
                                </select>
                                <div className="absolute right-4 pointer-events-none text-slate-400" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>

                            {filterDateMode === "custom" && (
                                <input
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
                                    style={{ padding: "10px 16px" }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ marginTop: "10px" }}>
                <div className="overflow-x-auto">
                    <table className="admin-table w-full text-left">
                        <thead>
                            <tr>
                                <th className="w-20 pl-6 pr-2 py-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">User ID</th>
                                <th className="px-2 py-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">Room No.</th>
                                <th className="px-6 py-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                                        {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const isAssigned = !!user.assignedDeliveryDate;
                                    return (
                                        <tr 
                                            key={user.id} 
                                            className={`transition-colors hover:bg-slate-50/50 ${isAssigned ? 'bg-orange-50/30' : ''}`}
                                        >
                                            <td className="pl-6 pr-2 py-4 whitespace-nowrap">
                                                <span className="text-sm font-semibold text-slate-700">
                                                    {user.userId || user.idNumber || "—"}
                                                </span>
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap">
                                                <span className="text-sm font-bold text-slate-900">{user.name || "Unknown"}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600">{user.roomNumber || "—"}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isAssigned ? (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700">
                                                            Assigned
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-500">
                                                            {user.assignedDeliveryDate}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                        Not Assigned
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {isAssigned ? (
                                                    <button 
                                                        onClick={() => handleCancelAssign(user.id)}
                                                        disabled={loadingId === user.id}
                                                        className="inline-flex items-center justify-center font-bold rounded-lg text-sm transition-all active:scale-95 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 shadow-sm border border-slate-200 hover:border-red-200"
                                                        style={{ padding: "6px 16px" }}
                                                    >
                                                        {loadingId === user.id ? "Cancelling..." : (
                                                            <>
                                                                <X size={16} className="mr-1.5" />
                                                                Cancel
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleAssignClick(user.id)}
                                                        disabled={loadingId === user.id}
                                                        className="inline-flex items-center justify-center font-bold rounded-lg text-sm transition-all active:scale-95 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                                                        style={{ padding: "6px 16px" }}
                                                    >
                                                        {loadingId === user.id ? "Assigning..." : "Assign"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assignment Date Modal */}
            {assignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up">
                        <div style={{ padding: "32px 30px" }}>
                            <h3 style={{ fontSize: "24px", fontWeight: "900", marginBottom: "8px", color: "#0f172a" }}>Select Date</h3>
                            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px" }}>Choose the date for this assignment.</p>
                            
                            <div style={{ marginBottom: "32px" }}>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "700", color: "#334155", marginBottom: "12px" }}>
                                    Assignment Date
                                </label>
                                <div className="relative">
                                    <input 
                                        type="date"
                                        value={assignTargetDate}
                                        onChange={(e) => setAssignTargetDate(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-900 font-bold bg-slate-50"
                                        style={{ padding: "16px 20px", fontSize: "16px" }}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex" style={{ gap: "16px" }}>
                                <button 
                                    onClick={() => setAssignModalOpen(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                                    style={{ padding: "16px 0", fontSize: "16px" }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleConfirmAssign}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors shadow-md"
                                    style={{ padding: "16px 0", fontSize: "16px" }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
