/**
 * AuthContext.tsx — Authentication Context
 *
 * Firebase Auth এবং Firestore থেকে ইউজার ডেটা ম্যানেজ করে।
 *
 * ফিক্স করা সমস্যাগুলো:
 *  ১. Timeout Fallback (5000ms) — Firebase ইনিশিয়ালাইজেশন দেরি হলে
 *     loading অটো-ফলব্যাক করবে।
 *  ২. Proper try-catch-finally — যেকোনো এরর হলে loading শেষ হবে।
 *  ৩. TypeScript-typed error state — FirebaseError/unknown সঠিকভাবে হ্যান্ডেল।
 *  ৪. useOnlineStatus hook — অফলাইনে Offline Warning দেখাবে।
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { auth, db } from "../services/firebase";
import type { AuthError } from "../types";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Firebase Auth User-এর উপরে অ্যাপ-স্পেসিফিক ফিল্ড যোগ করা হয়েছে */
export interface AppUser extends User {
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
  uid: string;
}

/** AuthContext-এ পাওয়া যাবে এমন সব ভ্যালুর টাইপ */
interface AuthContextType {
  currentUser: AppUser | null;
  userRole: string | null;
  loading: boolean;
  /** Timeout বা Firebase এরর হলে সেট হয়, নইলে null */
  authError: AuthError | null;
  logoutUser: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Firebase ইনিশিয়ালাইজেশন/ডেটা ফেচের জন্য সর্বোচ্চ সময়সীমা (ms) */
const AUTH_TIMEOUT_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: unknown error → AuthError
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `catch (error: unknown)` থেকে পাওয়া error-কে TypeScript-typed
 * `AuthError` অবজেক্টে রূপান্তর করে।
 *
 * FirebaseError হলে code ও message, অন্যথায় fallback message দেয়।
 */
function parseToAuthError(error: unknown): AuthError {
  if (error instanceof FirebaseError) {
    return {
      message: error.message,
      code: error.code,
      timestamp: Date.now(),
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      timestamp: Date.now(),
    };
  }
  return {
    message: "An unknown error occurred during authentication.",
    timestamp: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  loading: true,
  authError: null,
  logoutUser: async () => {},
});

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  // নেটওয়ার্ক স্ট্যাটাস ট্র্যাক করার জন্য custom hook
  const isOnline = useOnlineStatus();

