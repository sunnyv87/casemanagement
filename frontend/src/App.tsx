import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AlertsPage from './pages/AlertsPage';
import AlertDetailPage from './pages/AlertDetailPage';
import CasesPage from './pages/CasesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import CustomersPage from './pages/CustomersPage';
import UsersPage from './pages/UsersPage';
import IntegrationsPage from './pages/IntegrationsPage';
import ReportsPage from './pages/ReportsPage';
import AuditPage from './pages/AuditPage';
import NotFoundPage from './pages/NotFoundPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="alerts" element={<ProtectedRoute roles={['analyst', 'manager', 'admin']}><AlertsPage /></ProtectedRoute>} />
        <Route path="alerts/:id" element={<ProtectedRoute roles={['analyst', 'manager', 'admin']}><AlertDetailPage /></ProtectedRoute>} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="customers" element={<ProtectedRoute roles={['manager', 'admin']}><CustomersPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="integrations" element={<ProtectedRoute roles={['admin']}><IntegrationsPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['customer', 'manager', 'admin']}><ReportsPage /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute roles={['manager', 'admin']}><AuditPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
