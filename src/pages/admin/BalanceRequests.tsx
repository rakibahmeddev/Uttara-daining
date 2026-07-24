import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../services/firebase";
import { approveBalanceRequest, getUsers } from "../../services/db";
import { Button } from "../../components/ui/Button";
import { formatDateBD } from "../../utils/date";
import { useAuth } from "../../context/AuthContext";
import { enrichBalanceRequestsWithUserData } from "../../utils/userMapping";
import { CustomerCell } from "../../components/admin/UserDisplay";
import { DashboardPage, DashboardTableCard } from "../../components/layout/DashboardLayout";
import TableSearchBar, { filterBySearch } from "../../components/ui/TableSearchBar";
import type { BalanceRequest, UserDoc } from "../../types";
import { cn } from "../../utils/cn";

export default function BalanceRequests() {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState<BalanceRequest[]>([]);
    const [users, setUsers] = useState<UserDoc[]>([]);
    const [filter, setFilter] = useState("topup");
    const [searchQuery, setSearchQuery] = useState("");
    const [processing, setProcessing] = useState(false);
    const [manageModalOpen, setManageModalOpen] = useState(false);

    useEffect(() => {
        getUsers().then(setUsers).catch(console.error);
    }, []);

    useEffect(() => {
        const q =
            filter === "all"
                ? query(collection(db, "balanceRequests"))
                : filter === "topup"
                ? query(collection(db, "balanceRequests"), where("type", "in", ["topup", "add"]))
                : filter === "withdraw"
                ? query(collection(db, "balanceRequests"), where("type", "in", ["withdraw", "deduct"]))
                : query(collection(db, "balanceRequests"), where("status", "==", filter));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requestsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as BalanceRequest));
            setRequests(
                requestsData.sort((a, b) => {
                    const aTime = a.createdAt as { toMillis?: () => number };
                    const bTime = b.createdAt as { toMillis?: () => number };
                    return (bTime?.toMillis?.() || 0) - (aTime?.toMillis?.() || 0);
                })
            );
        });

        return () => unsubscribe();
    }, [filter]);

    const enrichedRequests = useMemo(
        () => enrichBalanceRequestsWithUserData(requests, users),
        [requests, users]
    );

    const filteredRequests = useMemo(
        () =>
            filterBySearch(enrichedRequests, searchQuery, (r) =>
                [
                    r.userName,
                    r.userEmail,
                    r.reason,
                    r.bkashNumber,
                    r.txnId,
                    r.type,
                    r.status,
                    String(r.requestNumber),
                    String(r.amount),
                ]
                    .filter(Boolean)
                    .join(" ")
            ),
        [enrichedRequests, searchQuery]
    );

    const handleApprove = async (request: BalanceRequest) => {
        const label =
            request.type === "withdraw"
                ? `approve withdrawal of ৳${Math.abs(request.amount)} for ${request.userName}?`
                : request.type === "topup"
                  ? `approve top-up of ৳${Math.abs(request.amount)} (TxnID: ${request.txnId}) for ${request.userName}?`
                  : `approve ${request.type} of ৳${Math.abs(request.amount)} for ${request.userName}?`;

        if (!confirm(label)) return;

        setProcessing(true);
        try {
            await approveBalanceRequest(request, currentUser!.uid);
            alert("Request approved and balance updated!");
        } catch (error: unknown) {
            console.error("Error approving request:", error);
            alert(error instanceof Error ? error.message : "Failed to approve request");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (request: BalanceRequest) => {
        const reason = prompt("Enter reason for rejection:");
        if (!reason) return;

        setProcessing(true);
        try {
            await updateDoc(doc(db, "balanceRequests", request.id), {
                status: "rejected",
                rejectionReason: reason,
                processedAt: serverTimestamp(),
                processedBy: currentUser!.uid,
            });
            alert("Request rejected.");
        } catch (error) {
            console.error("Error rejecting request:", error);
            alert("Failed to reject request");
        } finally {
            setProcessing(false);
        }
    };

    const handleTestAddBalance = async () => {
        const amount = prompt("Enter amount to add to EVERY user (Testing Only):");
        if (!amount || isNaN(Number(amount))) return;
        if (!confirm(`Are you sure you want to add ৳${amount} to EVERY user? This is a temporary testing feature.`)) return;
        setProcessing(true);
        try {
            const batch = writeBatch(db);
            let count = 0;
            users.forEach(u => {
                if (!u.id) return;
                const userRef = doc(db, "users", u.id);
                batch.update(userRef, { balance: (u.balance || 0) + Number(amount) });
                count++;
            });
            await batch.commit();
            alert(`Successfully added ৳${amount} to ${count} users!`);
        } catch (error) {
            console.error(error);
            alert("Failed to add balance to all users.");
        } finally {
            setProcessing(false);
        }
    };

    const filters = ["topup", "withdraw"] as const;

    return (
        <DashboardPage 
            title="Balance" 
            subtitle="Review student top-ups, withdrawals, and balance changes"
            action={
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                        onClick={handleTestAddBalance} 
                        disabled={processing}
                        className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 border-0"
                        style={{ padding: "8px 16px", borderRadius: "12px", fontSize: "13px", fontWeight: 700 }}
                    >
                        {processing ? "Adding..." : "All Balance (Test)"}
                    </Button>
                    <Button 
                        onClick={() => setManageModalOpen(true)} 
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 border-0"
                        style={{ padding: "8px 16px", borderRadius: "12px", fontSize: "13px", fontWeight: 700 }}
                    >
                        Manage Balance
                    </Button>
                </div>
            }
        >
            <div className="flex flex-wrap gap-2" style={{ marginTop: "5px", marginBottom: "10px" }}>
                {filters.map((status) => (
                    <Button
                        key={status}
                        onClick={() => setFilter(status)}
                        variant={filter === status ? "primary" : "outline"}
                        className={cn(
                            filter === status
                                ? "border-transparent"
                                : "border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
                        )}
                        style={{ padding: "3px 8px", fontSize: "12px", height: "auto" }}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                ))}
            </div>

            <div style={{ marginBottom: "16px" }}>
                <TableSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by name, email, TxnID, type…"
                    resultCount={filteredRequests.length}
                    totalCount={enrichedRequests.length}
                />
            </div>

            <DashboardTableCard>
                <table className="admin-table admin-table-dark">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>User</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Details</th>
                            <th>Status</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                                    {searchQuery ? "No matching requests" : "No requests found"}
                                </td>
                            </tr>
                        ) : (
                            filteredRequests.map((request) => (
                                <tr key={request.id}>
                                    <td className="whitespace-nowrap text-sm text-slate-400">
                                        {request.createdAt ? formatDateBD(request.createdAt) : "—"}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <CustomerCell
                                            name={request.userName}
                                            email={request.userEmail}
                                            userNumericId={request.userNumericId}
                                            roomNumber={(request as any).roomNumber}
                                        />
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <TypeBadge type={request.type} />
                                    </td>
                                    <td className="whitespace-nowrap text-sm font-extrabold text-slate-900">
                                        ৳{Math.abs(request.amount).toLocaleString()}
                                    </td>
                                    <td className="max-w-xs text-sm text-slate-400">
                                        {request.type === "topup" && (
                                            <span className="font-mono text-xs text-emerald-400">
                                                {request.paymentMethod} · {request.txnId}
                                            </span>
                                        )}
                                        {request.type === "withdraw" && (
                                            <span className="font-mono text-xs">{request.bkashNumber}</span>
                                        )}
                                        {request.type !== "topup" && request.type !== "withdraw" && (
                                            <span className="truncate">{request.reason || "—"}</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <StatusBadge status={request.status} />
                                    </td>
                                    <td className="whitespace-nowrap text-right">
                                        {request.status === "pending" && (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(request)}
                                                    disabled={processing}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                    style={{ padding: "2px 4px" }}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleReject(request)}
                                                    disabled={processing}
                                                    className="bg-red-600 hover:bg-red-700"
                                                    style={{ padding: "2px 4px" }}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </DashboardTableCard>
            {manageModalOpen && (
                <ManageBalanceModal 
                    users={users} 
                    onClose={() => setManageModalOpen(false)} 
                    currentUser={currentUser!}
                />
            )}
        </DashboardPage>
    );
}

import { Search, X, Plus, Minus } from "lucide-react";

function ManageBalanceModal({ users, onClose, currentUser }: { users: UserDoc[], onClose: () => void, currentUser: any }) {
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);
    const [liveUsers, setLiveUsers] = useState<UserDoc[]>(users);

    useEffect(() => {
        import('../../services/db').then(m => m.getUsers().then(setLiveUsers).catch(console.error));
    }, []);

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return liveUsers.slice(0, 15);
        const q = search.toLowerCase();
        return liveUsers.filter(u => 
            u.name?.toLowerCase().includes(q) || 
            u.email?.toLowerCase().includes(q) ||
            String(u.userId || "").includes(q) ||
            u.roomNumber?.toLowerCase().includes(q)
        ).slice(0, 15);
    }, [liveUsers, search]);

    const handleTransaction = async (type: 'add' | 'deduct') => {
        if (!selectedUser) return;
        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) return alert("Enter a valid amount");
        if (type === 'deduct' && amt > (selectedUser.balance || 0)) return alert("Insufficient balance");
        
        setProcessing(true);
        try {
            const batch = writeBatch(db);
            const delta = type === 'add' ? amt : -amt;
            const newBalance = (selectedUser.balance || 0) + delta;
            
            batch.update(doc(db, "users", selectedUser.id), { balance: newBalance });
            
            const reqRef = doc(collection(db, "balanceRequests"));
            batch.set(reqRef, {
                userId: selectedUser.uid,
                userName: selectedUser.name || "Unknown",
                userEmail: selectedUser.email || "",
                userNumericId: selectedUser.userNumericId || null,
                amount: delta,
                type: type,
                reason: reason || (type === 'add' ? "Manual Addition" : "Manual Deduction"),
                status: "approved",
                createdAt: serverTimestamp(),
                processedAt: serverTimestamp(),
                processedBy: currentUser.uid,
                balanceDeductedAtSubmit: true
            });
            
            const transRef = doc(collection(db, "transactions"));
            batch.set(transRef, {
                userId: selectedUser.uid,
                amount: amt,
                type: type === 'add' ? "credit" : "debit",
                description: reason || (type === 'add' ? "Manual Addition" : "Manual Deduction"),
                balanceRequestId: reqRef.id,
                createdAt: serverTimestamp()
            });
            
            await batch.commit();
            alert(`Successfully ${type === 'add' ? 'added' : 'deducted'} ৳${amt}`);
            
            // Re-fetch users silently in the background
            import('../../services/db').then(m => m.getUsers().then(newUsers => {
                // Update the parent's users state here if we could, but easiest is just close and refresh
            }));

            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to update balance");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 pb-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
                    <h3 style={{ fontWeight: "800", fontSize: "18px", color: "#0f172a", margin: 0 }}>Manage Balance</h3>
                    <button onClick={onClose} style={{ color: "#94a3b8", background: "transparent", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20}/></button>
                </div>
                
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {!selectedUser ? (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                                <input 
                                    type="text"
                                    placeholder="Search user by name, ID, room..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ width: "100%", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "8px", paddingLeft: "38px", paddingRight: "16px", paddingTop: "10px", paddingBottom: "10px", fontSize: "14px", outline: "none" }}
                                    autoFocus
                                />
                            </div>
                            
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                                {filteredUsers.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">No users found</p>
                                ) : (
                                    filteredUsers.map(u => (
                                        <button 
                                            key={u.uid}
                                            onClick={() => setSelectedUser(u)}
                                            className="flex items-center justify-between rounded-md border border-slate-100 bg-white hover:bg-slate-50 text-left transition-all shadow-sm hover:shadow-md"
                                            style={{ margin: "6px 0", padding: "12px 16px" }}
                                        >
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{u.name}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">ID: {u.userId || '—'} | Rm: {u.roomNumber || '—'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Balance</p>
                                                <p className="font-bold text-emerald-500 text-sm">৳{u.balance || 0}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-5 animate-slide-left">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: "12px", backgroundColor: "#fff7ed", border: "1px solid #ffedd5", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
                                <div>
                                    <p style={{ fontSize: "12px", color: "#ea580c", fontWeight: "bold", marginBottom: "4px" }}>Selected User</p>
                                    <p style={{ fontWeight: "bold", fontSize: "15px", color: "#0f172a", marginBottom: "4px" }}>{selectedUser.name}</p>
                                    <p style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>ID: {selectedUser.userId || '—'} | Rm: {selectedUser.roomNumber || '—'}</p>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <p style={{ fontSize: "10px", color: "#ea580c", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Current Bal</p>
                                    <p style={{ fontWeight: "bold", color: "#10b981", fontSize: "16px" }}>৳{selectedUser.balance || 0}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "8px", marginLeft: "4px" }}>Amount</label>
                                    <input 
                                        type="number"
                                        placeholder="e.g. 500"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", outline: "none", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "8px", marginLeft: "4px" }}>Reason (Optional)</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Cash"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "12px 16px", fontSize: "14px", outline: "none", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
                                <button 
                                    onClick={() => handleTransaction('add')} 
                                    disabled={processing || !amount}
                                    style={{ backgroundColor: "#10b981", color: "white", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderRadius: "10px", border: "none", fontWeight: "700", fontSize: "15px", cursor: (processing || !amount) ? "not-allowed" : "pointer", opacity: (processing || !amount) ? 0.5 : 1 }}
                                >
                                    <Plus size={18} /> Add 
                                </button>
                                <button 
                                    onClick={() => handleTransaction('deduct')} 
                                    disabled={processing || !amount}
                                    style={{ backgroundColor: "#ef4444", color: "white", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderRadius: "10px", border: "none", fontWeight: "700", fontSize: "15px", cursor: (processing || !amount) ? "not-allowed" : "pointer", opacity: (processing || !amount) ? 0.5 : 1 }}
                                >
                                    <Minus size={18} /> Deduct
                                </button>
                            </div>
                            
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="text-xs text-slate-500 hover:text-slate-800 hover:underline mt-2 font-semibold transition-colors"
                                disabled={processing}
                            >
                                ← Choose a different user
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TypeBadge({ type }: { type: string }) {
    const styles: Record<string, string> = {
        add: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        topup: "border-sky-500/30 bg-sky-500/10 text-sky-400",
        withdraw: "border-orange-500/30 bg-orange-500/10 text-orange-400",
        deduct: "border-red-500/30 bg-red-500/10 text-red-400",
    };
    return (
        <span
            className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize",
                styles[type] || "border-slate-500/30 bg-slate-500/10 text-slate-400"
            )}
        >
            {type}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        rejected: "border-red-500/30 bg-red-500/10 text-red-400",
        pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    };
    return (
        <span
            className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize",
                styles[status] || styles.pending
            )}
        >
            {status}
        </span>
    );
}

