import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    runTransaction
} from "firebase/firestore";
import { db } from "./firebase";
import type { Meal, UserDoc, Order, BalanceRequest, AppNotification, PermanentNotice } from "../types";
import { enrichOrdersWithUserData, sortUsersByNumericId } from "../utils/userMapping";
import { getAvailableBalance, validateWithdrawalAmount, validateDeductionAmount } from "../utils/balance";

// --- Meals ---
export const addMeal = async (mealData) => {
    const { generateMealNumber } = await import('../utils/idGenerator');
    const mealNumber = await generateMealNumber();

    return await addDoc(collection(db, "meals"), {
        ...mealData,
        mealNumber,
        createdAt: serverTimestamp()
    });
};

export const updateMeal = async (id, data) => {
    const mealRef = doc(db, "meals", id);
    await updateDoc(mealRef, data);
};

export const deleteMeal = async (id) => {
    await deleteDoc(doc(db, "meals", id));
};

export const getMeals = async (): Promise<Meal[]> => {
    const q = query(collection(db, "meals"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal));
};

// --- Users ---
export const getUsers = async (): Promise<UserDoc[]> => {
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc));
    return sortUsersByNumericId(users);
};

export const updateUserBalance = async (userId, amount, description) => {
    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
            throw new Error("User does not exist!");
        }

        const currentBalance = userDoc.data().balance || 0;
        const delta = Number(amount);

        if (delta < 0 && Math.abs(delta) > currentBalance) {
            throw new Error(`Insufficient balance. Available: ৳${currentBalance}`);
        }

        const newBalance = currentBalance + delta;
        transaction.update(userRef, { balance: newBalance });

        const transactionRef = doc(collection(db, "transactions"));
        transaction.set(transactionRef, {
            userId,
            amount: Math.abs(delta),
            type: delta >= 0 ? "credit" : "debit",
            description,
            createdAt: serverTimestamp()
        });
    });
};

// --- Orders ---
export const placeOrder = async (userId, items, totalAmount) => {
    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) throw "User not found";

        const currentBalance = userDoc.data().balance || 0;
        if (currentBalance < totalAmount) {
            throw "Insufficient balance";
        }

        const newBalance = currentBalance - totalAmount;
        transaction.update(userRef, { balance: newBalance });

        // Create Order — persist all display fields for admin dashboard
        const userData = userDoc.data();
        const orderRef = doc(collection(db, "orders"));
        transaction.set(orderRef, {
            userId,
            userName: userData.name || userData.displayName || "",
            userEmail: userData.email || "",
            userNumericId: userData.userId || null,
            roomNumber: userData.roomNumber || "",
            items,
            totalAmount,
            status: 'pending',
            createdAt: serverTimestamp()
        });

        // Create Transaction Record
        const transRef = doc(collection(db, "transactions"));
        transaction.set(transRef, {
            userId,
            amount: totalAmount,
            type: 'debit',
            description: 'Order Payment',
            createdAt: serverTimestamp()
        });
    });
};

export const updateOrderStatus = async (orderId, status) => {
    console.log(`🔄 Updating order ${orderId} to status:`, status);
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status });
    console.log(`✅ Order ${orderId} status updated to:`, status);
};

export const getAllOrders = async (): Promise<Order[]> => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
};

export const getAllOrdersEnriched = async (): Promise<Order[]> => {
    const [orders, users] = await Promise.all([getAllOrders(), getUsers()]);
    return enrichOrdersWithUserData(orders, users);
};

