import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { DollarSign } from "lucide-react";
import { collection, onSnapshot, query, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import type { UserDoc } from "../../types";

export default function ManagerUsers() {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<UserDoc[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [transactionType, setTransactionType] = useState("add");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc));
            setUsers(usersData);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        if (!selectedUser || !amount || !reason) return;

        setLoading(true);
        try {
            const finalAmount = transactionType === 'deduct' ? -Number(amount) : Number(amount);

            const { generateRequestNumber } = await import('../../utils/idGenerator');
            const requestNumber = await generateRequestNumber();

            await addDoc(collection(db, "balanceRequests"), {
                userId: selectedUser.id,
                userName: selectedUser.name,
                userEmail: selectedUser.email,
                userNumericId: selectedUser.userId ?? null,
                requestedBy: currentUser.uid,
                requestedByName: currentUser.name,
                amount: finalAmount,
                type: transactionType,
                reason: reason,
                requestNumber,
                status: "pending",
                createdAt: serverTimestamp()
            });

            alert("Balance request submitted successfully!");
            setSelectedUser(null);
            setAmount("");
            setReason("");
            setTransactionType("add");
        } catch (error) {
            console.error("Error submitting request:", error);
            alert("Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800">View Users</h2>
                <div className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Real-time sync enabled
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance</th>
                            <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    No users found.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-800">{user.name || "N/A"}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-500">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-bold rounded-full capitalize border ${
                                            user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                            user.role === 'manager' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-extrabold text-slate-800">৳{user.balance || 0}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center"
                                            onClick={() => setSelectedUser(user)}
                                        >
                                            <DollarSign size={15} className="mr-1 inline" />
                                            Request Balance Change
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={!!selectedUser}
                onClose={() => {
                    setSelectedUser(null);
                    setAmount("");
                    setReason("");
                    setTransactionType("add");
                }}
                title={`Request Balance Change: ${selectedUser?.name}`}
            >
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200/50 p-3.5 rounded-xl text-sm text-amber-700">
                        ⚠️ This request will be sent to admin for approval
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-650">Action</label>
                        <div className="flex space-x-2">
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

                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-650">Amount (৳)</label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            min="1"
                            placeholder="Enter amount"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-650">Reason (Required)</label>
                        <textarea
                            className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl placeholder-slate-400 text-sm focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            placeholder="Explain why this balance change is needed..."
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-200/50">
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
                        className="w-full mt-2"
                        variant={transactionType === 'deduct' ? 'danger' : 'primary'}
                        disabled={loading}
                    >
                        {loading ? "Submitting..." : "Submit Request for Approval"}
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
