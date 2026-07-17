import { useAuth } from "../../context/AuthContext";
import { User, Mail, Hash, Home, BookOpen, Building2, CreditCard } from "lucide-react";

export default function ManagerProfile() {
    const { currentUser } = useAuth();

    if (!currentUser) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;

    const profileFields = [
        { icon: User, label: "Full Name", value: currentUser.name },
        { icon: Mail, label: "Email", value: currentUser.email },
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
                <div className="bg-gradient-to-r from-teal-650 to-teal-500 p-8 text-white">
                    <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-3xl font-extrabold shadow-inner">
                            {currentUser.name?.[0]?.toUpperCase() || 'M'}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black">{currentUser.name}</h1>
                            <p className="text-teal-100 font-medium capitalize mt-0.5">{currentUser.role}</p>
                        </div>
                    </div>
                </div>

                {/* Alert */}
                <div className="px-8 py-4 bg-teal-50 border-b border-slate-100">
                    <p className="text-sm text-teal-700">
                        <strong>Note:</strong> This information can only be updated by an administrator. If you need to change any details, please contact the admin.
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
                                        ? 'bg-teal-50 border-teal-200/50 text-teal-700'
                                        : 'bg-slate-50 border-slate-100'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
                                    field.highlight ? 'bg-teal-100 border-teal-200 text-teal-600' : 'bg-white border-slate-200 text-slate-400'
                                }`}>
                                    <Icon size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{field.label}</p>
                                    <p className={`text-lg font-bold mt-0.5 ${
                                        field.highlight ? 'text-teal-600' : 'text-slate-800'
                                    }`}>
                                        {field.value || 'Not provided'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
