import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Clock, FileText, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import type { Database } from '../lib/database.types';

type TrashItem = Database['public']['Tables']['secure_trash']['Row'];
type UserProfile = Database['public']['Tables']['users']['Row'];

interface TrashWithDetails extends TrashItem {
  deleter?: UserProfile;
  docTitle: string;
  docType: string;
}

export default function SecureTrashPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<TrashWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadTrash();
  }, [profile]);

  const loadTrash = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data: trashData } = await supabase
        .from('secure_trash')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .is('restored_at', null)
        .order('created_at', { ascending: false });

      if (!trashData) return;

      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', profile.organization_id);

      const enriched: TrashWithDetails[] = trashData.map((item) => {
        const docData = item.document_data as Record<string, any>;
        return {
          ...item,
          deleter: users?.find((u) => u.id === item.deleted_by),
          docTitle: docData?.title || 'Document sans titre',
          docType: docData?.file_type || 'inconnu',
        };
      });

      setItems(enriched);
    } catch (error) {
      console.error('Error loading trash:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashWithDetails) => {
    if (!profile) return;
    setRestoring(item.id);

    try {
      const { error: restoreError } = await supabase.rpc('restore_document', {
        trash_id: item.id
      });

      if (restoreError) throw restoreError;

      const docData = item.document_data as Record<string, any>;
      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'document.restored',
        documentId: item.document_id,
        details: { title: docData.title },
      });

      await loadTrash();
      alert('Document restauré avec succès !');
    } catch (error) {
      console.error('Error restoring document:', error);
      alert('Erreur lors de la restauration du document.');
    } finally {
      setRestoring(null);
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Corbeille Securisee</h2>
        <p className="text-slate-600">
          Documents supprimes conserves 30 jours avant suppression definitive
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Les documents dans la corbeille seront definitivement supprimes apres 30 jours.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              N'importe quel administrateur peut restaurer un document pendant cette periode.
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
          <Trash2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Corbeille vide</h3>
          <p className="text-slate-600">Aucun document supprime</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const daysLeft = getDaysRemaining(item.expires_at);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.docTitle}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1 text-sm text-slate-500">
                          <User className="w-3.5 h-3.5" />
                          Supprime par {item.deleter?.full_name}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span
                        className={`text-sm font-medium ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 14 ? 'text-amber-600' : 'text-slate-600'
                          }`}
                      >
                        {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
                      </span>
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${daysLeft <= 7 ? 'bg-red-500' : daysLeft <= 14 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                          style={{ width: `${(daysLeft / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={restoring === item.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className={`w-4 h-4 ${restoring === item.id ? 'animate-spin' : ''}`} />
                      Restaurer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
