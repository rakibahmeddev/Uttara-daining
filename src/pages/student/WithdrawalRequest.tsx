import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { submitWithdrawalRequest, getPendingWithdrawalsForUser } from "../../services/db";
import { formatDateBD } from "../../utils/date";
import { getAvailableBalance, validateWithdrawalAmount, sumPendingWithdrawals } from "../../utils/balance";
import { Clock, CheckCircle, XCircle, Send, AlertCircle, Wallet } from "lucide-react";
import { Input, Textarea, FormField } from "../../components/ui/Input";
import type { BalanceRequest } from "../../types";

export default function WithdrawalRequest() {
    const { currentUser } = useAuth();
    const [amount, setAmount] = useState("");
    const [bkashNumber, setBkashNumber] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<BalanceRequest[]>([]);
    const [pendingWithdrawals, setPendingWithdrawals] = useState<BalanceRequest[]>([]);
    const [fetchingRequests, setFetchingRequests] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const availableBalance = useMemo(
        () => getAvailableBalance(currentUser, sumPendingWithdrawals(pendingWithdrawals)),
        [currentUser, pendingWithdrawals]
    );

    const numAmount = Number(amount);
    const validation = useMemo(
        () => (amount ? validateWithdrawalAmount(numAmount, availableBalance) : { valid: false, error: null, availableBalance }),
        [amount, numAmount, availableBalance]
    );

    const canSubmit =
        validation.valid &&
        bkashNumber.length === 11 &&
        reason.trim().length > 0 &&
        !loading;

    useEffect(() => {
        if (!currentUser?.uid) return;

        const pendingQ = query(
            collection(db, "balanceRequests"),
            where("userId", "==", currentUser.uid),
            where("type", "==", "withdraw"),
            where("status", "==", "pending")
        );
        const unsubPending = onSnapshot(pendingQ, (snap) => {
            setPendingWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BalanceRequest)));
        });

        const historyQ = query(
            collection(db, "balanceRequests"),
            where("userId", "==", currentUser.uid),
            where("type", "==", "withdraw"),
            orderBy("createdAt", "desc")
        );
        const unsubHistory = onSnapshot(
            historyQ,
            (snap) => {
                setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BalanceRequest)));
                setFetchingRequests(false);
            },
            (e) => {
                console.error(e);
                setError("Failed to load request history");
                setFetchingRequests(false);
            }
        );

        return () => {
            unsubPending();
            unsubHistory();
        };
    }, [currentUser?.uid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const check = validateWithdrawalAmount(numAmount, availableBalance);
        if (!check.valid) {
            setError(check.error);
            return;
        }
        if (bkashNumber.length !== 11) {
            setError("bKash number must be exactly 11 digits.");
            return;
        }

        setLoading(true);
        try {
            const { generateRequestNumber } = await import("../../utils/idGenerator");
            const requestNumber = await generateRequestNumber();

            await submitWithdrawalRequest({
                userId: currentUser!.uid,
                userName: currentUser!.name || "",
                userEmail: currentUser!.email || "",
                userNumericId: currentUser!.userId ?? null,
                amount: numAmount,
                bkashNumber,
                reason,
                requestNumber,
            });

            setAmount("");
            setBkashNumber("");
            setReason("");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in-up w-full pb-24 md:pb-8">

            <div className="mb-6" style={{margin:'50px', padding: '0px'}}>
                <div
                    className="flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6 shadow-md"
                    style={{ background: "linear-gradient(135deg, #f97316, #fbbf24)" }}
                     
                >
                    <div style={{padding: '20px'}}>
                        <h1 className="text-xl font-black text-white md:text-3xl">Withdraw Balance</h1>
                        <p className="mt-1 text-sm text-white/80">Request withdrawal to your bKash account</p>
                    </div>
                    
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" style={{padding: '0px', margin: '50px'}}>
                <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3" style={{margin: '20px'}}>
                        
                        <h2 className="text-xl font-bold text-slate-800">New Withdrawal</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-1 flex-col space-y-5" style={{padding: '20px'}}>
                        <FormField label="Withdrawal Amount (৳)" variant="light" error={amount && validation.error ? validation.error : undefined} style={{marginBottom: '10px'}}>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                required
                                min="1"
                                max={availableBalance}
                                placeholder="Enter amount"
                                
                                error={!!(amount && validation.error)}
                                style={{padding: '10px'}}
                            />
                            <p className="mt-1.5 text-xs font-medium text-slate-400">
                                Maximum available: ৳{availableBalance.toLocaleString()}
                            </p>
                        </FormField>

                        <FormField label="bKash Number *" variant="light">
                            <Input
                                type="tel"
                                value={bkashNumber}
                                onChange={(e) => setBkashNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                required
                                placeholder="01712345678"
                                maxLength={11}
                                error={bkashNumber.length > 0 && bkashNumber.length !== 11}
                                style={{padding: '5px'}}
                            />
                        </FormField>

                        <FormField label="Reason for Withdrawal" variant="light">
                            <Textarea
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                placeholder="Please explain why you need to withdraw..."
                            />
                        </FormField>

                        {amount && validation.valid && (
                            <div className="space-y-2 rounded-2xl border border-slate-200/50 bg-slate-50 p-4">
                                <div className="flex justify-between text-sm font-medium text-slate-500">
                                    <span>Available Balance:</span>
                                    <span className="font-bold text-slate-700">৳{availableBalance.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium text-slate-500">
                                    <span>After Withdrawal:</span>
                                    <span className="font-bold text-orange-600">
                                        ৳{Math.max(0, availableBalance - numAmount).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="mt-auto pt-4">
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="w-full rounded-xl py-4 text-base font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                                style={{
                                    background: canSubmit ? "linear-gradient(135deg, #f97316, #fbbf24)" : "#94a3b8",
                                    boxShadow: canSubmit ? "0 4px 14px rgba(249,115,22,0.35)" : "none",
                                }}
                            >
                                {loading ? "Submitting..." : "Submit Request"}
                            </button>
                            {!canSubmit && amount && validation.error && (
                                <p className="mt-2 text-center text-xs font-medium text-red-500">{validation.error}</p>
                            )}
                        </div>
                    </form>
                </div>

                <div className="flex h-full max-h-[850px] flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" style={{padding: '20px'}}>
                    <div className="mb-6 flex items-center gap-3">
                        
                        <h3 className="text-xl font-bold text-slate-800">History</h3>
                    </div>

                    {fetchingRequests ? (
                        <div className="flex flex-1 flex-col items-center justify-center py-12">
                            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-orange-500" />
                            <p className="font-medium text-slate-400">Loading requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center py-12">
                            <Clock size={36} className="text-slate-400" />
                            <p className="mt-4 font-medium text-slate-400">No withdrawal requests yet</p>
                        </div>
                    ) : (
                        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
                            {requests.map((request) => (
                                <div
                                    key={request.id}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:border-orange-500/30"
                                >
                                    <div className="mb-3 flex items-start justify-between">
                                        <div>
                                            <p className="text-2xl font-black text-slate-800">৳{Math.abs(request.amount)}</p>
                                            <p className="text-xs text-slate-500">
                                                #{request.requestNumber} · {request.createdAt ? formatDateBD(request.createdAt) : "Pending"}
                                            </p>
                                        </div>
                                        <StatusBadge status={request.status} />
                                    </div>
                                    <p className="text-xs text-slate-600">
                                        <span className="font-medium">bKash:</span> {request.bkashNumber}
                                    </p>
                                    {request.rejectionReason && (
                                        <p className="mt-2 text-xs text-red-500">{request.rejectionReason}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { icon: typeof Clock; classes: string; label: string }> = {
        pending: { icon: Clock, classes: "bg-amber-50 border-amber-200 text-amber-600", label: "Pending" },
        approved: { icon: CheckCircle, classes: "bg-emerald-50 border-emerald-200 text-emerald-600", label: "Approved" },
        rejected: { icon: XCircle, classes: "bg-red-50 border-red-200 text-red-600", label: "Rejected" },
    };
    const { icon: Icon, classes, label } = config[status] || config.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${classes}`}>
            <Icon size={12} />
            {label}
        </span>
    );
}
