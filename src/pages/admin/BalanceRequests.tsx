import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
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

    useEffect(() => {
        getUsers().then(setUsers).catch(console.error);
    }, []);

    useEffect(() => {
        const q =
            filter === "all"
                ? query(collection(db, "balanceRequests"))
                : filter === "withdraw" || filter === "topup"
                ? query(collection(db, "balanceRequests"), where("type", "==", filter))
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

    const filters = ["topup", "withdraw"] as const;

    return (
        <DashboardPage title="Wallet" subtitle="Review student top-ups, withdrawals, and balance changes">
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
                                        <div className="text-[10px] font-bold text-violet-400">
                                            #{request.requestNumber || "—"}
                                        </div>
                                        {request.createdAt ? formatDateBD(request.createdAt) : "—"}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <CustomerCell
                                            name={request.userName}
                                            email={request.userEmail}
                                            userNumericId={request.userNumericId}
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
        </DashboardPage>
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
