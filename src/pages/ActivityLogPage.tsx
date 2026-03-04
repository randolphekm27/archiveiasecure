import { useState, useEffect } from 'react';
import {
  Activity,
  Filter,
  User,
  Clock,
  FileText,
  Search,
  Monitor,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getActionInfo } from '../lib/activityLogger';
import type { Database } from '../lib/database.types';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type UserProfile = Database['public']['Tables']['users']['Row'];
type Document = Database['public']['Tables']['documents']['Row'];

interface LogWithDetails extends ActivityLog {
  user?: UserProfile;
  document?: Document;
}

export default function ActivityLogPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<LogWithDetails[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    loadLogs();
  }, [profile, selectedUser, selectedAction, page]);

  const loadLogs = async () => {
    if (!profile?.organization_id) return;

    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (selectedUser) {
        query = query.eq('user_id', selectedUser);
      }

      if (selectedAction) {
        query = query.eq('action', selectedAction);
      }

      const [{ data: logData }, { data: userData }, { data: docData }] = await Promise.all([
        query,
        supabase.from('users').select('*').eq('organization_id', profile.organization_id),
        supabase.from('documents').select('*').eq('organization_id', profile.organization_id),
      ]);

      if (userData) setUsers(userData);

      const enriched: LogWithDetails[] = (logData || []).map((log) => ({
        ...log,
        user: userData?.find((u) => u.id === log.user_id),
        document: docData?.find((d) => d.id === log.document_id),
      }));

      setLogs(enriched);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = searchQuery
    ? logs.filter(
        (log) =>
          log.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.document?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.action.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  const formatDetails = (details: any) => {
    if (!details) return null;
    return Object.entries(details).map(([key, value]) => (
      <div key={key} className="flex gap-2 text-sm">
        <span className="font-medium text-slate-600 min-w-[120px]">{key}:</span>
        <span className="text-slate-800">{String(value)}</span>
      </div>
    ));
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
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Journal d'Activite</h2>
        <p className="text-slate-600">
          Historique complet de toutes les actions dans l'organisation
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans le journal..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); setPage(0); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tous les utilisateurs</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>

            <select
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setPage(0); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Toutes les actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {getActionInfo(a).label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Aucune activite</h3>
          <p className="text-slate-600">Le journal est vide pour les filtres selectionnes</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const actionInfo = getActionInfo(log.action);
              const isExpanded = expandedLog === log.id;
              return (
                <div
                  key={log.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full px-6 py-4 flex items-center gap-4 text-left"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: actionInfo.color }}
                    />
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {log.user?.avatar_url ? (
                        <img
                          src={log.user.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-600">
                          {log.user?.full_name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{log.user?.full_name}</span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${actionInfo.color}15`,
                            color: actionInfo.color,
                          }}
                        >
                          {actionInfo.label}
                        </span>
                      </div>
                      {log.document && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                          <FileText className="w-3.5 h-3.5" />
                          {log.document.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-4 ml-[72px]">
                      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                        {log.details && formatDetails(log.details)}
                        {log.user_agent && (
                          <div className="flex items-start gap-2 text-sm pt-2 border-t border-slate-200">
                            <Monitor className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-500 text-xs break-all">{log.user_agent}</span>
                          </div>
                        )}
                        {log.ip_address && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-slate-600">IP:</span>
                            <span className="text-slate-800 font-mono text-xs">{log.ip_address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Precedent
            </button>
            <span className="text-sm text-slate-600">Page {page + 1}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={filteredLogs.length < pageSize}
              className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
