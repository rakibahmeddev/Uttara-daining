import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { collection, query, where, orderBy, onSnapshot, doc } from "firebase/firestore";
import { db } from "../services/firebase";
import type { AppNotification, PermanentNotice } from "../types";

interface NotificationsContextType {
    notifications: AppNotification[];
    permanentNotice: PermanentNotice | null;
    unreadCount: number;
    dismissNotification: (id: string) => void;
    dismissedIds: Set<string>;
}

const NotificationsContext = createContext<NotificationsContextType>({
    notifications: [],
    permanentNotice: null,
    unreadCount: 0,
    dismissNotification: () => {},
    dismissedIds: new Set(),
});

export function useNotifications() {
    return useContext(NotificationsContext);
}

const DISMISSED_KEY = "ud_dismissed_notifications";

function loadDismissed(): Set<string> {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function saveDismissed(ids: Set<string>) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function NotificationsProvider({ children, role }: { children: ReactNode; role?: string | null }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [permanentNotice, setPermanentNotice] = useState<PermanentNotice | null>(null);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(loadDismissed);

    useEffect(() => {
        const q = query(
            collection(db, "notifications"),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
            const filtered = all.filter(
                (n) => n.active === true && (!n.targetRole || n.targetRole === "all" || n.targetRole === role)
            );
            setNotifications(filtered);
        }, (err) => console.error("Notifications listener error:", err));

        return () => unsub();
    }, [role]);

    useEffect(() => {
        const noticeRef = doc(db, "settings", "permanentNotice");
        const unsub = onSnapshot(noticeRef, (snap) => {
            if (snap.exists() && snap.data().active !== false) {
                setPermanentNotice({ id: snap.id, ...snap.data() } as PermanentNotice);
            } else {
                setPermanentNotice(null);
            }
        }, () => setPermanentNotice(null));

        return () => unsub();
    }, []);

    const dismissNotification = (id: string) => {
        setDismissedIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            saveDismissed(next);
            return next;
        });
    };

    const visible = notifications.filter((n) => !dismissedIds.has(n.id));

    return (
        <NotificationsContext.Provider
            value={{
                notifications: visible,
                permanentNotice,
                unreadCount: visible.length,
                dismissNotification,
                dismissedIds,
            }}
        >
            {children}
        </NotificationsContext.Provider>
    );
}
