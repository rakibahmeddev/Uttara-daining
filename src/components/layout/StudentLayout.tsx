import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Home, Clock, Wallet, User, X, LogOut, ChefHat, Truck } from "lucide-react";
import { logoutUser } from "../../services/auth";
import Footer from "./Footer";
import Header, { STUDENT_NAV } from "./Header";
import AlertsBanner from "./AlertsBanner";

const NAV_ITEMS = [
    { to: "/student",            icon: Home,   label: "Home"    },
    { to: "/student/history",    icon: Clock,  label: "Orders"  },
    { to: "/student/rider-delivery", icon: Truck, label: "My Delivery" },
    { to: "/student/withdrawal", icon: Wallet, label: "Balance"  },
    { to: "/student/profile",    icon: User,   label: "Profile" },
];

export default function StudentLayout() {
    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div
            className="min-h-screen flex flex-col w-full relative overflow-x-hidden"
            style={{ background: "var(--bg-base)" }}
        >
            {/* ── Top Header ── */}
            <Header variant="student" onMenuClick={() => setSidebarOpen(true)} />

            {/* ── Mobile/Desktop Sidebar Drawer ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-[60] flex animate-fade-in">
                    <div 
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
                        onClick={() => setSidebarOpen(false)} 
                    />
                    <aside className="relative flex h-full w-72 animate-slide-left flex-col border-r border-white/[0.08] bg-[#0f172a] shadow-2xl">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            style={{ position: "absolute", right: "14px", top: "14px", background: "rgba(239,68,68,0.85)", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                            <X size={20} color="#ffffff" />
                        </button>
                        
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b border-white/[0.08]" style={{ padding: "16px 18px" }}>
                                <Link to="/student" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3">
                                    <img
                                        src="/logo.png"
                                        alt="Uttara Hall Dining"
                                        style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }}
                                    />
                                    <div>
                                        <p className="text-base font-black leading-tight tracking-tight">
                                            <span className="gradient-text">Uttara</span>
                                            <span className="text-white"> Dining</span>
                                        </p>
                                        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                                            Student Portal
                                        </p>
                                    </div>
                                </Link>
                            </div>

                            <div style={{ padding: "24px 20px 8px" }}>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Main Menu</p>
                            </div>

                            <nav style={{ padding: "4px 12px 8px" }}>
                                {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
                                    const active =
                                        to === "/student"
                                            ? location.pathname === "/student"
                                            : location.pathname.startsWith(to);
                                    const color = "#f97316";
                                    return (
                                        <Link
                                            key={to}
                                            to={to}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
                                                active ? "border" : "border border-transparent hover:bg-white/[0.05]"
                                            }`}
                                            style={active
                                                ? { background: `${color}22`, borderColor: `${color}35`, padding: "12px 14px", marginBottom: "4px" }
                                                : { padding: "12px 14px", marginBottom: "4px" }
                                            }
                                        >
                                            {active && (
                                                <span
                                                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                                                    style={{ background: color }}
                                                />
                                            )}
                                            <div
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all"
                                                style={{ background: active ? `${color}25` : "rgba(255,255,255,0.07)" }}
                                            >
                                                <Icon size={16} style={{ color: active ? color : "rgba(255,255,255,0.45)" }} />
                                            </div>
                                            <span
                                                className="truncate text-sm font-semibold"
                                                style={{ color: active ? color : "rgba(255,255,255,0.65)" }}
                                            >
                                                {label}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: "10px", flexShrink: 0 }}>
                                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.05] p-3">
                                    <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                                        style={{ background: "linear-gradient(135deg,#f97316,#fbbf24)" }}
                                    >
                                        {currentUser?.name?.charAt(0)?.toUpperCase() || "S"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-white">{currentUser?.name}</p>
                                        <p className="text-[11px] text-white/40">Student</p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        setSidebarOpen(false);
                                        await logoutUser();
                                        navigate("/");
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200"
                                    style={{
                                        background: "rgba(239,68,68,0.1)",
                                        border: "1px solid rgba(239,68,68,0.2)",
                                        color: "#fca5a5",
                                    }}
                                >
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            <div className="w-full max-w-[1200px] mx-auto px-5 mt-4">
                <AlertsBanner />
            </div>

            <main className="flex-1 w-full pb-8 flex flex-col">
                <div className="w-full max-w-[1200px] mx-auto px-5">
                    <Outlet />
                </div>

                {/* ════ FOOTER ════ */}
                <Footer />
            </main>


        </div>
    );
}