export const backfillUserIds = async () => {
    const { collection, getDocs, doc, updateDoc, setDoc } = await import('firebase/firestore');
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    // Sort users by createdAt (oldest first). Fallback to doc id sorting if createdAt is missing.
    const sortedUsers = usersSnapshot.docs.map(d => ({
        id: d.id,
        data: d.data()
    })).sort((a, b) => {
        const aTime = a.data.createdAt?.seconds || a.data.createdAt?.getTime?.() || 0;
        const bTime = b.data.createdAt?.seconds || b.data.createdAt?.getTime?.() || 0;
        if (aTime !== bTime) return aTime - bTime;
        return a.id.localeCompare(b.id);
    });

    // Run parallel update queries to update each user document with a sequential numerical userId and formatted idNumber
    const updatePromises = sortedUsers.map((user, index) => {
        const newUserId = index + 1;
        const userRef = doc(db, "users", user.id);
        return updateDoc(userRef, {
            userId: newUserId,
            idNumber: `STU-${newUserId}`
        });
    });

    await Promise.all(updatePromises);

    // Update the counter doc to sync with the final total
    const counterRef = doc(db, "metadata", "users");
    await setDoc(counterRef, { lastUserId: sortedUsers.length }, { merge: true });

    return sortedUsers.length;
};

// --- Balance Requests ---

export const getPendingWithdrawalsForUser = async (userId: string): Promise<BalanceRequest[]> => {
    const q = query(
        collection(db, "balanceRequests"),
        where("userId", "==", userId),
        where("type", "==", "withdraw"),
        where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BalanceRequest));
};

export const submitWithdrawalRequest = async (data: {
    userId: string;
    userName: string;
    userEmail: string;
    userNumericId?: number | null;
    amount: number;
    bkashNumber: string;
    reason: string;
    requestNumber: string | number;
}) => {
    const pending = await getPendingWithdrawalsForUser(data.userId);
    const { getDoc } = await import("firebase/firestore");
    const userRef = doc(db, "users", data.userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) throw new Error("User not found");

    const pendingTotal = pending.reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
    const available = getAvailableBalance(userDoc.data() as UserDoc, pendingTotal);
    const validation = validateWithdrawalAmount(data.amount, available);
    if (!validation.valid) throw new Error(validation.error!);

    await addDoc(collection(db, "balanceRequests"), {
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        userNumericId: data.userNumericId ?? null,
        amount: -Math.abs(data.amount),
        type: "withdraw",
        bkashNumber: data.bkashNumber,
        reason: data.reason,
        status: "pending",
        requestNumber: data.requestNumber,
        createdAt: serverTimestamp(),
    });
};

export const submitStudentTopUpRequest = async (data: {
    userId: string;
    userName: string;
    userEmail: string;
    userNumericId?: number | null;
    amount: number;
    txnId: string;
    paymentMethod: string;
    requestNumber: string | number;
}) => {
    if (!data.amount || data.amount <= 0) throw new Error("Enter a valid amount");
    if (!data.txnId?.trim()) throw new Error("Transaction ID is required");

    await addDoc(collection(db, "balanceRequests"), {
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        userNumericId: data.userNumericId ?? null,
        amount: Math.abs(data.amount),
        type: "topup",
        txnId: data.txnId.trim(),
        paymentMethod: data.paymentMethod,
        reason: `${data.paymentMethod} top-up — TxnID: ${data.txnId.trim()}`,
        status: "pending",
        requestNumber: data.requestNumber,
        createdAt: serverTimestamp(),
    });
};

