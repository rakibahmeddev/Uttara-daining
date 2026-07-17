import type { BalanceRequest, UserDoc } from "../types";

/** User wallet balance stored in Firestore */
export function getWalletBalance(user: Pick<UserDoc, "balance"> | null | undefined): number {
    return Number(user?.balance ?? 0);
}

/** Sum of pending withdrawal amounts (stored as negative in balanceRequests) */
export function sumPendingWithdrawals(requests: BalanceRequest[]): number {
    return requests
        .filter((r) => r.type === "withdraw" && r.status === "pending")
        .reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0);
}

/** Spendable balance after reserved pending withdrawals */
export function getAvailableBalance(
    user: Pick<UserDoc, "balance"> | null | undefined,
    pendingWithdrawals = 0
): number {
    return Math.max(0, getWalletBalance(user) - pendingWithdrawals);
}

export interface WithdrawalValidation {
    valid: boolean;
    error: string | null;
    availableBalance: number;
}

export function validateWithdrawalAmount(
    amount: number,
    availableBalance: number
): WithdrawalValidation {
    if (!amount || Number.isNaN(amount) || amount <= 0) {
        return { valid: false, error: "Enter a valid amount greater than 0.", availableBalance };
    }
    if (amount > availableBalance) {
        return {
            valid: false,
            error: `Amount exceeds available balance of ৳${availableBalance.toLocaleString()}.`,
            availableBalance,
        };
    }
    return { valid: true, error: null, availableBalance };
}

export function validateDeductionAmount(
    amount: number,
    availableBalance: number
): WithdrawalValidation {
    if (!amount || Number.isNaN(amount) || amount <= 0) {
        return { valid: false, error: "Enter a valid amount greater than 0.", availableBalance };
    }
    if (amount > availableBalance) {
        return {
            valid: false,
            error: `Cannot deduct more than available balance (৳${availableBalance.toLocaleString()}).`,
            availableBalance,
        };
    }
    return { valid: true, error: null, availableBalance };
}
