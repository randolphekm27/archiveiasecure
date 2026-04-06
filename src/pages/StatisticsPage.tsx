import { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  FolderOpen,
  TrendingUp,
  Calendar,
  Clock,
  Star,
  Upload,
  Trash2,
  Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';


interface Stats {
  totalDocuments: number;
  totalUsers: number;
  totalCategories: number;
  importantDocuments: number;
  documentsThisMonth: number;
  documentsLastMonth: number;
  deletionRequests: number;
  activeUsers: number;
}

interface CategoryStat {
  name: string;
  color: string;
  count: number;
  percentage: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

export default function StatisticsPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    totalUsers: 0,
    totalCategories: 0,
    importantDocuments: 0,
    documentsThisMonth: 0,
    documentsLastMonth: 0,
    deletionRequests: 0,
    activeUsers: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topUploaders, setTopUploaders] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id) loadStatistics();
  }, [profile]);

  const loadStatistics = async () => {
    if (!profile?.organization_id) return;

    try {
      let docsQuery = supabase.from('documents').select('*').eq('organization_id', (profile as any).organization_id);
      let catsQuery = supabase.from('categories').select('*').eq('organization_id', (profile as any).organization_id);

      // Enforce category restrictions for non-admins
      if (profile.role !== 'admin' && (profile as any).category_ids && (profile as any).category_ids.length > 0) {
        docsQuery = docsQuery.in('category_id', (profile as any).category_ids);
        catsQuery = catsQuery.in('id', (profile as any).category_ids);
      }

      const [docsResult, usersResult, catsResult, deletionsResult] = await Promise.all([
        docsQuery,
        supabase.from('users').select('*').eq('organization_id', (profile as any).organization_id),
        catsQuery,
        supabase.from('deletion_requests').select('*', { count: 'exact', head: true }).eq('organization_id', (profile as any).organization_id),
      ]);

      const documents = (docsResult.data || []) as any[];
      const users = (usersResult.data || []) as any[];
      const categories = (catsResult.data || []) as any[];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const docsThisMonth = documents.filter((d) => new Date(d.created_at) >= startOfMonth);
      const docsLastMonth = documents.filter(
        (d) => new Date(d.created_at) >= startOfLastMonth && new Date(d.created_at) < startOfMonth
      );

      setStats({
        totalDocuments: documents.length,
        totalUsers: users.length,
        totalCategories: categories.length,
        importantDocuments: documents.filter((d) => d.is_important).length,
        documentsThisMonth: docsThisMonth.length,
        documentsLastMonth: docsLastMonth.length,
        deletionRequests: deletionsResult.count || 0,
        activeUsers: users.filter((u) => u.is_active).length,
      });

      const catCounts = categories.map((cat) => {
        const count = documents.filter((d) => d.category_id === cat.id).length;
        return {
          name: cat.name,
          color: cat.color,
          count,
          percentage: documents.length > 0 ? Math.round((count / documents.length) * 100) : 0,
        };
      });
      const uncategorized = documents.filter((d) => !d.category_id).length;
      if (uncategorized > 0) {
        catCounts.push({
          name: 'Non categorise',
          color: '#94A3B8',
          count: uncategorized,
          percentage: documents.length > 0 ? Math.round((uncategorized / documents.length) * 100) : 0,
        });
      }
      setCategoryStats(catCounts.sort((a, b) => b.count - a.count));

      const monthly: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        monthly[key] = 0;
      }
      documents.forEach((doc) => {
        const d = new Date(doc.created_at);
        const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        if (monthly[key] !== undefined) monthly[key]++;
      });
      setMonthlyData(Object.entries(monthly).map(([month, count]) => ({ month, count })));

      const uploaderCounts: Record<string, number> = {};
      documents.forEach((doc) => {
        uploaderCounts[doc.uploaded_by] = (uploaderCounts[doc.uploaded_by] || 0) + 1;
      });
      const uploaders = Object.entries(uploaderCounts)
        .map(([userId, count]) => ({
          name: users.find((u) => u.id === userId)?.full_name || 'Inconnu',
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopUploaders(uploaders);

    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const growthPercent = stats.documentsLastMonth > 0
    ? Math.round(((stats.documentsThisMonth - stats.documentsLastMonth) / stats.documentsLastMonth) * 100)
    : stats.documentsThisMonth > 0 ? 100 : 0;

  const maxMonthly = Math.max(...monthlyData.map((d) => d.count), 1);

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
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Statistiques</h2>
        <p className="text-slate-600">Vue d'ensemble de votre organisation</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Documents', value: stats.totalDocuments, icon: FileText, color: 'blue' },
          { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'emerald' },
          { label: 'Categories', value: stats.totalCategories, icon: FolderOpen, color: 'amber' },
          { label: 'Importants', value: stats.importantDocuments, icon: Star, color: 'rose' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-slate-200">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-${stat.color}-50`}>
                <Icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Documents par mois
            </h3>
            <div className={`flex items-center gap-1 text-sm font-medium ${growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-4 h-4 ${growthPercent < 0 ? 'rotate-180' : ''}`} />
              {growthPercent >= 0 ? '+' : ''}{growthPercent}%
            </div>
          </div>
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-slate-600">{data.count}</span>
                <div
                  className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                  style={{
                    height: `${Math.max((data.count / maxMonthly) * 160, 4)}px`,
                  }}
                />
                <span className="text-xs text-slate-500">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-6">
            <FolderOpen className="w-5 h-5 text-amber-600" />
            Repartition par categorie
          </h3>
          {categoryStats.length > 0 ? (
            <div className="space-y-3">
              {categoryStats.map((cat) => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                    </div>
                    <span className="text-sm text-slate-500">
                      {cat.count} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune categorie</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-emerald-600" />
            Top contributeurs
          </h3>
          {topUploaders.length > 0 ? (
            <div className="space-y-3">
              {topUploaders.map((uploader, i) => (
                <div key={uploader.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-slate-200 text-slate-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{uploader.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(uploader.count / (topUploaders[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{uploader.count} docs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune donnee</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            Resume
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Ce mois-ci', value: stats.documentsThisMonth, icon: Calendar, color: 'bg-blue-50 text-blue-700' },
              { label: 'Mois dernier', value: stats.documentsLastMonth, icon: Clock, color: 'bg-slate-100 text-slate-700' },
              { label: 'Demandes suppr.', value: stats.deletionRequests, icon: Trash2, color: 'bg-red-50 text-red-700' },
              { label: 'Utilisateurs actifs', value: stats.activeUsers, icon: Users, color: 'bg-emerald-50 text-emerald-700' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`rounded-xl p-4 ${item.color}`}>
                  <Icon className="w-5 h-5 mb-2 opacity-70" />
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs mt-1 opacity-80">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
