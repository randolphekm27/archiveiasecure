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
import DeletionRequestsPage from './pages/DeletionRequestsPage';
import SecureTrashPage from './pages/SecureTrashPage';
import ActivityLogPage from './pages/ActivityLogPage';
import StatisticsPage from './pages/StatisticsPage';
import GovernancePage from './pages/GovernancePage';

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
      case 'governance':
        return <GovernancePage onNavigate={setCurrentPage} />;
      case 'profile':
        return <ProfilePage />;
      case 'deletion-requests':
        return <DeletionRequestsPage />;
      case 'secure-trash':
        return <SecureTrashPage />;
      case 'activity':
        return <ActivityLogPage />;
      case 'statistics':
        return <StatisticsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route
        path="/*"
        element={
          user ? (
            <Layout currentPage={currentPage as any} onNavigate={setCurrentPage}>
              {renderPage()}
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
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
