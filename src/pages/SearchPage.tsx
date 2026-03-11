import { useState, useEffect } from 'react';
import { Search, Filter, FileText, Calendar, Tag, FolderOpen, Download, Eye, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export default function SearchPage() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    categoryId: '',
    startDate: '',
    endDate: '',
    importantOnly: false,
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, documents]);

  const loadData = async () => {
    try {
      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      let docsQuery = supabase
        .from('documents')
        .select('*, deletion_requests(id, status)')
        .eq('organization_id', profile.organization_id);

      let catsQuery = supabase
        .from('categories')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name');

      // Enforce category restrictions for non-admins
      if (profile.role !== 'admin' && (profile as any).category_ids && (profile as any).category_ids.length > 0) {
        docsQuery = docsQuery.in('category_id', (profile as any).category_ids);
        catsQuery = catsQuery.in('id', (profile as any).category_ids);
      }

      const [docsResult, catsResult] = await Promise.all([
        docsQuery.order('created_at', { ascending: false }),
        catsQuery
      ]);

      if (docsResult.data) {
        const filteredDocs = docsResult.data.filter((doc: any) => {
          const hasPending = doc.deletion_requests?.some((req: any) => req.status === 'pending');
          return !hasPending;
        });
        setDocuments(filteredDocs);
      }
      if (catsResult.data) setCategories(catsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let results = [...documents];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        (doc.keywords && doc.keywords.some((k: string) => k.toLowerCase().includes(query)))
      );
    }

    if (filters.categoryId) {
      results = results.filter(doc => doc.category_id === filters.categoryId);
    }

    if (filters.startDate) {
      results = results.filter(doc => doc.document_date && doc.document_date >= filters.startDate);
    }

    if (filters.endDate) {
      results = results.filter(doc => doc.document_date && doc.document_date <= filters.endDate);
    }

    if (filters.importantOnly) {
      results = results.filter(doc => doc.is_important);
    }

    setFilteredDocs(results);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilters({
      categoryId: '',
      startDate: '',
      endDate: '',
      importantOnly: false,
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Non catégorisé';
    return categories.find(c => c.id === categoryId)?.name || 'Inconnue';
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return '#94A3B8';
    return categories.find(c => c.id === categoryId)?.color || '#94A3B8';
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
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Recherche Avancée</h2>
        <p className="text-slate-600">Trouvez vos documents rapidement</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un document, un mot-clé..."
              className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <FolderOpen className="w-4 h-4 inline mr-1" />
              Catégorie
            </label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Toutes</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date début
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date fin
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4 inline mr-1" />
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="mt-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.importantOnly}
              onChange={(e) => setFilters({ ...filters, importantOnly: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Documents importants uniquement</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">
            Résultats ({filteredDocs.length})
          </h3>
        </div>

        {filteredDocs.length > 0 ? (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${getCategoryColor(doc.category_id)}20` }}
                >
                  <FileText className="w-6 h-6" style={{ color: getCategoryColor(doc.category_id) }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900">{doc.title}</h4>
                    {doc.is_important && (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {doc.document_date ? new Date(doc.document_date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${getCategoryColor(doc.category_id)}20`,
                        color: getCategoryColor(doc.category_id)
                      }}
                    >
                      {getCategoryName(doc.category_id)}
                    </span>
                    {doc.keywords && doc.keywords.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        {doc.keywords.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Voir le document"
                  >
                    <Eye className="w-5 h-5 text-blue-600" />
                  </a>
                  <a
                    href={doc.file_url}
                    download
                    className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-5 h-5 text-emerald-600" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Search className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="font-medium mb-1">Aucun document trouvé</p>
            <p className="text-sm">Essayez de modifier vos critères de recherche</p>
          </div>
        )}
      </div>
    </div>
  );
}
