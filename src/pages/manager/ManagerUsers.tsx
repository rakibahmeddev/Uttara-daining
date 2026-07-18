import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { DollarSign, Search } from "lucide-react";
import { collection, onSnapshot, query, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Avatar } from "../../components/admin/UserDisplay";
import { sortUsersByNumericId } from "../../utils/userMapping";
import { updateUserBalance } from "../../services/db";
import type { UserDoc } from "../../types";

export default function ManagerUsers() {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<UserDoc[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [transactionType, setTransactionType] = useState("add");
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc));
            setUsers(sortUsersByNumericId(usersData));
        });
        return () => unsubscribe();
    }, []);

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        if (!selectedUser || !amount) return;

        const numAmount = Number(amount);
        if (numAmount < 40) {
            alert("Minimum amount is ৳40.");
            return;
        }
        if (numAmount > 3000) {
            alert("Maximum amount is ৳3,000.");
            return;
        }

        setLoading(true);
        try {
            const finalAmount = transactionType === 'deduct' ? -Number(amount) : Number(amount);
            const description = transactionType === 'deduct' 
                ? `Manager deducted balance${reason ? ': ' + reason : ''}` 
                : `Manager added balance${reason ? ': ' + reason : ''}`;

            // Update user balance directly
            await updateUserBalance(selectedUser.id, finalAmount, description);

            // Also write to balanceRequests so it appears in Wallet history
            const { generateRequestNumber } = await import('../../utils/idGenerator');
            const requestNumber = await generateRequestNumber();
            await addDoc(collection(db, "balanceRequests"), {
                userId: selectedUser.id,
                userName: selectedUser.name,
                userEmail: selectedUser.email,
                userNumericId: selectedUser.userId ?? null,
                requestedBy: currentUser.uid,
                requestedByName: currentUser.name,
                amount: Math.abs(Number(amount)),
                type: transactionType === 'deduct' ? 'withdraw' : 'topup',
                reason: reason || (transactionType === 'deduct' ? 'Manager deduction' : 'Manager top-up'),
                requestNumber,
                status: "approved",
                approvedBy: currentUser.uid,
                approvedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            });

            alert("Balance updated successfully!");
            setSelectedUser(null);
            setAmount("");
            setReason("");
            setTransactionType("add");
        } catch (error) {
            console.error("Error updating balance:", error);
            alert("Failed to update balance");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col gap-4">
                <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>Manage Users</h2>
                    <p className="text-xs text-slate-500 mt-1">View, edit, search, and manage funds for Uttara Dining users</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                            type="text"
                            placeholder="Search by ID, name, email, room, hall..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ marginTop: "10px" }}>
                <div className="overflow-x-auto">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Room No.</th>
                                <th>Role</th>
                                <th>Balance</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.filter(user => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return (
                                    user.name?.toLowerCase().includes(query) ||
                                    user.email?.toLowerCase().includes(query) ||
                                    String(user.userId || '').includes(query)
                                );
                            }).length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-slate-400 text-sm py-8">
                                        {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                users.filter(user => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                        user.name?.toLowerCase().includes(query) ||
                                        user.email?.toLowerCase().includes(query) ||
                                        String(user.userId || '').includes(query)
                                    );
                                }).map((user) => (
                                    <tr key={user.id}>
                                        <td className="whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-slate-700">
                                                {user.userId ?? "—"}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={user.name} email={user.email} />
                                                <span className="text-sm font-semibold text-slate-800">
                                                    {user.name || user.email?.split("@")[0] || "—"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="text-sm text-slate-600">{user.email}</div>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span className="text-sm font-semibold text-slate-700">
                                                {user.roomNumber || <span className="text-slate-300 italic">—</span>}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full capitalize border ${
                                                user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                user.role === 'manager' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-200'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="text-sm font-extrabold text-slate-800">৳{user.balance || 0}</div>
                                        </td>
                                        <td className="whitespace-nowrap text-right text-sm font-semibold space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setSelectedUser(user)}
                                                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                            >
                                                <DollarSign size={16} className="mr-1 inline" />
                                                Manage Funds
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={!!selectedUser}
                onClose={() => {
                    setSelectedUser(null);
                    setAmount("");
                    setReason("");
                    setTransactionType("add");
                }}
                title={`Manage Funds: ${selectedUser?.name}`}
            >
                <form onSubmit={handleSubmitRequest} className="space-y-5" style={{ padding: "10px 5px" }}>
                    <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-sm text-blue-700" style={{ marginBottom: "20px" }}>
                        ℹ️ This will instantly update the user's balance.
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.9)" }}>Action</label>
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={() => setTransactionType("add")}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                                    transactionType === "add"
                                        ? "bg-green-50 text-green-600 border-green-200"
                                        : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                Add Funds
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransactionType("deduct")}
                                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                                    transactionType === "deduct"
                                        ? "bg-red-50 text-red-655 border-red-200"
                                        : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                Deduct Funds
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.9)" }}>Amount (৳)</label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            min="40"
                            max="3000"
                            placeholder="Min ৳40 — Max ৳3,000"
                        />
                        {amount && (Number(amount) < 40 || Number(amount) > 3000) && (
                            <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px' }}>
                                {Number(amount) < 40 ? 'Minimum amount is ৳40.' : 'Maximum amount is ৳3,000.'}
                            </p>
                        )}
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.9)" }}>Reason <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>(Optional)</span></label>
                        <textarea
                            className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this balance change is needed..."
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-200/50" style={{ marginBottom: "24px", marginTop: "10px" }}>
                        <p>Current Balance: <span className="font-extrabold text-slate-800">৳{selectedUser?.balance || 0}</span></p>
                        {amount && (
                            <p className="mt-1.5 pt-1.5 border-t border-slate-200">
                                Requested New Balance: <span className="font-extrabold text-orange-600">
                                    ৳{(selectedUser?.balance || 0) + (transactionType === 'deduct' ? -Number(amount) : Number(amount))}
                                </span>
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        style={{ padding: "14px 0", fontSize: "15px", fontWeight: 700, marginTop: "20px" }}
                        variant={transactionType === 'deduct' ? 'danger' : 'primary'}
                        disabled={loading}
                    >
                        {loading ? "Processing..." : "Confirm Balance Update"}
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
