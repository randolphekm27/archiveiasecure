import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import JoinPage from './pages/JoinPage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join/:token" element={<JoinPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'documents':
        return <DocumentsPage />;
      case 'upload':
        return <UploadPage onNavigate={setCurrentPage} />;
      case 'search':
        return <SearchPage />;
      case 'admin':
        return <AdminPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Routes>
      <Route
        path="/*"
        element={
          <Layout currentPage={currentPage as any} onNavigate={setCurrentPage}>
            {renderPage()}
          </Layout>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
