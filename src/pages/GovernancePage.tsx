import { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  FileX,
  History,
  FolderOpen,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getActionInfo } from '../lib/activityLogger';

interface GovernanceStats {
  pendingDeletions: number;
  totalDeleted: number;
  criticalActivities: number;
  adminCount: number;
}

export default function GovernancePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<GovernanceStats>({
    pendingDeletions: 0,
    totalDeleted: 0,
    criticalActivities: 0,
    adminCount: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) loadGovernanceData();
  }, [profile]);

  const loadGovernanceData = async () => {
    if (!profile?.organization_id) return;

    try {
      const [
        pendingRes, 
        trashRes, 
        adminsRes, 
        requestsRes, 
        logsRes
      ] = await Promise.all([
        supabase.from('deletion_requests').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).in('status', ['pending', 'info_requested']),
        supabase.from('secure_trash').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).eq('role', 'admin'),
        supabase.from('deletion_requests').select('*, document:documents(*), category:categories(*)').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }).limit(3),
        supabase.from('activity_logs').select('*, user:users(full_name)').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }).limit(5)
      ]);

      setStats({
        pendingDeletions: pendingRes.count || 0,
        totalDeleted: trashRes.count || 0,
        criticalActivities: 0, // Could be calculated from logs if needed
        adminCount: adminsRes.count || 0,
      });

      setRecentRequests(requestsRes.data || []);
      setRecentLogs(logsRes.data || []);

    } catch (error) {
      console.error('Error loading governance data:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Gouvernance & Conformite</h2>
          <p className="text-slate-600">Surveillance et controle des actions critiques</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium text-sm border border-blue-100">
          <Shield className="w-4 h-4" />
          Niveau de securite : Eleve
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-16 h-16 text-rose-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">Suppressions en attente</p>
          <p className="text-3xl font-bold text-slate-900 mb-4">{stats.pendingDeletions}</p>
          <button 
            onClick={() => onNavigate('deletion-requests')}
            className="flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors"
          >
            Gerer les validations <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <FileX className="w-16 h-16 text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">Documents en corbeille</p>
          <p className="text-3xl font-bold text-slate-900 mb-4">{stats.totalDeleted}</p>
          <button 
            onClick={() => onNavigate('secure-trash')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Explorer la corbeille <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <History className="w-16 h-16 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">Total Administrateurs</p>
          <p className="text-3xl font-bold text-slate-900 mb-4">{stats.adminCount}</p>
          <button 
            onClick={() => onNavigate('admin')}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Gerer les roles <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Dernieres demandes de suppression
            </h3>
          </div>
          <div className="p-4 flex-1">
            {recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                        {req.target_type === 'category' ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <FileText className="w-4 h-4 text-red-500" />}
                        {req.target_type === 'category' ? req.category?.name || 'Catégorie inconnue' : req.document?.title || 'Document inconnu'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Demande le {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {req.status === 'pending' ? 'Attente' : req.status === 'approved' ? 'Approuve' : req.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">Aucune demande en attente</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-slate-50/50 border-t border-slate-100">
            <button 
              onClick={() => onNavigate('deletion-requests')}
              className="w-full text-center text-sm font-bold text-blue-600 hover:underline"
            >
              Voir toutes les demandes
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Journal des actions critiques
            </h3>
          </div>
          <div className="p-4 flex-1">
            <div className="space-y-4">
              {recentLogs.map(log => {
                const info = getActionInfo(log.action);
                const Icon = info.icon;
                return (
                  <div key={log.id} className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className={`p-2 rounded-lg bg-slate-100 ${info.color.replace('text-', 'text-')}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-bold">{log.user?.full_name || 'Systeme'}</span>
                        {' '}{info.label.toLowerCase()}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleTimeString()} le {new Date(log.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-4 bg-slate-50/50 border-t border-slate-100">
            <button 
              onClick={() => onNavigate('activity')}
              className="w-full text-center text-sm font-bold text-blue-600 hover:underline"
            >
              Consulter le journal complet
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-lg shadow-blue-900/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-bold mb-2">Renforcez la securite de votre organisation</h3>
            <p className="text-blue-100 opacity-90 max-w-lg">
              ArchivIA Pro utilise un systeme de double-voter pour les actions irreversibles. 
              Chaque suppression doit etre validee par les administrateurs designes.
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => onNavigate('statistics')}
              className="px-6 py-3 bg-white text-blue-700 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-md"
            >
              Statistiques d'utilisation
            </button>
            <button 
              onClick={() => onNavigate('admin')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold border border-blue-500 hover:bg-blue-500 transition-all shadow-md"
            >
              Gestion des Roles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
