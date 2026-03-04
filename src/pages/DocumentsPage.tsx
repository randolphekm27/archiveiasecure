import { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Tag,
  Download,
  Eye,
  Star,
  Trash2,
  AlertTriangle,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import type { Database } from '../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export default function DocumentsPage() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletionModal, setDeletionModal] = useState<Document | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    try {
      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      const [docsResult, catsResult] = await Promise.all([
        supabase
          .from('documents')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('organization_id', profile.organization_id),
      ]);

      if (docsResult.data) setDocuments(docsResult.data);
      if (catsResult.data) setCategories(catsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionModal || !profile) return;

    setSubmittingDeletion(true);

    try {
      const { error } = await supabase.from('deletion_requests').insert({
        organization_id: profile.organization_id,
        document_id: deletionModal.id,
        requested_by: profile.id,
        reason: deletionReason,
      });

      if (error) throw error;

      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'document.delete_request',
        documentId: deletionModal.id,
        details: { title: deletionModal.title, reason: deletionReason },
      });

      setDeletionSuccess(true);
      setTimeout(() => {
        setDeletionModal(null);
        setDeletionReason('');
        setDeletionSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error requesting deletion:', error);
    } finally {
      setSubmittingDeletion(false);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Non categorise';
    return categories.find((c) => c.id === categoryId)?.name || 'Inconnue';
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return '#94A3B8';
    return categories.find((c) => c.id === categoryId)?.color || '#94A3B8';
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
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Mes Documents</h2>
          <p className="text-slate-600">
            {documents.length} document{documents.length > 1 ? 's' : ''} archive
            {documents.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Document</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Categorie</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Mots-cles</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${getCategoryColor(doc.category_id)}20` }}
                        >
                          <FileText className="w-5 h-5" style={{ color: getCategoryColor(doc.category_id) }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{doc.title}</p>
                            {doc.is_important && (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{doc.file_type.toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {new Date(doc.document_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${getCategoryColor(doc.category_id)}20`,
                          color: getCategoryColor(doc.category_id),
                        }}
                      >
                        {getCategoryName(doc.category_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {doc.keywords.length > 0 ? (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Tag className="w-3.5 h-3.5" />
                          <span className="text-sm">{doc.keywords.slice(0, 2).join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </a>
                        <a
                          href={doc.file_url}
                          download
                          className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Telecharger"
                        >
                          <Download className="w-4 h-4 text-emerald-600" />
                        </a>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => setDeletionModal(doc)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Demander la suppression"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Aucun document</h3>
          <p className="text-slate-600">Commencez par ajouter votre premier document</p>
        </div>
      )}

      {deletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            {deletionSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Demande envoyee</h3>
                <p className="text-slate-600">
                  Les autres administrateurs ont ete notifies et devront voter pour confirmer la suppression.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Demander la suppression
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setDeletionModal(null);
                      setDeletionReason('');
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    La suppression necessite l'approbation de 3 administrateurs. Le document sera
                    place en corbeille securisee pendant 30 jours avant suppression definitive.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-600 mb-1">Document concerne :</p>
                  <p className="font-medium text-slate-900">{deletionModal.title}</p>
                </div>

                <form onSubmit={handleRequestDeletion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Raison de la demande de suppression
                    </label>
                    <textarea
                      required
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      placeholder="Expliquez pourquoi ce document doit etre supprime..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingDeletion}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white py-2.5 rounded-lg font-medium transition-colors"
                    >
                      {submittingDeletion ? 'Envoi...' : 'Soumettre la demande'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletionModal(null);
                        setDeletionReason('');
                      }}
                      className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