export const approveBalanceRequest = async (
    request: BalanceRequest,
    processedBy: string
) => {
    const requestRef = doc(db, "balanceRequests", request.id);

    // Pre-fetch pending withdrawals for available balance check
    let otherPendingWithdrawals = 0;
    if (request.type === "withdraw") {
        const pending = await getPendingWithdrawalsForUser(request.userId);
        otherPendingWithdrawals = pending
            .filter((r) => r.id !== request.id)
            .reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
    }

    await runTransaction(db, async (transaction) => {
        const reqSnap = await transaction.get(requestRef);
        if (!reqSnap.exists()) throw new Error("Request not found");
        const reqData = reqSnap.data() as BalanceRequest;
        if (reqData.status !== "pending") throw new Error("Request already processed");

        const userRef = doc(db, "users", reqData.userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");

        const currentBalance = userSnap.data().balance || 0;

        if (reqData.type === "withdraw") {
            const withdrawAmount = Math.abs(Number(reqData.amount));
            const available = getAvailableBalance({ balance: currentBalance }, otherPendingWithdrawals);
            const validation = validateWithdrawalAmount(withdrawAmount, available);
            if (!validation.valid) throw new Error(validation.error!);

            transaction.update(userRef, { balance: currentBalance - withdrawAmount });
            const transRef = doc(collection(db, "transactions"));
            transaction.set(transRef, {
                userId: reqData.userId,
                amount: withdrawAmount,
                type: "debit",
                description: `Withdrawal approved — ${reqData.bkashNumber || "bKash"}`,
                balanceRequestId: request.id,
                createdAt: serverTimestamp(),
            });
        } else if (reqData.type === "topup" || reqData.type === "add") {
            const creditAmount = Math.abs(Number(reqData.amount));
            transaction.update(userRef, { balance: currentBalance + creditAmount });
            const transRef = doc(collection(db, "transactions"));
            transaction.set(transRef, {
                userId: reqData.userId,
                amount: creditAmount,
                type: "credit",
                description: reqData.reason || "Balance top-up approved",
                balanceRequestId: request.id,
                createdAt: serverTimestamp(),
            });
        } else if (reqData.type === "deduct") {
            const deductAmount = Math.abs(Number(reqData.amount));
            const validation = validateDeductionAmount(deductAmount, currentBalance);
            if (!validation.valid) throw new Error(validation.error!);
            transaction.update(userRef, { balance: currentBalance - deductAmount });
            const transRef = doc(collection(db, "transactions"));
            transaction.set(transRef, {
                userId: reqData.userId,
                amount: deductAmount,
                type: "debit",
                description: reqData.reason || "Balance deducted",
                balanceRequestId: request.id,
                createdAt: serverTimestamp(),
            });
        }

        transaction.update(requestRef, {
            status: "approved",
            processedAt: serverTimestamp(),
            processedBy,
        });
    });
};

// --- Notifications ---

export const sendNotification = async (data: Omit<AppNotification, "id">) => {
    return addDoc(collection(db, "notifications"), {
        ...data,
        active: true,
        createdAt: serverTimestamp(),
    });
};

export const getActiveNotifications = async (): Promise<AppNotification[]> => {
    const q = query(
        collection(db, "notifications"),
        where("active", "==", true),
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
};

export const deactivateNotification = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { active: false });
};

// --- Permanent Notice ---

export const getPermanentNotice = async (): Promise<PermanentNotice | null> => {
    const snapshot = await getDocs(collection(db, "settings"));
    const noticeDoc = snapshot.docs.find((d) => d.id === "permanentNotice");
    if (!noticeDoc) return null;
    return { id: noticeDoc.id, ...noticeDoc.data() } as PermanentNotice;
};

export const savePermanentNotice = async (data: {
    message: string;
    paymentNumber?: string;
    paymentMethod?: string;
    updatedBy: string;
    updatedByName?: string;
}) => {
    const noticeRef = doc(db, "settings", "permanentNotice");
    await updateDoc(noticeRef, {
        ...data,
        active: true,
        updatedAt: serverTimestamp(),
    }).catch(async () => {
        const { setDoc } = await import("firebase/firestore");
        await setDoc(noticeRef, {
            ...data,
            active: true,
            updatedAt: serverTimestamp(),
        });
    });
};

// --- Custom CSS (Admin Theme Editor) ---
export const getCustomCSS = async (): Promise<string> => {
    const { getDoc, doc: firestoreDoc } = await import("firebase/firestore");
    const ref = firestoreDoc(db, "settings", "customCSS");
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data().css as string) || "" : "";
};

export const saveCustomCSS = async (css: string): Promise<void> => {
    const { setDoc, doc: firestoreDoc } = await import("firebase/firestore");
    const ref = firestoreDoc(db, "settings", "customCSS");
    await setDoc(ref, { css, updatedAt: serverTimestamp() });
};
