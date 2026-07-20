import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LogOut, Menu, X, ChefHat, Bell, LucideIcon, Wallet } from "lucide-react";
import { useState } from "react";
import { cn } from "../../utils/cn";
import AlertsBanner from "./AlertsBanner";

export interface NavItem {
    path: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

interface DashboardLayoutProps {
    basePath: string;
    panelLabel: string;
    roleLabel: string;
    navItems: NavItem[];
    accentGradient: string;
    accentGlow: string;
}

export default function DashboardLayout({
    basePath,
    panelLabel,
    roleLabel,
    navItems,
    accentGradient,
    accentGlow,
}: DashboardLayoutProps) {
    const { currentUser, logoutUser } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);

    const isActive = (path: string) => {
        if (path === basePath) return location.pathname === basePath;
        return location.pathname.startsWith(path);
    };

    const currentPage = navItems.find((item) => isActive(item.path));

    const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.08]" style={{ padding: "16px 18px" }}>
                {!collapsed ? (
                    <Link to="/" className="flex items-center gap-3">
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
                                {panelLabel}
                            </p>
                        </div>
                    </Link>
                ) : (
                    <Link to="/">
                        <img
                            src="/logo.png"
                            alt="logo"
                            style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px' }}
                        />
                    </Link>
                )}
            </div>

            {!collapsed && (
                <div style={{ padding: "24px 20px 8px" }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Main Menu</p>
                </div>
            )}

            <nav style={{ flex: 1, overflowY: "auto", padding: "4px 12px 8px" }}>
                {navItems.map(({ path, label, icon: Icon, color }) => {
                    const active = isActive(path);
                    return (
                        <Link
                            key={path}
                            to={path}
                            onClick={() => setSidebarOpen(false)}
                            title={collapsed ? label : ""}
                            className={cn(
                                "relative flex items-center gap-3 rounded-xl transition-all duration-200",
                                collapsed && "justify-center",
                                active ? "border" : "border border-transparent hover:bg-white/[0.05]"
                            )}
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
                            {!collapsed && (
                                <span
                                    className="truncate text-sm font-semibold"
                                    style={{ color: active ? color : "rgba(255,255,255,0.65)" }}
                                >
                                    {label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {!collapsed && (
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.05] p-3">
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ background: accentGradient }}
                        >
                            {currentUser?.name?.charAt(0)?.toUpperCase() || "A"}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white">{currentUser?.name}</p>
                            <p className="text-[11px] text-white/40">{roleLabel}</p>
                            {(currentUser as any)?.balance !== undefined && (
                                <p className="text-[11px] font-bold mt-0.5" style={{ color: '#fbbf24' }}>৳{(currentUser as any).balance || 0}</p>
                            )}
                        </div>
                    </div>
                )}
                <button
                    onClick={logoutUser}
                    className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                        collapsed && "justify-center"
                    )}
                    style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#fca5a5",
                    }}
                >
                    <LogOut size={16} />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#0b1120]">
            {/* Mobile header (always visible in mobile-only view) */}
            <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.08] bg-slate-900/95 backdrop-blur-md" style={{ paddingLeft: "16px", paddingRight: "16px" }}>
                <Link to={basePath} className="flex items-center gap-2">
                    <img
                        src="/logo.png"
                        alt="Uttara Hall Dining"
                        style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }}
                    />
                    <span className="text-sm font-black text-white">
                        <span className="gradient-text">Uttara</span> Dining
                    </span>
                </Link>
                <div className="flex items-center gap-2">
                    {/* Balance chip */}
                    {(currentUser as any)?.balance !== undefined && (
                        <div
                            className="flex items-center gap-1.5 rounded-full text-xs font-bold"
                            style={{
                                background: "rgba(251,191,36,0.12)",
                                border: "1px solid rgba(251,191,36,0.3)",
                                padding: '5px 10px',
                                color: '#fbbf24',
                            }}
                        >
                            <Wallet size={13} />
                            <span>৳{(currentUser as any).balance || 0}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-xl bg-white/[0.06] text-slate-300"
                        style={{ padding: "10px 12px" }}
                    >
                        <Menu size={26} />
                    </button>
                </div>
            </header>

            {/* Mobile drawer (always use mobile drawer) */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex animate-fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative flex h-full w-72 animate-slide-left flex-col border-r border-white/[0.08] bg-[#0f172a]">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            style={{ position: "absolute", right: "14px", top: "14px", background: "rgba(239,68,68,0.85)", border: "none", borderRadius: "8px", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                            <X size={20} color="#ffffff" />
                        </button>
                        <SidebarContent collapsed={false} />
                    </aside>
                </div>
            )}

            {/* Desktop sidebar - COMPLETELY HIDDEN for mobile-only view */}
            <aside className="hidden">
            </aside>

            {/* Main */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {/* Desktop topbar - COMPLETELY HIDDEN for mobile-only view */}
                <header className="hidden">
                </header>

                <main className="min-w-0 flex-1 overflow-y-auto bg-[#0b1120]">
                    {/* Spacer for mobile header */}
                    <div className="h-14 block" />
                    <div style={{ padding: "20px 18px" }}>
                        <AlertsBanner theme="dark" />
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

/** Reusable dark dashboard page shell */
export function DashboardPage({
    title,
    subtitle,
    action,
    children,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white">{title}</h2>
                    {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </div>
    );
}

/** Dark glass table card wrapper */
export function DashboardTableCard({ children, toolbar }: { children: React.ReactNode; toolbar?: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl shadow-xl" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            {toolbar && (
                <div className="border-b border-slate-100 px-5 py-4" style={{ background: "#f8fafc" }}>{toolbar}</div>
            )}
            <div className="overflow-x-auto">{children}</div>
        </div>
    );
}
