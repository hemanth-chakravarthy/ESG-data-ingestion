import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute, ProtectedRoute } from './components/RouteGuards';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes – redirect to dashboard if already logged in */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes – redirect to login if not authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
