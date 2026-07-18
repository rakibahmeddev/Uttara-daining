import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../services/auth";
import {
    ChefHat,
    Home,
    Clock,
    Wallet,
    User,
    LogOut,
    LogIn,
} from "lucide-react";

// ── Role-based nav items ──────────────────────────────────────
const STUDENT_NAV = [
    { to: "/student",            label: "Meals"    },
    { to: "/student/history",    label: "Orders"  },
    { to: "/student/withdrawal", label: "Wallet"  },
    { to: "/student/profile",    label: "Profile" },
];

const ADMIN_NAV = [
    { to: "/admin",                  label: "Dashboard" },
    { to: "/admin/meals",            label: "Meals" },
    { to: "/admin/orders",           label: "Orders" },
    { to: "/admin/users",            label: "Users" },
    { to: "/admin/balance-requests", label: "Balance" },
    { to: "/admin/reports",          label: "Reports" },
];

const MANAGER_NAV = [
    { to: "/manager",                  label: "Dashboard" },
    { to: "/manager/order",            label: "Order Food" },
    { to: "/manager/meals",            label: "Meals" },
    { to: "/manager/orders",           label: "Orders" },
    { to: "/manager/users",            label: "Users" },
    { to: "/manager/balance-requests", label: "Balance" },
];

const STUDENT_NAV_ICONS = [Home, Clock, Wallet, User];

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
interface HeaderProps {
    /** 'public'  → landing page header (logo + login/user dropdown)
     *  'dashboard' → logged-in header (logo + role-based nav + profile + logout) */
    variant: "public" | "dashboard" | "student"; 

    /** Only needed for 'public' variant: callback to open auth modal */
    onLoginRequest?: () => void;
    /** Callback to open register auth modal */
    onRegisterRequest?: () => void;
    /** Callback to open sidebar */
    onMenuClick?: () => void;
}

