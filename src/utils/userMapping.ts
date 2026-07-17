import type { BalanceRequest, Order, UserDoc, WithdrawalRequest } from "../types";

export const AVATAR_GRADIENTS = [
    "linear-gradient(135deg,#7c3aed,#a78bfa)",
    "linear-gradient(135deg,#0284c7,#38bdf8)",
    "linear-gradient(135deg,#d97706,#fbbf24)",
    "linear-gradient(135deg,#059669,#34d399)",
    "linear-gradient(135deg,#db2777,#f472b6)",
    "linear-gradient(135deg,#ea580c,#fb923c)",
    "linear-gradient(135deg,#0891b2,#22d3ee)",
];

export function nameToGradient(name: string): string {
    if (!name?.trim()) return AVATAR_GRADIENTS[0];
    const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

export function getDisplayName(name?: string, email?: string): string {
    if (name?.trim()) return name.trim();
    if (email?.includes("@")) return email.split("@")[0];
    return "Unknown Customer";
}

export function getAvatarLetter(name?: string, email?: string): string {
    const display = getDisplayName(name, email);
    return display.charAt(0).toUpperCase();
}

export function buildUserLookup(users: UserDoc[]): Map<string, UserDoc> {
    return new Map(users.map((user) => [user.id, user]));
}

export function sortUsersByNumericId(users: UserDoc[]): UserDoc[] {
    return [...users].sort((a, b) => {
        const aId = a.userId ?? Number.MAX_SAFE_INTEGER;
        const bId = b.userId ?? Number.MAX_SAFE_INTEGER;
        if (aId !== bId) return aId - bId;
        return (a.name || a.email || "").localeCompare(b.name || b.email || "");
    });
}

export function enrichOrdersWithUserData(orders: Order[], users: UserDoc[]): Order[] {
    const userMap = buildUserLookup(users);

    return orders.map((order) => {
        const user = userMap.get(order.userId);
        return {
            ...order,
            userName: order.userName || user?.name || "",
            userEmail: order.userEmail || user?.email || "",
            userNumericId: order.userNumericId ?? user?.userId ?? null,
            roomNumber: order.roomNumber || user?.roomNumber || "",
        };
    });
}

export function enrichBalanceRequestsWithUserData(
    requests: BalanceRequest[],
    users: UserDoc[]
): BalanceRequest[] {
    const userMap = buildUserLookup(users);

    return requests.map((request) => {
        const user = userMap.get(request.userId);
        return {
            ...request,
            userName: request.userName || user?.name || "",
            userEmail: request.userEmail || user?.email || "",
            userNumericId: request.userNumericId ?? user?.userId ?? null,
        };
    });
}

export function enrichWithdrawalsWithUserData(
    requests: WithdrawalRequest[],
    users: UserDoc[]
): WithdrawalRequest[] {
    const userMap = buildUserLookup(users);

    return requests.map((request) => {
        const user = userMap.get(request.userId);
        return {
            ...request,
            userName: request.userName || user?.name || "",
            userEmail: request.userEmail || user?.email || "",
            userNumericId: request.userNumericId ?? user?.userId ?? null,
        };
    });
}
