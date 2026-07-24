import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, Hash, Home, BookOpen, Building2, CreditCard, Shield, AlertTriangle, Trash2 } from "lucide-react";
import { factoryResetData } from "../../services/db";

export default function AdminProfile() {
    const { currentUser } = useAuth();
    const [isCleaning, setIsCleaning] = useState(false);

    if (!currentUser) return <div className="p-8 text-center">Loading profile...</div>;

    const handleCleanup = async () => {
        const confirmed = window.confirm(
            "⚠️ FACTORY RESET DATA:\n\n" +
            "This will permanently delete all data from the following collections:\n" +
            "- Orders\n- Transactions\n- Balance Requests\n- Notifications\n- Reports\n\n" +
            "USERS and MEALS data will NOT be deleted.\n\n" +
            "Are you absolutely sure you want to proceed?"
        );
        
        if (!confirmed) return;

        setIsCleaning(true);
        try {
            const deletedCount = await factoryResetData();
            alert(`✅ Success! Factory reset completed.\nCleaned up ${deletedCount} documents across all collections.\nYour dashboard stats are now reset to 0.`);
        } catch (error: any) {
            console.error("Cleanup error:", error);
            alert("❌ Failed to clean up data: " + error.message);
        } finally {
            setIsCleaning(false);
        }
    };

    const profileFields = [
        { icon: User, label: "Full Name", value: currentUser.name },
        { icon: Mail, label: "Email", value: currentUser.email },
        { icon: Shield, label: "Role", value: "Administrator", highlight: true },
        { icon: Hash, label: "ID Number", value: currentUser.idNumber },
        { icon: Hash, label: "Registration Number", value: currentUser.registrationNumber },
        { icon: Home, label: "Room Number", value: currentUser.roomNumber },
        { icon: BookOpen, label: "Department", value: currentUser.departmentName },
        { icon: Building2, label: "Hall Name", value: currentUser.hallName },
        { icon: CreditCard, label: "Balance", value: `৳${currentUser.balance || 0}`, highlight: true },
    ];

    return (
        <div className="max-w-3xl mx-auto animate-fade-in-up">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white">
                    <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-3xl font-extrabold shadow-inner">
                            {currentUser.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black">{currentUser.name}</h1>
                            <p className="text-orange-100 font-medium capitalize mt-1 flex items-center gap-2">
                                <Shield size={16} />
                                Administrator
                            </p>
                        </div>
                    </div>
                </div>

                {/* Alert */}
                <div className="px-8 py-4 bg-amber-50 border-b border-slate-100">
                    <p className="text-sm text-amber-700">
                        <strong>Administrator Access:</strong> You have full control over the system.
                    </p>
                </div>

                {/* Profile Fields */}
                <div className="p-8 space-y-4">
                    {profileFields.map((field, index) => {
                        const Icon = field.icon;
                        return (
                            <div
                                key={index}
                                className={`flex items-center space-x-4 p-4 rounded-xl border transition-all ${
                                    field.highlight
                                        ? 'bg-orange-50 border-orange-200/50 text-orange-600'
                                        : 'bg-slate-50 border-slate-100'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
                                    field.highlight ? 'bg-orange-100 border-orange-200 text-orange-600' : 'bg-white border-slate-200 text-slate-400'
                                }`}>
                                    <Icon size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{field.label}</p>
                                    <p className={`text-lg font-bold mt-0.5 ${
                                        field.highlight ? 'text-orange-600' : 'text-slate-800'
                                    }`}>
                                        {field.value || 'Not provided'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Danger Zone */}
                <div className="p-8 border-t border-red-100 bg-red-50/30">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-red-700">Danger Zone</h3>
                            <p className="text-sm text-red-600 mt-1 mb-4">
                                Use these administrative tools with extreme caution. These actions are irreversible and will affect live system data.
                            </p>
                            
                            <div className="bg-white border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-800">Factory Reset System Data</h4>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Deletes all Orders, Transactions, Balance Requests, Notifications, and Reports. Preserves Users & Meals.
                                    </p>
                                </div>
                                <button
                                    onClick={handleCleanup}
                                    disabled={isCleaning}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all shadow-sm
                                        ${isCleaning 
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                            : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600'
                                        }
                                    `}
                                >
                                    {isCleaning ? (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                                            Resetting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={18} />
                                            Factory Reset
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
