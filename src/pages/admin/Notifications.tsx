import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { sendNotification, deactivateNotification, savePermanentNotice } from "../../services/db";
import { Button } from "../../components/ui/Button";
import { Input, Textarea, Select, FormField } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { DashboardPage, DashboardTableCard } from "../../components/layout/DashboardLayout";
import { Bell, Megaphone, Pin, Send, Trash2 } from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useEffect } from "react";
import { formatDateBD } from "../../utils/date";
import type { AppNotification, PermanentNotice } from "../../types";

export default function Notifications() {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [permanentNotice, setPermanentNotice] = useState<PermanentNotice | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("info");

    const [noticeMessage, setNoticeMessage] = useState("");
    const [paymentNumber, setPaymentNumber] = useState("");
   

    useEffect(() => {
        const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, "settings"),
            (snap) => {
                const doc = snap.docs.find((d) => d.id === "permanentNotice");
                if (doc) setPermanentNotice({ id: doc.id, ...doc.data() } as PermanentNotice);
            }
        );
        return () => unsub();
    }, []);

    const openNoticeModal = () => {
        setNoticeMessage(permanentNotice?.message || "");
        setPaymentNumber(permanentNotice?.paymentNumber || "");
        
        setIsNoticeModalOpen(true);
    };

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;
        setLoading(true);
        try {
            await sendNotification({
                title: title.trim(),
                message: message.trim(),
                type,
                targetRole: "student",
                createdBy: currentUser!.uid,
                createdByName: currentUser!.name,
                active: true,
            });
            setTitle("");
            setMessage("");
            setType("info");
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            alert("Failed to send notification");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noticeMessage.trim()) return;
        setLoading(true);
        try {
            await savePermanentNotice({
                message: noticeMessage.trim(),
                paymentNumber: paymentNumber.trim(),
                paymentMethod,
                updatedBy: currentUser!.uid,
                updatedByName: currentUser!.name,
            });
            setIsNoticeModalOpen(false);
        } catch (err) {
            console.error(err);
            alert("Failed to save permanent notice");
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm("Remove this notification from student dashboards?")) return;
        await deactivateNotification(id);
    };

    return (
        <DashboardPage
            title="Notifications"
            subtitle="Broadcast alerts to students and manage the permanent payment notice"
            action={
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={openNoticeModal} className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                        
                        Permanent Notice
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Send size={16} className="mr-2" />
                        Send Notification
                    </Button>
                </div>
            }
        >
            {permanentNotice?.active !== false && permanentNotice?.message && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                            <Pin size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-300">Active Permanent Notice</p>
                            <p className="mt-1 text-sm text-amber-100/90">{permanentNotice.message}</p>
                            {permanentNotice.paymentNumber && (
                                <p className="mt-2 font-mono text-xs text-amber-200/70">
                                    {permanentNotice.paymentMethod}: {permanentNotice.paymentNumber}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <DashboardTableCard>
                <table className="admin-table admin-table-dark">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Title</th>
                            <th>Message</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {notifications.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                                    No notifications sent yet
                                </td>
                            </tr>
                        ) : (
                            notifications.map((n) => (
                                <tr key={n.id}>
                                    <td className="whitespace-nowrap text-sm text-slate-400">
                                        {n.createdAt ? formatDateBD(n.createdAt) : "—"}
                                    </td>
                                    <td className="whitespace-nowrap text-sm font-semibold text-white">{n.title}</td>
                                    <td className="max-w-xs truncate text-sm text-slate-400">{n.message}</td>
                                    <td>
                                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-bold capitalize text-violet-300">
                                            {n.type || "info"}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                                                n.active
                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                    : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                                            }`}
                                        >
                                            {n.active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        {n.active && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeactivate(n.id)}
                                                className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                            >
                                                <Trash2 size={14} className="mr-1" />
                                                Remove
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </DashboardTableCard>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Send Notification"
                subtitle="Students will see this instantly on their dashboard"
                size="md"
            >
                <form onSubmit={handleSendNotification} className="space-y-4">
                    <FormField label="Title">
                        <Input variant="dark" icon={Bell} value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Menu update" />
                    </FormField>
                    <FormField label="Type">
                        <Select variant="dark" value={type} onChange={(e) => setType(e.target.value)}>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="success">Success</option>
                            <option value="urgent">Urgent</option>
                        </Select>
                    </FormField>
                    <FormField label="Message">
                        <Textarea variant="dark" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Write your message to all students…" />
                    </FormField>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Sending…" : "Send Notification"}
                    </Button>
                </form>
            </Modal>

            <Modal
                isOpen={isNoticeModalOpen}
                onClose={() => setIsNoticeModalOpen(false)}
                title="Permanent Notice"
                subtitle="Pinned at the top of every student dashboard"
                size="md"
            >
                <form onSubmit={handleSaveNotice} className="space-y-4">
                    <FormField label="Notice Message" >
                        <Textarea variant="dark" rows={5} value={noticeMessage} onChange={(e) => setNoticeMessage(e.target.value)} required />
                    </FormField>
                    
                    <Button type="submit" className="w-full" disabled={loading} style={{padding: '5px 12px'}}>
                        <Megaphone size={16} className="mr-2" />
                        {loading ? "Saving…" : "Save Permanent Notice"}
                    </Button>
                </form>
            </Modal>
        </DashboardPage>
    );
}
