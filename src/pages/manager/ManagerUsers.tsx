import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Search, Pencil } from "lucide-react";
import { collection, onSnapshot, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Avatar } from "../../components/admin/UserDisplay";
import { sortUsersByNumericId } from "../../utils/userMapping";
import type { UserDoc } from "../../types";

export default function ManagerUsers() {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<UserDoc[]>([]);
    const [editUser, setEditUser] = useState<UserDoc | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc));
            setUsers(sortUsersByNumericId(usersData));
        });
        return () => unsubscribe();
    }, []);


    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col gap-4">
                <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>Manage Users</h2>
                    <p className="text-xs text-slate-500 mt-1">View, edit, search, and manage funds for Uttara Dining users</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                            type="text"
                            placeholder="Search by ID, name, email, room, hall..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ marginTop: "10px" }}>
                <div className="overflow-x-auto">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Room No.</th>
                                <th>Role</th>
                                <th>Balance</th>

                            </tr>
                        </thead>
                        <tbody>
                            {users.filter(user => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return (
                                    user.name?.toLowerCase().includes(query) ||
                                    user.email?.toLowerCase().includes(query) ||
                                    String(user.userId || '').includes(query)
                                );
                            }).length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-slate-400 text-sm py-8">
                                        {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                users.filter(user => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                        user.name?.toLowerCase().includes(query) ||
                                        user.email?.toLowerCase().includes(query) ||
                                        String(user.userId || '').includes(query)
                                    );
                                }).map((user) => (
                                    <tr key={user.id} onClick={() => setEditUser(user)} style={{ cursor: "pointer" }} className="hover:bg-orange-50 transition-colors">
                                        <td className="whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-slate-700">
                                                {user.userId ?? "—"}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={user.name} email={user.email} />
                                                <span className="text-sm font-semibold text-slate-800">
                                                    {user.name || user.email?.split("@")[0] || "—"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="text-sm text-slate-600">{user.email}</div>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span className="text-sm font-semibold text-slate-700">
                                                {user.roomNumber || <span className="text-slate-300 italic">—</span>}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full capitalize border ${
                                                user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                user.role === 'manager' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-200'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="text-sm font-extrabold text-slate-800">৳{user.balance || 0}</div>
                                        </td>
                                        <td className="whitespace-nowrap text-right text-sm font-semibold space-x-2">
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editUser && (
                <EditUserModal
                    user={editUser}
                    onClose={() => setEditUser(null)}
                    onSaved={(updated) => {
                        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
                        setEditUser(null);
                    }}
                />
            )}
        </div>
    );
}

function EditUserModal({ user, onClose, onSaved }: { user: UserDoc, onClose: () => void, onSaved: (u: Partial<UserDoc> & { id: string }) => void }) {
    const [role, setRole] = useState(user.role || "student");
    const [name, setName] = useState(user.name || "");
    const [phone, setPhone] = useState(user.phone || "");
    const [roomNumber, setRoomNumber] = useState(user.roomNumber || "");
    const [registrationNumber, setRegistrationNumber] = useState(user.registrationNumber || "");
    const [departmentName, setDepartmentName] = useState(user.departmentName || "");
    const [hallName, setHallName] = useState(user.hallName || "");
    const [password, setPassword] = useState((user as any).password || "");
    const [email, setEmail] = useState(user.email || "");
    const [balance, setBalance] = useState(user.balance || 0);
    const [saving, setSaving] = useState(false);

    const roles = ["student", "manager", "admin"];

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = { role, name, phone, roomNumber, registrationNumber, departmentName, hallName, password, email, balance: Number(balance) };
            await updateDoc(doc(db, "users", user.id), updates);
            onSaved({ id: user.id, ...updates });
        } catch (e) {
            console.error(e);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh", paddingLeft: "16px", paddingRight: "16px", backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", width: "100%", maxWidth: "440px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
                    <h3 style={{ fontWeight: 800, fontSize: "18px", color: "#0f172a", margin: 0 }}>Edit User</h3>
                    <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "6px", borderRadius: "50%", display: "flex" }}>✕</button>
                </div>

                {/* User info */}
                <div style={{ padding: "20px 24px 0", maxHeight: "65vh", overflowY: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px", backgroundColor: "#fff7ed", borderRadius: "12px", border: "1px solid #ffedd5", marginBottom: "20px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "18px", flexShrink: 0 }}>
                            {(user.name || user.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a", margin: 0 }}>{user.name || "—"}</p>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "3px 0 0" }}>ID: {user.userId || "—"} | Rm: {user.roomNumber || "—"}</p>
                        </div>
                    </div>

                    {/* Name & Email */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Email</label>
                            <input
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Phone</label>
                            <input
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Password/PIN</label>
                            <input
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Reg. Number</label>
                            <input
                                value={registrationNumber}
                                onChange={e => setRegistrationNumber(e.target.value)}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Department</label>
                            <input
                                value={departmentName}
                                onChange={e => setDepartmentName(e.target.value)}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Hall Name</label>
                            <input
                                value={hallName}
                                onChange={e => setHallName(e.target.value)}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Current Balance (৳)</label>
                            <input
                                type="number"
                                value={balance}
                                onChange={e => setBalance(Number(e.target.value))}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "10px" }}>Role</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                            {roles.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRole(r)}
                                    style={{
                                        flex: 1, padding: "10px 8px", borderRadius: "10px", border: `2px solid ${role === r ? (r === 'admin' ? '#9333ea' : r === 'manager' ? '#3b82f6' : '#10b981') : '#e2e8f0'}`,
                                        backgroundColor: role === r ? (r === 'admin' ? '#faf5ff' : r === 'manager' ? '#eff6ff' : '#f0fdf4') : '#fff',
                                        color: role === r ? (r === 'admin' ? '#9333ea' : r === 'manager' ? '#3b82f6' : '#10b981') : '#64748b',
                                        fontWeight: 700, fontSize: "13px", cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s"
                                    }}
                                >
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", gap: "10px", padding: "16px 24px", borderTop: "1px solid #f1f5f9" }}>
                    <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", backgroundColor: "#f97316", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
