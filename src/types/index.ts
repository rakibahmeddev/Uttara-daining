import { Timestamp } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Loading & Error State Types
// AuthContext-এর Timeout Fallback এবং Error Handling-এর জন্য ব্যবহৃত
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Firebase বা নেটওয়ার্ক এরর থেকে তৈরি টাইপড এরর স্টেট।
 * `catch (error: unknown)` ব্লক থেকে এই স্ট্রাকচারে রূপান্তর করা হয়।
 */
export interface AuthError {
  /** এরর মেসেজ (human-readable) */
  message: string;
  /** Firebase ErrorCode যেমন: "auth/network-request-failed" */
  code?: string;
  /** এরর কখন হয়েছে সেটার timestamp */
  timestamp: number;
}

/**
 * Splash / Loading স্ক্রিনের সম্পূর্ণ স্টেট।
 * AuthProvider-এ loading এবং error একসাথে ম্যানেজ করার জন্য।
 */
export interface SplashLoadingState {
  /** এখনও লোড হচ্ছে কিনা */
  loading: boolean;
  /** Timeout বা Firebase এরর হলে সেট হবে, অন্যথায় null */
  error: AuthError | null;
}

/** A Firestore document with a string id field merged in */
export interface FirestoreDoc {
    id: string;
    [key: string]: unknown;
}

export interface OrderItem {
    name: string;
    quantity: number;
    price: number;
    [key: string]: unknown;
}

export interface Order extends FirestoreDoc {
    userId: string;
    userName?: string;
    userEmail?: string;
    userNumericId?: number | null;
    roomNumber?: string;
    orderId?: string | number;
    status: "pending" | "completed" | "cancelled" | string;
    totalAmount: number;
    items: OrderItem[];
    createdAt?: Timestamp | { seconds: number; nanoseconds: number };
    deliveredBy?: string | null;
    deliveredByName?: string;
    deliveredByRoom?: string;
    deliveredAt?: Timestamp | { seconds: number; nanoseconds: number } | Date;
    paymentMethod?: "balance" | "cash" | string;
}

export interface Meal extends FirestoreDoc {
    name: string;
    price: number;
    description?: string;
    image?: string;
    available: boolean;
    timeSlot?: string;
    mealDate?: string;
    date?: string;
    mealNumber?: string | number;
    quantity?: number;
}

export interface UserDoc extends FirestoreDoc {
    name?: string;
    email: string;
    role?: string;
    userId?: number;
    idNumber?: string;
    registrationNumber?: string;
    roomNumber?: string;
    departmentName?: string;
    hallName?: string;
    balance?: number;
    uid?: string;
    assignedDeliveryDate?: string;
}

export interface BalanceRequest extends FirestoreDoc {
    userId: string;
    userName: string;
    userEmail: string;
    userNumericId?: number | null;
    requestedBy?: string;
    requestedByName?: string;
    amount: number;
    type: "add" | "deduct" | "withdraw" | "topup" | string;
    reason: string;
    requestNumber?: string | number;
    bkashNumber?: string;
    txnId?: string;
    paymentMethod?: "bkash" | "nagad" | string;
    status: "pending" | "approved" | "rejected" | string;
    rejectionReason?: string;
    processedAt?: Timestamp | { seconds: number; nanoseconds: number };
    processedBy?: string;
    createdAt?: Timestamp | { seconds: number; nanoseconds: number };
}

export interface AppNotification extends FirestoreDoc {
    title: string;
    message: string;
    type?: "info" | "warning" | "success" | "urgent" | string;
    targetRole?: "student" | "all" | string;
    createdBy: string;
    createdByName?: string;
    active: boolean;
    createdAt?: Timestamp | { seconds: number; nanoseconds: number };
}

export interface PermanentNotice extends FirestoreDoc {
    message: string;
    paymentNumber?: string;
    paymentMethod?: string;
    active: boolean;
    updatedBy: string;
    updatedByName?: string;
    updatedAt?: Timestamp | { seconds: number; nanoseconds: number };
}

export interface WithdrawalRequest extends FirestoreDoc {
    userId: string;
    userName?: string;
    userEmail?: string;
    userNumericId?: number | null;
    amount: number;
    phoneNumber?: string;
    bkashNumber?: string;
    reason?: string;
    rejectionReason?: string;
    requestNumber?: string | number;
    status: "pending" | "approved" | "rejected" | string;
    createdAt?: Timestamp | { seconds: number; nanoseconds: number };
}
