import DashboardLayout, { type NavItem } from "./DashboardLayout";
import {
    LayoutDashboard,
    Utensils,
    ShoppingBag,
    Users,
    FileText,
    DollarSign,
    Bell,
    Paintbrush,
    Truck,
} from "lucide-react";

const navItems: NavItem[] = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard, color: "#8b5cf6" },
    { path: "/admin/meals", label: "Meals", icon: Utensils, color: "#f97316" },
    { path: "/admin/orders", label: "Orders", icon: ShoppingBag, color: "#0ea5e9" },
    { path: "/admin/assign-delivery", label: "Assign Delivery", icon: Truck, color: "#22c55e" },
    { path: "/admin/users", label: "Users", icon: Users, color: "#10b981" },
    { path: "/admin/balance-requests", label: "Wallet", icon: DollarSign, color: "#f59e0b" },
    { path: "/admin/notifications", label: "Notifications", icon: Bell, color: "#ec4899" },
    { path: "/admin/reports", label: "Reports", icon: FileText, color: "#6366f1" },
    // { path: "/admin/custom-css", label: "Custom CSS", icon: Paintbrush, color: "#f43f5e" },
];

export default function AdminLayout() {
    return (
        <DashboardLayout
            basePath="/admin"
            panelLabel="Admin Panel"
            roleLabel="Administrator"
            navItems={navItems}
            accentGradient="linear-gradient(135deg, #f97316, #fbbf24)"
            accentGlow="rgba(249,115,22,0.4)"
        />
    );
}
