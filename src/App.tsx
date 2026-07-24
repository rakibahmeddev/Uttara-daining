import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

function PublicLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
      <Header 
        variant="public" 
        onLoginRequest={() => navigate("/login")}
        onRegisterRequest={() => navigate("/register")}
      />
      <main className="flex-1 w-full flex flex-col" style={{ marginBottom: '40px' }}>
         {children}
      </main>
      <Footer />
    </div>
  );
}

import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Layouts
import AdminLayout from "./components/layout/AdminLayout";
import StudentLayout from "./components/layout/StudentLayout";
import ManagerLayout from "./components/layout/ManagerLayout";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import Meals from "./pages/admin/Meals";
import Users from "./pages/admin/Users";
import Reports from "./pages/admin/Reports";
import Orders from "./pages/admin/Orders";
import BalanceRequests from "./pages/admin/BalanceRequests";
import AdminProfile from "./pages/admin/AdminProfile";
import Notifications from "./pages/admin/Notifications";
import AdminCustomCSS from "./pages/admin/AdminCustomCSS";
import AssignDelivery from "./pages/admin/AssignDelivery";

// Manager Pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerUsers from "./pages/manager/ManagerUsers";
import ManagerBalanceRequests from "./pages/manager/ManagerBalanceRequests";
import ManagerProfile from "./pages/manager/ManagerProfile";
import ManagerNotifications from "./pages/manager/ManagerNotifications";
import { NotificationsProvider } from "./context/NotificationsContext";

// Student Pages
import StudentHome from "./pages/student/StudentHome";
import OrderHistory from "./pages/student/OrderHistory";
import Profile from "./pages/student/Profile";
import WithdrawalRequest from "./pages/student/WithdrawalRequest";
import RiderDeliveryScreen from "./pages/student/RiderDeliveryScreen";

function RootRouteHandler() {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return null;

  if (currentUser && userRole) {
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'manager') return <Navigate to="/manager" replace />;
    if (userRole === 'student') return <Navigate to="/student" replace />;
  }

  return (
    <PublicLayout>
      <StudentHome />
    </PublicLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="meals" element={<Meals />} />
              <Route path="users" element={<Users />} />
              <Route path="assign-delivery" element={<AssignDelivery />} />
              <Route path="orders" element={<Orders />} />
              <Route path="balance-requests" element={<BalanceRequests />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="reports" element={<Reports />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="custom-css" element={<AdminCustomCSS />} />
            </Route>

            {/* Manager Routes */}
            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ManagerDashboard />} />
              <Route path="order" element={<StudentHome />} />
              <Route path="meals" element={<Meals />} />
              <Route path="orders" element={<Orders />} />
              <Route path="assign-delivery" element={<AssignDelivery />} />
              <Route path="users" element={<ManagerUsers />} />
              <Route path="balance-requests" element={<ManagerBalanceRequests />} />
              <Route path="notifications" element={<ManagerNotifications />} />
              <Route path="profile" element={<ManagerProfile />} />
            </Route>

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <NotificationsProvider role="student">
                    <StudentLayout />
                  </NotificationsProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentHome />} />
              <Route path="history" element={<OrderHistory />} />
              <Route path="withdrawal" element={<WithdrawalRequest />} />
              <Route path="profile" element={<Profile />} />
              <Route path="rider-delivery" element={<RiderDeliveryScreen />} />
            </Route>

            <Route 
              path="/" 
              element={
                <RootRouteHandler />
              } 
            />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
