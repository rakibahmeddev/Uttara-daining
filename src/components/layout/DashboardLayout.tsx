import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LogOut, Menu, X, ChefHat, Bell, LucideIcon } from "lucide-react";
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
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-5">
                {!collapsed ? (
                    <Link to={basePath} className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: accentGradient, boxShadow: `0 0 20px ${accentGlow}` }}
                        >
                            <ChefHat size={20} className="text-white" />
                        </div>
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
                    <div
                        className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ background: accentGradient }}
                    >
                        <ChefHat size={16} className="text-white" />
                    </div>
                )}
                <button
                    onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                    className="hidden items-center justify-center rounded-lg p-1.5 text-white/35 transition-colors hover:bg-white/[0.06] md:flex"
                >
                    {collapsed ? <Menu size={15} /> : <X size={15} />}
                </button>
            </div>

            {!collapsed && (
                <div className="px-5 pb-2 pt-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Main Menu</p>
                </div>
            )}

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
                {navItems.map(({ path, label, icon: Icon, color }) => {
                    const active = isActive(path);
                    return (
                        <Link
                            key={path}
                            to={path}
                            onClick={() => setSidebarOpen(false)}
                            title={collapsed ? label : ""}
                            className={cn(
                                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                                collapsed && "justify-center",
                                active ? "border" : "border border-transparent hover:bg-white/[0.05]"
                            )}
                            style={active ? { background: `${color}22`, borderColor: `${color}35` } : undefined}
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

            <div className="space-y-2 border-t border-white/[0.08] p-3">
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
            {/* Mobile header */}
            <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.08] bg-slate-900/95 px-4 backdrop-blur-md md:hidden">
                <Link to={basePath} className="flex items-center gap-2">
                    <div
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ background: accentGradient }}
                    >
                        <ChefHat size={15} className="text-white" />
                    </div>
                    <span className="text-sm font-black text-white">
                        <span className="gradient-text">Uttara</span> Dining
                    </span>
                </Link>
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="rounded-xl bg-white/[0.06] p-2 text-slate-300"
                >
                    <Menu size={20} />
                </button>
            </header>

            {/* Mobile drawer */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex animate-fade-in md:hidden">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative flex h-full w-72 animate-slide-left flex-col border-r border-white/[0.08] bg-[#0f172a]">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute right-4 top-4 rounded-lg bg-white/[0.07] p-1.5 text-white/40"
                        >
                            <X size={18} />
                        </button>
                        <SidebarContent collapsed={false} />
                    </aside>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "hidden shrink-0 flex-col border-r border-white/[0.07] bg-[#0f172a] transition-all duration-300 md:flex",
                    desktopCollapsed ? "w-[70px]" : "w-64"
                )}
                style={{ boxShadow: "2px 0 24px rgba(0,0,0,0.25)" }}
            >
                <SidebarContent collapsed={desktopCollapsed} />
            </aside>

            {/* Main */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="admin-topbar hidden h-16 shrink-0 items-center justify-between px-6 md:flex lg:px-8">
                    <div>
                        <h1 className="text-lg font-bold text-white">{currentPage?.label || panelLabel}</h1>
                        <p className="text-xs text-slate-500">
                            {new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to={`${basePath}/notifications`}
                            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <Bell size={16} />
                        </Link>
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ background: accentGradient, boxShadow: `0 0 12px ${accentGlow}` }}
                        >
                            {currentUser?.name?.charAt(0)?.toUpperCase() || "A"}
                        </div>
                    </div>
                </header>

                <main className="min-w-0 flex-1 overflow-y-auto bg-[#0b1120]">
                    <div className="h-14 md:hidden" />
                    <div className="p-4 sm:p-6 lg:p-8">
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
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60 shadow-xl shadow-black/20 backdrop-blur-sm">
            {toolbar && (
                <div className="border-b border-white/[0.06] px-5 py-4">{toolbar}</div>
            )}
            <div className="overflow-x-auto">{children}</div>
        </div>
    );
}
