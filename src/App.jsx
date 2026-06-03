import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import CreateLeague from "./pages/admin/CreateLeague";
import ManageLeague from "./pages/admin/ManageLeague";
import { LeaguePage } from "./pages/PlaceholderPages";

import "./styles/global.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Support both /leagues/:id and /leagues/:id/:slug */}
          <Route path="/leagues/:id" element={<LeaguePage />} />
          <Route path="/leagues/:id/:slug" element={<LeaguePage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route path="/admin/dashboard" element={
            <ProtectedRoute><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/leagues/new" element={
            <ProtectedRoute><CreateLeague /></ProtectedRoute>
          } />
          <Route path="/admin/leagues/:id" element={
            <ProtectedRoute><ManageLeague /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}