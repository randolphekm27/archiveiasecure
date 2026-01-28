import { ReactNode, useState } from 'react';
import {
  Home,
  FileText,
  Upload,
  Search,
  Settings,
  User,
  LogOut,
  Building2,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  currentPage: 'dashboard' | 'documents' | 'upload' | 'search' | 'admin' | 'profile';
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, organization, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Home },
    { id: 'documents', label: 'Mes Documents', icon: FileText },
    { id: 'upload', label: 'Nouveau Document', icon: Upload },
    { id: 'search', label: 'Recherche Avancée', icon: Search },
    ...(profile?.role === 'admin' ? [{ id: 'admin', label: 'Administration', icon: Settings }] : []),
    { id: 'profile', label: 'Mon Compte', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div className="flex items-center gap-3">
                {organization?.logo_url ? (
                  <img src={organization.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <h1 className="font-bold text-lg text-slate-900">{organization?.name}</h1>
                  <p className="text-xs text-slate-500">{organization?.code}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">{profile?.full_name}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {profile?.role === 'admin' ? 'Admin' : profile?.role === 'editor' ? 'Éditeur' : 'Lecteur'}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <aside className={`
            ${mobileMenuOpen ? 'block' : 'hidden'} lg:block
            fixed lg:static inset-0 top-16 lg:top-0 z-40
            w-64 bg-white lg:bg-transparent
            border-r lg:border-0 border-slate-200
            p-4 lg:p-0
          `}>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all font-medium
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-700 hover:bg-slate-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
