import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ReinforcementsPage from '@/pages/ReinforcementsPage';
import ClientsPage from '@/pages/admin/ClientsPage';
import UsersPage from '@/pages/admin/UsersPage';
import GarmentsPage from '@/pages/admin/GarmentsPage';
import RecipesPage from '@/pages/admin/RecipesPage';
import TargetsPage from '@/pages/admin/TargetsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="reinforcements" element={<ReinforcementsPage />} />
            
            {/* Admin Routes */}
            <Route path="admin/clients" element={<ClientsPage />} />
            <Route path="admin/users" element={<UsersPage />} />
            <Route path="admin/garments" element={<GarmentsPage />} />
            <Route path="admin/recipes" element={<RecipesPage />} />
            <Route path="admin/targets" element={<TargetsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
