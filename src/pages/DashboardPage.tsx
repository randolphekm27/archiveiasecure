import { useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  TrendingUp,
  Clock,
  Star,
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];

interface DashboardStats {
  totalDocuments: number;
  recentDocuments: number;
  importantDocuments: number;
  storageUsed: string;
}

export default function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    recentDocuments: 0,
    importantDocuments: 0,
    storageUsed: '0 MB',
  });
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [importantDocs, setImportantDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      loadDashboardData();
    }
  }, [authLoading, profile?.organization_id]);

  const loadDashboardData = async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (documents) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recent = documents.filter(doc => new Date(doc.created_at) > sevenDaysAgo);
        const important = documents.filter(doc => doc.is_important);

        setStats({
          totalDocuments: documents.length,
          recentDocuments: recent.length,
          importantDocuments: important.length,
          storageUsed: `${(documents.length * 0.5).toFixed(1)} MB`,
        });

        setRecentDocs(documents.slice(0, 5));
        setImportantDocs(important.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      label: 'Ajoutés cette semaine',
      value: stats.recentDocuments,
      icon: Clock,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      label: 'Documents Importants',
      value: stats.importantDocuments,
      icon: Star,
      color: 'amber',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      label: 'Espace Utilisé',
      value: stats.storageUsed,
      icon: HardDrive,
      color: 'slate',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">
          Bienvenue, {profile?.full_name}
        </h2>
        <p className="text-slate-600">Voici un aperçu de vos archives</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Actions Rapides</h3>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('upload')}
              className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <div className="bg-blue-600 p-2 rounded-lg">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-slate-900">Scanner un Document</p>
                <p className="text-sm text-slate-600">Ajouter un nouveau document</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('search')}
              className="w-full flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors group"
            >
              <div className="bg-emerald-600 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-slate-900">Rechercher</p>
                <p className="text-sm text-slate-600">Trouver un document rapidement</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Documents Récents</h3>
            <button
              onClick={() => onNavigate('documents')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Voir tout
            </button>
          </div>
          {recentDocs.length > 0 ? (
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="bg-blue-100 p-2 rounded">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun document récent</p>
            </div>
          )}
        </div>
      </div>

      {importantDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-slate-900">Documents Importants</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {importantDocs.map((doc) => (
              <div key={doc.id} className="bg-white p-4 rounded-lg border border-amber-200">
                <p className="font-medium text-slate-900 mb-1">{doc.title}</p>
                <p className="text-sm text-slate-600">
                  {new Date(doc.document_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalDocuments === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Commencez votre archivage</h3>
              <p className="text-slate-700 mb-3">
                Vous n'avez pas encore de documents archivés. Commencez par ajouter votre premier document.
              </p>
              <button
                onClick={() => onNavigate('upload')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Ajouter un Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
