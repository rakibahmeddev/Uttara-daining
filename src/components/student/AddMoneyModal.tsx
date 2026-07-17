import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { submitStudentTopUpRequest } from "../../services/db";
import Modal from "../ui/Modal";
import { Input, Select, FormField } from "../ui/Input";
import { Button } from "../ui/Button";
import { Wallet, CreditCard, Hash, AlertCircle } from "lucide-react";

interface AddMoneyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function AddMoneyModal({ isOpen, onClose, onSuccess }: AddMoneyModalProps) {
    const { currentUser } = useAuth();
    const { permanentNotice } = useNotifications();
    const [amount, setAmount] = useState("");
    const [txnId, setTxnId] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("bKash");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setAmount("");
        setTxnId("");
        setPaymentMethod(permanentNotice?.paymentMethod || "bKash");
        setError(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            setError("Enter a valid amount greater than 0.");
            return;
        }
        if (!txnId.trim()) {
            setError("Transaction ID is required.");
            return;
        }

        setLoading(true);
        try {
            const { generateRequestNumber } = await import("../../utils/idGenerator");
            const requestNumber = await generateRequestNumber();

            await submitStudentTopUpRequest({
                userId: currentUser!.uid,
                userName: currentUser!.name || "",
                userEmail: currentUser!.email || "",
                userNumericId: currentUser!.userId ?? null,
                amount: numAmount,
                txnId: txnId.trim(),
                paymentMethod,
                requestNumber,
            });

            reset();
            onClose();
            onSuccess?.();
            alert("Top-up request submitted! Your balance will update once approved.");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add Money"
            subtitle="Submit your bKash/Nagad payment for manager approval"
            size="md"
        >
            {permanentNotice?.message ? (
                <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Payment Instructions</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-amber-100">{permanentNotice.message}</p>
                    {permanentNotice.paymentNumber && (
                        <p className="mt-2 font-mono text-sm font-bold text-white">
                            {permanentNotice.paymentMethod || "bKash"}: {permanentNotice.paymentNumber}
                        </p>
                    )}
                </div>
            ) : (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    Payment details will appear here once your manager sets a permanent notice.
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Payment Method">
                    <Select variant="dark" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                    </Select>
                </FormField>

                <FormField label="Amount (৳)" error={error && !amount ? error : undefined}>
                    <Input
                        variant="dark"
                        icon={Wallet}
                        type="number"
                        min="1"
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount sent"
                        required
                    />
                </FormField>

                <FormField label="Transaction ID (TxnID)" hint="The ID from your bKash/Nagad app">
                    <Input
                        variant="dark"
                        icon={Hash}
                        value={txnId}
                        onChange={(e) => setTxnId(e.target.value)}
                        placeholder="e.g. 8N7A2B3C4D"
                        required
                    />
                </FormField>

                {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                    <CreditCard size={16} className="mr-2" />
                    {loading ? "Submitting…" : "Submit Top-Up Request"}
                </Button>
            </form>
        </Modal>
    );
}
