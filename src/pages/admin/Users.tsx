import { useState, useEffect } from "react";
import { updateUserBalance, backfillUserIds } from "../../services/db";
import { promoteUserToAdmin } from "../../services/functions";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { Avatar } from "../../components/admin/UserDisplay";
import { sortUsersByNumericId } from "../../utils/userMapping";
import { DollarSign, Edit, Search, Database } from "lucide-react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../services/firebase";
import type { UserDoc } from "../../types";

export default function Users() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [amount, setAmount] = useState("");
    const [transactionType, setTransactionType] = useState("add");
    const [profileData, setProfileData] = useState<Partial<UserDoc>>({});
    const [loading, setLoading] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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

    const handleEditProfile = (user) => {
        setEditingUser(user);
        setProfileData({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: user.password || '',
            roomNumber: user.roomNumber || '',
            registrationNumber: user.registrationNumber || '',
            departmentName: user.departmentName || '',
            hallName: user.hallName || ''
        });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        setLoading(true);
        try {
            const { doc, updateDoc, collection, getDocs, query, where } = await import('firebase/firestore');
            const usersRef = collection(db, 'users');

            // 1. Check Phone Uniqueness
            if (profileData.phone) {
                const phoneQuery = query(usersRef, where("phone", "==", profileData.phone));
                const phoneSnapshot = await getDocs(phoneQuery);
                const isDuplicatePhone = phoneSnapshot.docs.some(d => d.id !== editingUser.id);
                if (isDuplicatePhone) {
                    alert("Error: This Mobile Number is already used by another person!");
                    setLoading(false);
                    return;
                }
            }

            // 2. Check Email Uniqueness
            if (profileData.email) {
                const emailQuery = query(usersRef, where("email", "==", profileData.email.toLowerCase()));
                const emailSnapshot = await getDocs(emailQuery);
                const isDuplicateEmail = emailSnapshot.docs.some(d => d.id !== editingUser.id);
                if (isDuplicateEmail) {
                    alert("Error: This Email is already used by another person!");
                    setLoading(false);
                    return;
                }
            }

            // Make sure email is saved in lowercase if edited
            const dataToSave = { ...profileData };
            if (dataToSave.email) {
                dataToSave.email = dataToSave.email.toLowerCase();
            }

            await updateDoc(doc(db, 'users', editingUser.id), dataToSave);
            alert("Profile updated successfully!");
            setEditingUser(null);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

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
                                <th>Hall Name</th>
                                <th>Role</th>
                                <th>Balance</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-slate-500 text-sm">
                                        {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => handleEditProfile(user)}
                                        className="cursor-pointer"
                                    >
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
                                                handleEditProfile(user);
                                            }}
                                            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                        >
                                            <Edit size={16} className="mr-1 inline" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedUser(user);
                                                setAmount("");
                                                setTransactionType("add");
                                            }}
                                            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                        >
                                            <DollarSign size={16} className="mr-1 inline" />
                                            Manage Funds
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

            {/* Edit Profile Modal */}
            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title={`Edit Profile: ${editingUser?.name}`}
            >
                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "4px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Full Name</label>
                        <Input
                            type="text"
                            value={profileData.name || ''}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Email Address</label>
                        <Input
                            type="email"
                            value={profileData.email || ''}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Mobile Number</label>
                            <Input
                                type="text"
                                value={profileData.phone || ''}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                placeholder="017XXXXXXXX"
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Password / PIN</label>
                            <Input
                                type="text"
                                value={profileData.password || ''}
                                onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Room Number</label>
                            <Input
                                type="text"
                                value={profileData.roomNumber || ''}
                                onChange={(e) => setProfileData({ ...profileData, roomNumber: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Registration No.</label>
                            <Input
                                type="text"
                                value={profileData.registrationNumber || ''}
                                onChange={(e) => setProfileData({ ...profileData, registrationNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Department</label>
                        <Input
                            type="text"
                            value={profileData.departmentName || ''}
                            onChange={(e) => setProfileData({ ...profileData, departmentName: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px", color: "rgba(255,255,255,0.85)" }}>Hall Name</label>
                        <Input
                            type="text"
                            value={profileData.hallName || ''}
                            onChange={(e) => setProfileData({ ...profileData, hallName: e.target.value })}
                        />
                    </div>

                    <div style={{ background: "rgba(56, 189, 248, 0.1)", padding: "12px 14px", borderRadius: "10px", fontSize: "13px", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)", marginTop: "4px" }}>
                        ℹ️ Student ID ({editingUser?.idNumber}) is auto-generated and cannot be modified.
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                        style={{ padding: "12px", fontSize: "14px" }}
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
