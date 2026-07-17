import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Home, Clock, Wallet, User } from "lucide-react";
import Footer from "./Footer";
import Header, { STUDENT_NAV } from "./Header";
import AlertsBanner from "./AlertsBanner";

const NAV_ITEMS = [
    { to: "/student",            icon: Home,   label: "Home"    },
    { to: "/student/history",    icon: Clock,  label: "Orders"  },
    { to: "/student/withdrawal", icon: Wallet, label: "Wallet"  },
    { to: "/student/profile",    icon: User,   label: "Profile" },
];

export default function StudentLayout() {
    const { currentUser } = useAuth();
    const location = useLocation();

    return (
        <div
            className="min-h-screen flex flex-col w-full"
            style={{ background: "var(--bg-base)" }}
        >
            {/* ── Top Header ── */}
            <Header variant="student" />

            <div className="w-full max-w-[1200px] mx-auto px-5 mt-4">
                <AlertsBanner />
            </div>

            <main className="flex-1 w-full pb-24 md:pb-8 flex flex-col">
                <div className="w-full max-w-[1200px] mx-auto px-5">
                    <Outlet />
                </div>

                {/* ════ FOOTER ════ */}
                <Footer />
            </main>

            {/* ── Bottom Navigation (Mobile-Native) ── */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-50 bg-white md:hidden"
                style={{
                    borderTop: "1px solid #e2e8f0",
                    height: "var(--bottom-nav-height)",
                    paddingBottom: "env(safe-area-inset-bottom, 0px)",
                    boxShadow: "0 -2px 10px rgba(0,0,0,0.04)"
                }}
            >
                <div className="h-full max-w-[540px] mx-auto grid grid-cols-4 items-center">
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                        const isActive =
                            to === "/student"
                                ? location.pathname === "/student"
                                : location.pathname.startsWith(to);

                        return (
                            <Link
                                key={to}
                                to={to}
                                className="flex flex-col items-center justify-center gap-1 py-2 relative transition-all duration-200 active:scale-95"
                            >
                                {/* Active indicator dot */}
                                {isActive && (
                                    <span
                                        className="absolute top-1.5 w-1 h-1 rounded-full animate-fade-in"
                                        style={{ background: "var(--brand-primary)" }}
                                    />
                                )}

                                {/* Icon container */}
                                <div
                                    className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 ${
                                        isActive ? "scale-110" : "scale-100"
                                    }`}
                                    style={
                                        isActive
                                            ? {
                                                  background: "linear-gradient(135deg, #f97316, #fbbf24)",
                                                  boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
                                              }
                                            : {
                                                  background: "rgba(15,23,42,0.05)",
                                              }
                                    }
                                >
                                    <Icon
                                        size={18}
                                        style={{ color: isActive ? "#ffffff" : "var(--text-muted)" }}
                                    />
                                </div>

                                {/* Label */}
                                <span
                                    className="text-[10px] font-semibold transition-colors duration-200"
                                    style={{ color: isActive ? "var(--brand-primary)" : "var(--text-muted)" }}
                                >
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