// ──────────────────────────────────────────────────────────────
export default function Header({ variant, onLoginRequest, onRegisterRequest, onMenuClick }: HeaderProps) {
    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Derive role and dashboard path
    const role = (currentUser as any)?.role || "student";
    const dashboardPath =
        role === "admin" ? "/admin" : role === "manager" ? "/manager" : "/student";

    // Brand logo destination
    const logoHref = variant === "public" ? "/" : dashboardPath;

    // Get correct nav array based on role
    const navItems = role === "admin" ? ADMIN_NAV : role === "manager" ? MANAGER_NAV : STUDENT_NAV;

    const isDashboard = variant === "dashboard" || variant === "student";

    return (
        <header
            className="sticky top-0 z-50 bg-[#111827] w-full"
            style={{ 
                borderBottom: "1px solid var(--border-color)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            }}
        >
            <div className="h-20 flex items-center justify-between w-full max-w-[1200px] mx-auto" style={{ padding: '0 24px' }}>

                {/* ── Brand ─────────────────────────────── */}
                <div className="flex-1 flex justify-start">
                    <Link to={logoHref} className="flex items-center gap-3 shrink-0">
                        <img
                            src="/logo.png"
                            alt="Uttara Hall Dining"
                            style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '8px' }}
                        />
                        <span className="text-lg font-bold">
                            <span className="gradient-text">Uttara</span>
                            <span className="text-white/90"> Dining</span>
                        </span>
                    </Link>
                </div>

                {/* ── Centre Nav (Desktop) ── */}
                {isDashboard && role !== "student" && (
                    <nav className="hidden md:flex flex-[2] justify-center items-center gap-6 lg:gap-10">
                        {navItems.map(({ to, label }) => {
                            const isActive =
                                (to === "/admin" || to === "/manager" || to === "/student")
                                    ? location.pathname === to
                                    : location.pathname.startsWith(to);
                            return (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`text-[15px] font-semibold transition-all hover:text-white ${
                                        isActive
                                            ? "text-orange-500 font-bold"
                                            : "text-slate-400"
                                    }`}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>
                )}

                {/* ── Right Side ────────────────────────── */}
                <div className="flex-1 flex justify-end items-center gap-3">

                    {/* ── DASHBOARD variant ── */}
                    {isDashboard && (
                        <>
                            {/* Balance chip (For Students and Managers) */}
                            {(role === "student" || role === "manager") && (
                                <div
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                                    style={{
                                        background: "rgba(20,184,166,0.12)",
                                        border: "1px solid rgba(20,184,166,0.25)",
                                        padding: '4px 8px',
                                    }}
                                >
                                    <Wallet size={14} style={{ color: "#fff" }} />
                                    <span style={{ color: "#fff" }}>
                                        ৳{currentUser?.balance || 0}
                                    </span>
                                </div>
                            )}

                            {role === "student" ? (
                                <button
                                    onClick={onMenuClick}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 transition-colors hover:bg-white/[0.06]"
                                    style={{ padding: "8px" }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                                </button>
                            ) : (
                                /* Avatar Dropdown for Admins/Managers */
                                <div className="relative">
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-md border-2 border-[#1e293b]"
                                        style={{ background: "linear-gradient(135deg,#f97316,#fbbf24)" }}
                                    >
                                        {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                                    </button>
                                    
                                    {userMenuOpen && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-40"
                                                onClick={() => setUserMenuOpen(false)}
                                            />
                                            
                                            <div className="absolute right-0 mt-2 w-48 bg-[#1e293b] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                                                <div className="px-4 py-3 border-b border-gray-700 bg-[#111827]/50">
                                                    <p className="text-sm text-white font-bold truncate">{currentUser?.name || "User"}</p>
                                                    <p className="text-xs text-orange-400 font-semibold truncate capitalize">{role}</p>
                                                </div>
                                                
                                                <div className="py-2">
                                                    <Link 
                                                        to={`${dashboardPath}/profile`}
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <User size={16} />
                                                        My Profile
                                                    </Link>
                                                    
                                                    <button
                                                        onClick={() => {
                                                            setUserMenuOpen(false);
                                                            logoutUser();
                                                        }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                                                    >
                                                        <LogOut size={16} />
                                                        Logout
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── PUBLIC variant ── */}
                    {variant === "public" && (
                        <>
                            {currentUser ? (
                                <div className="flex items-center gap-3">
                                    {/* Dashboard Link Pill (Replaces Dropdown) */}
                                    <Link
                                        to={dashboardPath}
                                        className="flex items-center gap-2 rounded-full transition-all hover:scale-105 active:scale-95"
                                        style={{
                                            background: "linear-gradient(135deg,#f97316,#fbbf24)",
                                            padding: "6px 14px 6px 6px",
                                            boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
                                        }}
                                        title="Go to Dashboard"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-sm font-black text-white shrink-0">
                                            {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                                        </div>
                                        <User size={16} className="text-white/90" />
                                    </Link>

                                    {/* Logout Button */}
                                    <div className="relative group">
                                        <button
                                            onClick={async () => {
                                                await logoutUser();
                                                navigate("/");
                                            }}
                                            className="p-2 rounded-xl pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 active:scale-95 transition-all"
                                            aria-label="Logout"
                                        >
                                            <LogOut size={17} />
                                        </button>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block pointer-events-none z-50">
                                            <div className="bg-[#111827] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap tracking-wide relative">
                                                Logout
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111827]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={onRegisterRequest}
                                        className="text-[16px] font-bold transition-all hover:scale-105 active:scale-95 text-white"
                                    >
                                        Register
                                    </button>
                                    <button
                                        onClick={onLoginRequest}
                                        className="flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
                                        style={{
                                            background: "linear-gradient(135deg,#f97316,#fbbf24)",
                                            width: "48px",
                                            height: "48px",
                                            boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
                                        }}
                                        aria-label="Login"
                                    >
                                        <User size={22} className="text-white" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Mobile Bottom Nav Items icon row (student only, shown inside header on scroll) ── */}
            {/* Note: the actual sticky bottom nav is rendered in StudentLayout */}
        </header>
    );
}

// ──────────────────────────────────────────────────────────────
// Named exports for the bottom nav icon list (used by StudentLayout)
// ──────────────────────────────────────────────────────────────
export { STUDENT_NAV, STUDENT_NAV_ICONS };
