import { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Tag,
  Download,
  Star,
  Trash2,
  AlertTriangle,
  X,
  ShieldAlert,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import type { Database } from '../lib/database.types';

type Document = Database['public']['Tables']['documents']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export default function DocumentsPage() {
  const { profile, organization } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletionModal, setDeletionModal] = useState<Document | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [signedPreviewUrl, setSignedPreviewUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    try {
      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      let docsQuery = (supabase as any)
        .from('documents')
        .select('*, deletion_requests(id, status)')
        .eq('organization_id', profile.organization_id);

      // Categories are now strictly filtered via Row Level Security (RLS) policies 
      // in the database. The client no longer needs to filter them manually.

      const [docsResult, catsResult] = await Promise.all([
        docsQuery.order('created_at', { ascending: false }),
        (supabase as any)
          .from('categories')
          .select('*')
          .eq('organization_id', profile.organization_id),
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

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionModal || !profile) return;

    setSubmittingDeletion(true);

    try {
      if (!profile?.organization_id) {
        throw new Error("Session non identifiée. Veuillez vous reconnecter.");
      }

      console.log(`[Deletion] Requesting for doc: ${deletionModal.id}`);

      const { error } = await supabase.from('deletion_requests').insert({
        organization_id: profile.organization_id,
        document_id: deletionModal.id,
        requested_by: profile.id,
        reason: deletionReason,
        votes_required: organization?.deletion_votes_required || 3
      });

      if (error) {
        console.error('[Deletion] Database error:', error);
        throw new Error(`Erreur lors de la demande : ${error.message}`);
      }

      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'document.delete_request',
        documentId: deletionModal.id,
        details: { title: deletionModal.title, reason: deletionReason },
      });

      // Notification Email aux administrateurs
      try {
        const { data: admins } = await supabase
          .from('users')
          .select('email')
          .filter('organization_id', 'eq', profile.organization_id)
          .filter('role', 'eq', 'admin');

        if (admins && admins.length > 0) {
          const adminEmails = (admins as any[]).map(a => a.email).filter(Boolean);

          if (adminEmails.length > 0) {
            await supabase.functions.invoke('send-deletion-notification', {
              body: {
                documentTitle: deletionModal.title,
                requesterName: profile.full_name,
                reason: deletionReason,
                organizationName: organization?.name || 'Organisation',
                adminsEmails: adminEmails,
              },
            });
          }
        }
      } catch (emailError) {
        console.warn('[Deletion] Could not send notification email:', emailError);
      }

      setDeletionSuccess(true);
      
      // Force reload list if it was auto-approved/deleted immediately
      await loadData();

      setTimeout(() => {
        setDeletionModal(null);
        setDeletionReason('');
        setDeletionSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error requesting deletion:', error);
      alert(error.message || "Une erreur est survenue lors de la demande de suppression.");
    } finally {
      setSubmittingDeletion(false);
    }
  };

  const getFilePath = (fileUrl: string) => {
    try {
      const parts = fileUrl.split('/documents/');
      if (parts.length > 1) {
        return parts.slice(1).join('/documents/');
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSecureAction = async (doc: Document, action: 'open' | 'download') => {
    try {
      setActionLoading(`${doc.id}-${action}`);
      const filePath = getFilePath(doc.file_url);

      if (!filePath) {
        console.error("Impossible de résoudre le chemin du fichier", doc.file_url);
        return;
      }

      const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 60, {
        download: action === 'download' ? doc.title : false,
      });

      if (error) throw error;

      if (data?.signedUrl) {
        if (action === 'download') {
          const a = document.createElement('a');
          a.href = data.signedUrl;
          a.download = doc.title;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          window.open(data.signedUrl, '_blank');
        }
      }
    } catch (err) {
      console.error("Erreur d'accès fichier sécurisé :", err);
      alert("Erreur lors de l'accès sécurisé au fichier.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = async (doc: Document) => {
    setPreviewDoc(doc);
    setSignedPreviewUrl(null);

    const filePath = getFilePath(doc.file_url);
    if (filePath) {
      const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600);
      if (data?.signedUrl) {
        setSignedPreviewUrl(data.signedUrl);
      }
    }

    await (supabase as any)
      .from('documents')
      .update({ views_count: (doc.views_count || 0) + 1 })
      .eq('id', doc.id);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Non categorise';
    return categories.find((c) => c.id === categoryId)?.name || 'Inconnue';
  };

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return '#94A3B8';
    return categories.find((c) => c.id === categoryId)?.color || '#94A3B8';
  };

  const isPreviewable = (fileType: string) => {
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType.toLowerCase());
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
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Liste
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Grille
          </button>
        </div>
      </div>

      {documents.length > 0 ? (
        viewMode === 'table' ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">N° Enregistrement</th>
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
                        <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {doc.registration_number || '-'}
                        </span>
                      </td>
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
                            {doc.description && (
                              <p className="text-xs text-slate-500 truncate max-w-xs">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {doc.document_date ? new Date(doc.document_date).toLocaleDateString('fr-FR') : 'Date inconnue'}
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
                        {doc.keywords && doc.keywords.length > 0 ? (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Tag className="w-3.5 h-3.5" />
                            <span className="text-sm">{(doc.keywords || []).slice(0, 2).join(', ')}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {isPreviewable(doc.file_type) && (
                            <button
                              onClick={() => handlePreview(doc)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Apercu"
                            >
                              <Maximize2 className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleSecureAction(doc, 'open')}
                            className={`p-2 rounded-lg transition-colors ${actionLoading === `${doc.id}-open` ? 'opacity-50 cursor-wait bg-slate-100' : 'hover:bg-slate-100'}`}
                            title="Ouvrir"
                            disabled={!!actionLoading}
                          >
                            <ExternalLink className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleSecureAction(doc, 'download')}
                            className={`p-2 rounded-lg transition-colors ${actionLoading === `${doc.id}-download` ? 'opacity-50 cursor-wait bg-emerald-50' : 'hover:bg-emerald-50'}`}
                            title="Telecharger"
                            disabled={!!actionLoading}
                          >
                            <Download className="w-4 h-4 text-emerald-600" />
                          </button>
                          {profile?.role !== 'reader' && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div
                  className="h-3 w-full"
                  style={{ backgroundColor: getCategoryColor(doc.category_id) }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${getCategoryColor(doc.category_id)}20` }}
                    >
                      <FileText className="w-5 h-5" style={{ color: getCategoryColor(doc.category_id) }} />
                    </div>
                    {doc.is_important && (
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="mb-2">
                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {doc.registration_number || '-'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-xs text-slate-500 mb-2 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    {doc.document_date ? new Date(doc.document_date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    <span className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor: `${getCategoryColor(doc.category_id)}15`,
                        color: getCategoryColor(doc.category_id),
                      }}
                    >
                      {getCategoryName(doc.category_id)}
                    </span>
                  </div>
                  {doc.keywords && doc.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(doc.keywords || []).slice(0, 3).map((kw) => (
                        <span key={kw} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-100">
                    {isPreviewable(doc.file_type) && (
                      <button
                        onClick={() => handlePreview(doc)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Maximize2 className="w-4 h-4 text-blue-600" />
                      </button>
                    )}
                    <button onClick={() => handleSecureAction(doc, 'open')} disabled={!!actionLoading}
                      className={`p-2 rounded-lg transition-colors ${actionLoading === `${doc.id}-open` ? 'opacity-50 cursor-wait bg-slate-100' : 'hover:bg-slate-100'}`}>
                      <ExternalLink className="w-4 h-4 text-slate-600" />
                    </button>
                    <button onClick={() => handleSecureAction(doc, 'download')} disabled={!!actionLoading}
                      className={`p-2 rounded-lg transition-colors ${actionLoading === `${doc.id}-download` ? 'opacity-50 cursor-wait bg-emerald-50' : 'hover:bg-emerald-50'}`}>
                      <Download className="w-4 h-4 text-emerald-600" />
                    </button>
                    {profile?.role !== 'reader' && (
                      <button onClick={() => setDeletionModal(doc)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Aucun document</h3>
          <p className="text-slate-600">Commencez par ajouter votre premier document</p>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-900">{previewDoc.title}</h3>
                <p className="text-sm text-slate-500">
                  {previewDoc.file_type.toUpperCase()} - {previewDoc.document_date ? new Date(previewDoc.document_date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSecureAction(previewDoc, 'open')}
                  disabled={!!actionLoading}
                  className={`p-2 rounded-lg transition-colors ${actionLoading === `${previewDoc.id}-open` ? 'opacity-50 cursor-wait bg-slate-100' : 'hover:bg-slate-100'}`}
                  title="Ouvrir"
                >
                  <ExternalLink className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={() => handleSecureAction(previewDoc, 'download')}
                  disabled={!!actionLoading}
                  className={`p-2 rounded-lg transition-colors ${actionLoading === `${previewDoc.id}-download` ? 'opacity-50 cursor-wait bg-emerald-50' : 'hover:bg-emerald-50'}`}
                  title="Telecharger"
                >
                  <Download className="w-5 h-5 text-emerald-600" />
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              {!signedPreviewUrl ? (
                <div className="flex items-center justify-center p-20 min-h-[60vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewDoc.file_type.toLowerCase()) ? (
                <img
                  src={signedPreviewUrl}
                  alt={previewDoc.title}
                  className="max-w-full mx-auto rounded-lg shadow-lg"
                />
              ) : previewDoc.file_type.toLowerCase() === 'pdf' ? (
                <iframe
                  src={signedPreviewUrl}
                  className="w-full h-full min-h-[60vh] rounded-lg border-0"
                  title={previewDoc.title}
                />
              ) : (
                <div className="text-center py-20 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>Apercu non disponible pour ce type de fichier</p>
                  <button onClick={() => handleSecureAction(previewDoc, 'open')}
                    className="text-blue-600 hover:text-blue-700 text-sm mt-3 inline-block font-medium border border-blue-200 px-4 py-2 rounded-lg">
                    Ouvrir dans un nouvel onglet
                  </button>
                </div>
              )}
            </div>
          </div>
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
                    La suppression necessite l'approbation des administrateurs. Le document sera
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