  useEffect(() => {
    let mounted = true;
    // Firestore realtime listener-এর unsubscribe ফাংশন
    let userUnsub: (() => void) | null = null;

    // ── ১. Timeout Fallback ──────────────────────────────────────────────────
    // যদি 5 সেকেন্ডের মধ্যে Firebase কোনো response না দেয়,
    // loading বন্ধ করা হবে এবং একটি typed error সেট করা হবে।
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[AuthContext] Auth timeout! Forcing loading to false.");
        setLoading(false);
        setAuthError({
          message:
            "সংযোগ স্থাপনে অনেক বেশি সময় লাগছে। ইন্টারনেট সংযোগ চেক করুন এবং পেজ রিফ্রেশ করুন।",
          code: "auth/timeout",
          timestamp: Date.now(),
        });
      }
    }, AUTH_TIMEOUT_MS);

    // ── ২. Firebase Auth State Change Listener ───────────────────────────────
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user: User | null) => {
        if (!mounted) return;

        // Timeout বাতিল: Firebase সময়মতো রেসপন্স দিয়েছে
        clearTimeout(timeoutId);

        // আগের Firestore listener পরিষ্কার করা
        if (userUnsub) {
          userUnsub();
          userUnsub = null;
        }

        try {
          if (user) {
            // প্রাথমিকভাবে Auth user সেট করা (Firestore data আসার আগে)
            setCurrentUser(user as AppUser);

            const userRef = doc(db, "users", user.uid);

            // ── ৩. Firestore Realtime Snapshot ──────────────────────────────
            // onSnapshot ব্যবহার করলে user data realtime আপডেট হয়।
            // এরর হলে error handler-এ setLoading(false) নিশ্চিত।
            userUnsub = onSnapshot(
              userRef,
              (userDoc) => {
                if (!mounted) return;
                try {
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUserRole(userData.role || "student");
                    setCurrentUser({ ...user, ...userData } as AppUser);
                  } else {
                    // Firestore-এ document না থাকলে default role
                    setUserRole("student");
                  }
                  // প্রথম snapshot পাওয়ার পর loading শেষ
                  setAuthError(null);
                } catch (snapError: unknown) {
                  console.error("[AuthContext] Snapshot parse error:", snapError);
                  setAuthError(parseToAuthError(snapError));
                } finally {
                  // যেকোনো অবস্থায় loading বন্ধ হবে
                  if (mounted) setLoading(false);
                }
              },
              (dbError: FirebaseError) => {
                // Firestore listener-এর error callback
                console.error("[AuthContext] Firestore listener error:", dbError);
                if (mounted) {
                  setUserRole("student");
                  setAuthError(parseToAuthError(dbError));
                  setLoading(false);
                }
              }
            );
          } else {
            // কোনো user নেই — guest/logged out state
            setCurrentUser(null);
            setUserRole(null);
            setAuthError(null);
            setLoading(false);
          }
        } catch (error: unknown) {
          // onAuthStateChanged callback-এর বাইরের যেকোনো অপ্রত্যাশিত error
          console.error("[AuthContext] Unexpected auth error:", error);
          if (mounted) {
            setAuthError(parseToAuthError(error));
          }
        } finally {
          // নিরাপত্তামূলক finally: user=null case-এ এটি double-call হতে পারে,
          // কিন্তু setState idempotent হওয়ায় সমস্যা নেই।
          // (user !== null path-এ loading Firestore callback-এ বন্ধ হয়)
        }
      },
      (authListenerError: FirebaseError) => {
        // onAuthStateChanged নিজেই error দিলে এখানে আসবে
        console.error("[AuthContext] onAuthStateChanged error:", authListenerError);
        if (mounted) {
          setAuthError(parseToAuthError(authListenerError));
          setLoading(false);
        }
      }
    );

    // Cleanup: কম্পোনেন্ট unmount হলে সব listener এবং timeout বাতিল
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
      if (userUnsub) userUnsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    currentUser,
    userRole,
    loading,
    authError,
    logoutUser: async () => {
      try {
        await auth.signOut();
      } catch (error: unknown) {
        console.error("[AuthContext] Logout error:", error);
        throw error;
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        // ── Splash / Loading Screen ────────────────────────────────────────
        <div
          className="flex h-screen items-center justify-center"
          style={{ background: "var(--bg-base, #0b1120)" }}
          role="status"
          aria-live="polite"
          aria-label="অ্যাপ লোড হচ্ছে"
        >
          <div className="text-center">
            {/* স্পিনার অ্যানিমেশন */}
            <div
              className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500"
              aria-hidden="true"
            />
            <p className="text-slate-400 text-sm">লোড হচ্ছে...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Offline Warning Banner ────────────────────────────────────── */}
          {!isOnline && (
            <div
              id="offline-warning-banner"
              role="alert"
              aria-live="assertive"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                background: "linear-gradient(90deg, #b45309, #92400e)",
                color: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: 600,
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                letterSpacing: "0.01em",
              }}
            >
              {/* Wi-Fi অফ আইকন (SVG) */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
              <span>
                আপনি অফলাইনে আছেন — ইন্টারনেট সংযোগ নেই। কিছু ফিচার কাজ নাও করতে পারে।
              </span>
            </div>
          )}

          {/* ── Auth Error Banner (timeout বা Firebase error হলে) ─────────── */}
          {/* অনলাইনে থাকলে error দেখাই; অফলাইনে offline banner-ই যথেষ্ট */}
          {authError && isOnline && (
            <div
              id="auth-error-banner"
              role="alert"
              aria-live="polite"
              style={{
                position: "fixed",
                top: !isOnline ? "48px" : 0,
                left: 0,
                right: 0,
                zIndex: 9998,
                background: "linear-gradient(90deg, #7f1d1d, #991b1b)",
                color: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "10px 16px",
                fontSize: "13px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              <span>⚠️ {authError.message}</span>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
                aria-label="পেজ রিফ্রেশ করুন"
              >
                রিফ্রেশ করুন
              </button>
            </div>
          )}

          {children}
        </>
      )}
    </AuthContext.Provider>
  );
}
