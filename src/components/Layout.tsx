import { ReactNode, useState, useEffect } from 'react';
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
  X,
  Activity,
  ShieldAlert,
  Trash2,
  BarChart3,
  Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import NotificationsPanel from './NotificationsPanel';

type PageId = 'dashboard' | 'documents' | 'upload' | 'search' | 'admin' | 'profile' | 'activity' | 'deletion-requests' | 'secure-trash' | 'statistics' | 'governance';

interface LayoutProps {
  children: ReactNode;
  currentPage: PageId;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, organization, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingDeletions, setPendingDeletions] = useState(0);

  useEffect(() => {
    if (profile?.role === 'admin') loadPendingDeletions();
  }, [profile]);

  const loadPendingDeletions = async () => {
    if (!profile?.organization_id) return;
    const { count } = await supabase
      .from('deletion_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .in('status', ['pending', 'info_requested']);

    setPendingDeletions(count || 0);
  };

  useEffect(() => {
    if (organization) {
      const root = document.documentElement;
      if (organization.primary_color) {
        root.style.setProperty('--color-primary', organization.primary_color);
      }
      if ((organization as any).secondary_color) {
        root.style.setProperty('--color-secondary', (organization as any).secondary_color);
      }
      if ((organization as any).font_family) {
        root.style.setProperty('--font-family', (organization as any).font_family);
      }
      
      if (organization.name) {
        document.title = `${organization.name} - Portail Interne`;
      }
    }
  }, [organization]);

  const isAdmin = profile?.role === 'admin';
  const canUpload = profile?.role !== 'reader';

  const menuSections = [
    {
      title: 'Navigation Principale',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: Home, show: true, badge: 0 },
        { id: 'documents', label: 'Mes Documents', icon: FileText, show: true, badge: 0 },
        { id: 'upload', label: 'Nouveau Document', icon: Upload, show: canUpload, badge: 0 },
        { id: 'search', label: 'Recherche Avancee', icon: Search, show: true, badge: 0 },
      ]
    },
    {
      title: 'Gouvernance & Securite',
      show: isAdmin,
      items: [
        { id: 'governance', label: 'Vue d\'ensemble', icon: Shield, show: isAdmin, badge: 0 },
        { id: 'statistics', label: 'Analyses & stats', icon: BarChart3, show: isAdmin, badge: 0 },
        { id: 'deletion-requests', label: 'Validation suppressions', icon: ShieldAlert, show: isAdmin, badge: pendingDeletions },
        { id: 'secure-trash', label: 'Corbeille securisee', icon: Trash2, show: isAdmin, badge: 0 },
        { id: 'activity', label: 'Journal d\'activites', icon: Activity, show: isAdmin, badge: 0 },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { id: 'admin', label: 'Administration', icon: Settings, show: isAdmin, badge: 0 },
        { id: 'profile', label: 'Mon profil personnel', icon: User, show: true, badge: 0 },
      ]
    }
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

            <div className="flex items-center gap-3">
              <NotificationsPanel onNavigate={onNavigate} />
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">{profile?.full_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  profile?.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                  profile?.role === 'editor' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {profile?.role === 'admin' ? 'Admin' : profile?.role === 'editor' ? 'Editeur' : 'Lecteur'}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Se deconnecter"
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
            <nav className="space-y-6">
              {menuSections.map((section) => (
                (!section.hasOwnProperty('show') || (section as any).show) && (
                  <div key={section.title} className="space-y-1">
                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      {section.title}
                    </p>
                    {section.items.map((item) => {
                      if (!item.show) return null;
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
                            w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                            transition-all font-medium relative group
                            ${isActive
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                              : 'text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm'
                            }
                          `}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                          <span className="flex-1 text-left text-sm">{item.label}</span>
                          {item.badge > 0 && (
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isActive ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ))}
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
