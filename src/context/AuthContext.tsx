import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";

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

interface AuthContextType {
    currentUser: AppUser | null;
    userRole: string | null;
    loading: boolean;
    logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    userRole: null,
    loading: true,
    logoutUser: async () => {},
});

export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        let userUnsub: (() => void) | null = null;

        const timeoutId = setTimeout(() => {
            if (mounted && loading) setLoading(false);
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!mounted) return;
            clearTimeout(timeoutId);

            if (userUnsub) {
                userUnsub();
                userUnsub = null;
            }

            try {
                if (user) {
                    setCurrentUser(user as AppUser);

                    const userRef = doc(db, "users", user.uid);
                    userUnsub = onSnapshot(
                        userRef,
                        (userDoc) => {
                            if (!mounted) return;
                            if (userDoc.exists()) {
                                const userData = userDoc.data();
                                setUserRole(userData.role || "student");
                                setCurrentUser({ ...user, ...userData } as AppUser);
                            } else {
                                setUserRole("student");
                            }
                            setLoading(false);
                        },
                        (dbError) => {
                            console.error("Error syncing user data:", dbError);
                            setUserRole("student");
                            setLoading(false);
                        }
                    );
                } else {
                    setCurrentUser(null);
                    setUserRole(null);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            unsubscribe();
            if (userUnsub) userUnsub();
        };
    }, []);

    const value: AuthContextType = {
        currentUser,
        userRole,
        loading,
        logoutUser: async () => {
            await auth.signOut();
        },
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex h-screen items-center justify-center bg-[#0b1120]">
                    <div className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
                        <p className="text-slate-400">Loading...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
