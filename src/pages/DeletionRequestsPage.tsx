import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileText,
  Clock,
  User,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import type { Database } from '../lib/database.types';

type DeletionRequest = Database['public']['Tables']['deletion_requests']['Row'];
type DeletionVote = Database['public']['Tables']['deletion_votes']['Row'];
type UserProfile = Database['public']['Tables']['users']['Row'];
type Document = Database['public']['Tables']['documents']['Row'];

interface RequestWithDetails extends DeletionRequest {
  document?: Document;
  requester?: UserProfile;
  votes: (DeletionVote & { voter?: UserProfile })[];
}

export default function DeletionRequestsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [voteComment, setVoteComment] = useState('');
  const [activeVoteRequest, setActiveVoteRequest] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadRequests();
  }, [profile, filter]);

  const loadRequests = async () => {
    if (!profile?.organization_id) return;

    try {
      let query = supabase
        .from('deletion_requests')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.in('status', ['pending', 'info_requested']);
      }

      const { data: reqData } = await query;
      if (!reqData) return;

      const [{ data: users }, { data: docs }, { data: votes }] = await Promise.all([
        supabase.from('users').select('*').eq('organization_id', profile.organization_id),
        supabase.from('documents').select('*').eq('organization_id', profile.organization_id),
        supabase.from('deletion_votes').select('*'),
      ]);

      const enriched: RequestWithDetails[] = reqData.map((req) => ({
        ...req,
        document: docs?.find((d) => d.id === req.document_id),
        requester: users?.find((u) => u.id === req.requested_by),
        votes: (votes || [])
          .filter((v) => v.deletion_request_id === req.id)
          .map((v) => ({ ...v, voter: users?.find((u) => u.id === v.voter_id) })),
      }));

      setRequests(enriched);
    } catch (error) {
      console.error('Error loading deletion requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (requestId: string, vote: 'approve' | 'reject' | 'info_needed') => {
    if (!profile) return;
    setSubmitting(true);

    try {
      const { error: voteError } = await supabase.from('deletion_votes').insert({
        deletion_request_id: requestId,
        voter_id: profile.id,
        vote,
        comment: voteComment || null,
      });

      if (voteError) throw voteError;

      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'document.delete_vote',
        details: { request_id: requestId, vote, comment: voteComment },
      });

      const request = requests.find((r) => r.id === requestId);
      if (request) {
        const { data: allVotes } = await supabase
          .from('deletion_votes')
          .select('*')
          .eq('deletion_request_id', requestId);

        if (allVotes) {
          const approvals = allVotes.filter((v) => v.vote === 'approve').length;
          const rejections = allVotes.filter((v) => v.vote === 'reject').length;
          const infoNeeded = allVotes.filter((v) => v.vote === 'info_needed').length;

          if (approvals >= request.votes_required) {
            await supabase
              .from('deletion_requests')
              .update({ status: 'approved', resolved_at: new Date().toISOString() })
              .eq('id', requestId);

            if (request.document) {
              await supabase.from('secure_trash').insert({
                organization_id: profile.organization_id,
                document_id: request.document_id,
                document_data: request.document as any,
                deletion_request_id: requestId,
                deleted_by: profile.id,
              });

              await supabase.from('documents').delete().eq('id', request.document_id);

              await logActivity({
                organizationId: profile.organization_id,
                userId: profile.id,
                action: 'document.deleted',
                documentId: request.document_id,
                details: { title: request.document.title, via_request: requestId },
              });
            }
          } else if (rejections > 0) {
            await supabase
              .from('deletion_requests')
              .update({ status: 'rejected', resolved_at: new Date().toISOString() })
              .eq('id', requestId);
          } else if (infoNeeded > 0) {
            await supabase
              .from('deletion_requests')
              .update({ status: 'info_requested' })
              .eq('id', requestId);
          }
        }
      }

      setVoteComment('');
      setActiveVoteRequest(null);
      await loadRequests();
    } catch (error) {
      console.error('Error casting vote:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const hasVoted = (request: RequestWithDetails) => {
    return request.votes.some((v) => v.voter_id === profile?.id);
  };

  const isOwnRequest = (request: RequestWithDetails) => {
    return request.requested_by === profile?.id;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'approved':
        return { label: 'Approuvee', bg: 'bg-green-100', text: 'text-green-700' };
      case 'rejected':
        return { label: 'Rejetee', bg: 'bg-red-100', text: 'text-red-700' };
      case 'info_requested':
        return { label: 'Info demandee', bg: 'bg-blue-100', text: 'text-blue-700' };
      default:
        return { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
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
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Demandes de Suppression</h2>
          <p className="text-slate-600">
            Validation collective avant suppression de documents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Toutes
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Aucune demande</h3>
          <p className="text-slate-600">
            {filter === 'pending'
              ? 'Aucune demande de suppression en attente'
              : 'Aucune demande de suppression'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const status = getStatusBadge(request.status);
            const approvals = request.votes.filter((v) => v.vote === 'approve').length;
            return (
              <div key={request.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">
                          {request.document?.title || 'Document introuvable'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-sm text-slate-500">
                            <User className="w-3.5 h-3.5" />
                            {request.requester?.full_name}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(request.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">Raison de la demande :</p>
                    <p className="text-sm text-slate-600">{request.reason || 'Aucune raison fournie'}</p>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {request.votes.map((v) => (
                          <div
                            key={v.id}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ${
                              v.vote === 'approve'
                                ? 'bg-green-100 text-green-700'
                                : v.vote === 'reject'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                            title={`${v.voter?.full_name}: ${
                              v.vote === 'approve' ? 'Approuve' : v.vote === 'reject' ? 'Rejete' : 'Info demandee'
                            }`}
                          >
                            {v.voter?.full_name?.charAt(0) || '?'}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm text-slate-600">
                        {approvals}/{request.votes_required} approbations
                      </span>
                    </div>
                    <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(approvals / request.votes_required) * 100}%` }}
                      />
                    </div>
                  </div>

                  {request.votes.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {request.votes.map((v) => (
                        <div key={v.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              v.vote === 'approve'
                                ? 'bg-green-100'
                                : v.vote === 'reject'
                                ? 'bg-red-100'
                                : 'bg-blue-100'
                            }`}
                          >
                            {v.vote === 'approve' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : v.vote === 'reject' ? (
                              <XCircle className="w-4 h-4 text-red-600" />
                            ) : (
                              <HelpCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">{v.voter?.full_name}</p>
                            {v.comment && (
                              <p className="text-sm text-slate-600 mt-0.5">{v.comment}</p>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(v.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {request.status !== 'approved' &&
                    request.status !== 'rejected' &&
                    !hasVoted(request) &&
                    !isOwnRequest(request) && (
                      <div className="border-t border-slate-200 pt-4">
                        {activeVoteRequest === request.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={voteComment}
                              onChange={(e) => setVoteComment(e.target.value)}
                              placeholder="Commentaire (optionnel)"
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVote(request.id, 'approve')}
                                disabled={submitting}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approuver
                              </button>
                              <button
                                onClick={() => handleVote(request.id, 'reject')}
                                disabled={submitting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                Refuser
                              </button>
                              <button
                                onClick={() => handleVote(request.id, 'info_needed')}
                                disabled={submitting}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                <HelpCircle className="w-4 h-4" />
                                Demander info
                              </button>
                              <button
                                onClick={() => {
                                  setActiveVoteRequest(null);
                                  setVoteComment('');
                                }}
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveVoteRequest(request.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Voter sur cette demande
                          </button>
                        )}
                      </div>
                    )}

                  {isOwnRequest(request) && request.status === 'pending' && (
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Vous avez initie cette demande - en attente des votes des autres administrateurs</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
