import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ApplicantDashboard } from './pages/applicant/ApplicantDashboard';
import { ApplicationForm } from './pages/applicant/ApplicationForm';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ApplicationReview } from './pages/admin/ApplicationReview';
import './styles/global.css';

function AppRoutes() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes with layout */}
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Applicant routes - single dashboard with upload + status tracking */}
        <Route path="/" element={
          profile?.role === 'admin' || profile?.role === 'reviewer'
            ? <Navigate to="/admin" replace />
            : <ApplicantDashboard />
        } />

        <Route path="/application/:id" element={<ApplicationForm />} />

        {/* Admin/Reviewer routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/application/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
            <ApplicationReview />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
