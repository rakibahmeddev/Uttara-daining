import DashboardLayout, { type NavItem } from "./DashboardLayout";
import {
    LayoutDashboard,
    Utensils,
    ShoppingBag,
    Truck,
    Users,
    DollarSign,
    User,
    Bell,
    Bike,
} from "lucide-react";

const navItems: NavItem[] = [
    { path: "/manager", label: "Dashboard", icon: LayoutDashboard, color: "#14b8a6" },
    { path: "/manager/order", label: <span style={{ display: 'flex', flexDirection: 'column' }}><span>Order Meal</span><span className="text-[10px] opacity-75 leading-none mt-0.5">(only for myself)</span></span>, icon: Utensils, color: "#a855f7" },
    { path: "/manager/meals", label: "Manage Meals", icon: Utensils, color: "#f97316" },
    { path: "/manager/orders", label: "Orders", icon: ShoppingBag, color: "#0ea5e9" },
    { path: "/manager/assign-delivery", label: "Assign Delivery", icon: Truck, color: "#22c55e" },
    { path: "/manager/rider-delivery", label: "My Delivery", icon: Bike, color: "#ef4444" },
    { path: "/manager/users", label: "Users", icon: Users, color: "#10b981" },
    { path: "/manager/balance-requests", label: "Balance", icon: DollarSign, color: "#f59e0b" },
    { path: "/manager/notifications", label: "Notifications", icon: Bell, color: "#ec4899" },
    { path: "/manager/profile", label: "Profile", icon: User, color: "#8b5cf6" },
];

export default function ManagerLayout() {
    return (
        <DashboardLayout
            basePath="/manager"
            panelLabel="Manager Panel"
            roleLabel="Manager"
            navItems={navItems}
            accentGradient="linear-gradient(135deg, #0f766e, #14b8a6)"
            accentGlow="rgba(20,184,166,0.35)"
        />
    );
}
