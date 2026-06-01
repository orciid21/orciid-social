import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PricingPage from './pages/PricingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

// App pages (protected)
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/app/DashboardPage';
import ComposePage from './pages/app/ComposePage';
import CalendarPage from './pages/app/CalendarPage';
import AccountsPage from './pages/app/AccountsPage';
import AnalyticsPage from './pages/app/AnalyticsPage';
import PostsPage from './pages/app/PostsPage';
import SettingsPage from './pages/app/SettingsPage';
import BillingPage from './pages/app/BillingPage';

const ProtectedRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

const GuestRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

      {/* App */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="compose" element={<ComposePage />} />
        <Route path="compose/:postId" element={<ComposePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="posts" element={<PostsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/billing" element={<BillingPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
