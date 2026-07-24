import { useState, useEffect } from "react";
import { updateUserBalance, backfillUserIds } from "../../services/db";
import { promoteUserToAdmin } from "../../services/functions";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { Avatar } from "../../components/admin/UserDisplay";
import { sortUsersByNumericId } from "../../utils/userMapping";
import { DollarSign, Edit, Search, Database, Trash2 } from "lucide-react";
import { collection, onSnapshot, query, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import type { UserDoc } from "../../types";

export default function Users() {
    const [users, setUsers] = useState<UserDoc[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null);
    const [editUser, setEditUser] = useState<UserDoc | null>(null);
    const [amount, setAmount] = useState("");
    const [transactionType, setTransactionType] = useState("add");
    const [loading, setLoading] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        // Real-time listener for users
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc));
            setUsers(sortUsersByNumericId(usersData));
        }, (error) => {
            console.error("Error syncing users:", error);
        });

        return () => unsubscribe();
    }, []);

    const handleBackfill = async () => {
        if (!confirm("Are you sure you want to run the User ID migration? This will assign sequential numerical IDs to all users in the database and reset the register counter.")) return;
        setMigrating(true);
        try {
            const count = await backfillUserIds();
            alert(`Successfully backfilled ${count} users!`);
        } catch (error: any) {
            console.error("Migration failed:", error);
            alert("Migration failed: " + error.message);
        } finally {
            setMigrating(false);
        }
    };

    const handleBalanceUpdate = async (e) => {
        e.preventDefault();
        if (!selectedUser || !amount) return;

        setLoading(true);
        try {
            const finalAmount = transactionType === 'deduct' ? -Number(amount) : Number(amount);
            const description = transactionType === 'deduct' ? "Admin deducted balance" : "Admin added balance";

            await updateUserBalance(selectedUser.id, finalAmount, description);

            // No need to fetchUsers() because onSnapshot will auto-update
            setSelectedUser(null);
            setAmount("");
            setTransactionType("add");
        } catch (error) {
            console.error("Error updating balance:", error);
            alert("Failed to update balance");
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (user, newRole) => {
        if (newRole === user.role) return; // No change

        const roleNames = { student: 'Student', manager: 'Manager', admin: 'Admin' };
        if (!confirm(`Change ${user.name}'s role from ${roleNames[user.role]} to ${roleNames[newRole]}?`)) return;

        setLoading(true);
        try {
            if (newRole === 'admin') {
                await promoteUserToAdmin(user.id);
            } else {
                const { doc, updateDoc } = await import('firebase/firestore');
                await updateDoc(doc(db, 'users', user.id), { role: newRole });
            }
            alert(`User role updated to ${roleNames[newRole]} successfully!`);
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Failed to update role: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // The Edit Profile validation and saving logic is now handled inside the EditUserModal component.

    // Filter users based on search query
    const filteredUsers = users.filter(user => {
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase();
        return (
            user.name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.phone?.toLowerCase().includes(query) ||
            user.idNumber?.toLowerCase().includes(query) ||
            user.registrationNumber?.toLowerCase().includes(query) ||
            user.departmentName?.toLowerCase().includes(query) ||
            user.hallName?.toLowerCase().includes(query) ||
            user.roomNumber?.toLowerCase().includes(query) ||
            String(user.userId || "").includes(query)
        );
    });

    // Handle Bulk Deletion
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        
        const isConfirmed = window.confirm(
            `⚠️ Are you sure you want to delete ${selectedIds.length} user(s)?\n\nThis will permanently remove their records from the database.`
        );
        
        if (!isConfirmed) return;
        
        setLoading(true);
        try {
            const deletePromises = selectedIds.map(id => deleteDoc(doc(db, "users", id)));
            await Promise.all(deletePromises);
            alert(`✅ Successfully deleted ${selectedIds.length} user(s).`);
            setSelectedIds([]); // Clear selection after successful deletion
        } catch (error: any) {
            console.error("Bulk delete error:", error);
            alert("❌ Failed to delete users: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle Single Deletion
    const handleSingleDelete = async (user: UserDoc) => {
        const isConfirmed = window.confirm(
            `⚠️ Are you sure you want to delete ${user.name || user.email || 'this user'}?\n\nThis action cannot be undone.`
        );
        
        if (!isConfirmed) return;
        
        setLoading(true);
        try {
            await deleteDoc(doc(db, "users", user.id));
            // alert(`✅ Successfully deleted user.`);
        } catch (error: any) {
            console.error("Delete error:", error);
            alert("❌ Failed to delete user: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Toggle Checkbox Selection
    const toggleSelection = (userId: string) => {
        setSelectedIds(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleAllSelection = () => {
        if (selectedIds.length === filteredUsers.length && filteredUsers.length > 0) {
            setSelectedIds([]); // Deselect all
        } else {
            setSelectedIds(filteredUsers.map(u => u.id)); // Select all filtered
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>Manage Users</h2>
                            <span 
                                className="bg-orange-500/20 text-orange-400 rounded-full text-[11px] font-bold border border-orange-500/30"
                                style={{ padding: "4px 12px", letterSpacing: "0.5px", marginTop: "2px" }}
                            >
                                {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">View, edit, search, and manage funds for Uttara Dining users</p>
                    </div>
                    
                    {/* Delete Action Button */}
                    {selectedIds.length > 0 && (
                        <div className="animate-fade-in-up">
                            <Button 
                                onClick={handleBulkDelete}
                                disabled={loading}
                                className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg"
                                size="sm"
                            >
                                {loading ? "Deleting..." : (
                                    <>
                                        <Trash2 size={16} className="mr-2 inline" />
                                        Delete {selectedIds.length} Selected
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
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
                                <th style={{ width: "40px", textAlign: "center" }}>
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                        checked={selectedIds.length > 0 && selectedIds.length === filteredUsers.length}
                                        onChange={toggleAllSelection}
                                        disabled={filteredUsers.length === 0}
                                    />
                                </th>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Room No.</th>
                                <th>Hall Name</th>
                                <th>Role</th>
                                <th>Balance</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center text-slate-500 text-sm">
                                        {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => setEditUser(user)}
                                        className={`cursor-pointer transition-colors ${selectedIds.includes(user.id) ? 'bg-orange-50/80' : 'hover:bg-orange-50'}`}
                                    >
                                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox"
                                                className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                                checked={selectedIds.includes(user.id)}
                                                onChange={() => toggleSelection(user.id)}
                                            />
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span
                                                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                                                
                                            >
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
                                    <td className="whitespace-nowrap text-sm text-slate-600">
                                        {user.hallName || '—'}
                                    </td>
                                    <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user, e.target.value)}
                                            className="px-2.5 py-1 rounded-xl text-xs font-bold capitalize bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-orange-500/60"
                                        >
                                            <option value="student">Student</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <div className="text-sm font-extrabold text-slate-800">৳{user.balance || 0}</div>
                                    </td>
                                    <td className="whitespace-nowrap text-right text-sm font-semibold space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSingleDelete(user);
                                            }}
                                            className="bg-white border border-red-200 text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 size={16} className="mr-1 inline" />
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            <Modal
                isOpen={!!selectedUser}
                onClose={() => {
                    setSelectedUser(null);
                    setAmount("");
                    setTransactionType("add");
                }}
                title={`Manage Balance: ${selectedUser?.name}`}
            >
                <form onSubmit={handleBalanceUpdate} style={{ display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "4px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Action</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => setTransactionType("add")}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${transactionType === "add"
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                                    }`}
                            >
                                Add Funds
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransactionType("deduct")}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${transactionType === "deduct"
                                    ? "bg-red-100 text-red-700 border border-red-200"
                                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                                    }`}
                            >
                                Deduct Funds
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Amount (৳)</label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            min="1"
                            placeholder="Enter amount"
                        />
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "12px 14px", borderRadius: "10px", fontSize: "14px", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <p>Current Balance: <span style={{ fontWeight: "bold", color: "#38bdf8" }}>৳{selectedUser?.balance || 0}</span></p>
                        {amount && (
                            <p style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                                New Balance: <span style={{ fontWeight: "bold", color: transactionType === 'deduct' ? "#f87171" : "#4ade80" }}>
                                    ৳{(selectedUser?.balance || 0) + (transactionType === 'deduct' ? -Number(amount) : Number(amount))}
                                </span>
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className={`w-full ${transactionType === 'deduct' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                        disabled={loading}
                        style={{ padding: "12px", fontSize: "14px" }}
                    >
                        {loading ? "Processing..." : (transactionType === 'deduct' ? "Deduct Balance" : "Add Balance")}
                    </Button>
                </form>
            </Modal>

            {/* Edit User Modal (Matching Manager Dashboard style) */}
            {editUser && (
                <EditUserModal
                    user={editUser}
                    onClose={() => setEditUser(null)}
                    onManageFunds={() => {
                        setSelectedUser(editUser);
                    }}
                    onSaved={() => {
                        setEditUser(null);
                    }}
                />
            )}
        </div>
    );
}

function EditUserModal({ user, onClose, onSaved, onManageFunds }: { user: UserDoc, onClose: () => void, onSaved: (u: Partial<UserDoc> & { id: string }) => void, onManageFunds?: () => void }) {
    const [role, setRole] = useState(user.role || "student");
    const [name, setName] = useState(user.name || "");
    const [phone, setPhone] = useState(user.phone || "");
    const [roomNumber, setRoomNumber] = useState(user.roomNumber || "");
    const [registrationNumber, setRegistrationNumber] = useState(user.registrationNumber || "");
    const [departmentName, setDepartmentName] = useState(user.departmentName || "");
    const [hallName, setHallName] = useState(user.hallName || "");
    const [password, setPassword] = useState((user as any).password || "");
    const [email, setEmail] = useState(user.email || "");
    const [saving, setSaving] = useState(false);

    // Admin should be able to promote/demote to all roles
    const roles = ["student", "manager", "admin"];

    const handleSave = async () => {
        setSaving(true);
        try {
            const { doc, updateDoc, collection, getDocs, query, where } = await import('firebase/firestore');
            const usersRef = collection(db, 'users');

            // Unique Checks
            if (phone) {
                const phoneQuery = query(usersRef, where("phone", "==", phone));
                const phoneSnapshot = await getDocs(phoneQuery);
                const isDuplicatePhone = phoneSnapshot.docs.some(d => d.id !== user.id);
                if (isDuplicatePhone) {
                    alert("Error: This Mobile Number is already used by another person!");
                    setSaving(false);
                    return;
                }
            }

            if (email) {
                const emailQuery = query(usersRef, where("email", "==", email.toLowerCase()));
                const emailSnapshot = await getDocs(emailQuery);
                const isDuplicateEmail = emailSnapshot.docs.some(d => d.id !== user.id);
                if (isDuplicateEmail) {
                    alert("Error: This Email is already used by another person!");
                    setSaving(false);
                    return;
                }
            }

            const updates = { 
                role, 
                name, 
                phone, 
                roomNumber, 
                registrationNumber, 
                departmentName, 
                hallName, 
                password, 
                email: email.toLowerCase(),
            };
            
            if (role === 'admin' && user.role !== 'admin') {
                await promoteUserToAdmin(user.id); // special function to update custom claims if needed
            } else {
                await updateDoc(doc(db, "users", user.id), updates);
            }
            
            onSaved({ id: user.id, ...updates });
        } catch (e) {
            console.error(e);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "5vh", paddingLeft: "16px", paddingRight: "16px", backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", width: "100%", maxWidth: "440px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
                    <h3 style={{ fontWeight: 800, fontSize: "18px", color: "#0f172a", margin: 0 }}>Edit User Profile</h3>
                    <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "6px", borderRadius: "50%", display: "flex" }}>✕</button>
                </div>

                {/* User info */}
                <div style={{ padding: "16px 20px 0", maxHeight: "75vh", overflowY: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", padding: "12px", backgroundColor: "#fff7ed", borderRadius: "12px", border: "1px solid #ffedd5", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1 }}>
                            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "18px", flexShrink: 0 }}>
                                {(user.name || user.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a", margin: 0 }}>{user.name || "—"}</p>
                                <p style={{ fontSize: "12px", color: "#64748b", margin: "3px 0 0" }}>ID: {user.userId || "—"} | Rm: {user.roomNumber || "—"}</p>
                                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>{user.email}</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <div style={{ backgroundColor: "#fff", border: "1px solid #fed7aa", padding: "8px 12px", borderRadius: "8px", textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <span style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>৳{user.balance || 0}</span>
                            </div>
                            {onManageFunds && (
                                <button 
                                    onClick={onManageFunds}
                                    style={{ backgroundColor: "#f97316", color: "#fff", border: "none", padding: "0 12px", borderRadius: "8px", fontWeight: 700, fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                    <DollarSign size={14} />
                                    Manage
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Name & Email */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>Hall Name</label>
                            <input
                                value={hallName}
                                onChange={e => setHallName(e.target.value)}
                                style={{ width: "100%", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "10px", padding: "11px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>
                        <div></div>
                    </div>

                    {/* Role */}
                    <div style={{ marginBottom: "24px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "10px" }}>Role</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                            {roles.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    style={{
                                        flex: 1, padding: "8px 8px", borderRadius: "10px", border: `2px solid ${role === r ? (r === 'admin' ? '#9333ea' : r === 'manager' ? '#3b82f6' : '#10b981') : '#e2e8f0'}`,
                                        backgroundColor: role === r ? (r === 'admin' ? '#faf5ff' : r === 'manager' ? '#eff6ff' : '#f0fdf4') : '#fff',
                                        color: role === r ? (r === 'admin' ? '#9333ea' : r === 'manager' ? '#3b82f6' : '#10b981') : '#64748b',
                                        fontWeight: 700, fontSize: "13px", cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
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
