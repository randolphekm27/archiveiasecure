import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileText,
  Clock,
  User,
  AlertTriangle,
  Users,
  Zap,
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
  const [adminCount, setAdminCount] = useState(0);
  const [voteComments, setVoteComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadRequests();
  }, [profile, filter]);

  const loadRequests = async () => {
    if (!profile?.organization_id) return;

    try {
      const [reqResult, usersResult, docsResult, votesResult] = await Promise.all([
        supabase
          .from('deletion_requests')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .in('status', filter === 'pending' ? ['pending', 'info_requested'] : ['pending', 'approved', 'rejected', 'info_requested'])
          .order('created_at', { ascending: false }),
        supabase.from('users').select('*').eq('organization_id', profile.organization_id),
        supabase.from('documents').select('*').eq('organization_id', profile.organization_id),
        supabase.from('deletion_votes').select('*'),
      ]);

      const users = usersResult.data || [];
      const docs = docsResult.data || [];
      const votes = votesResult.data || [];
      const reqData = reqResult.data || [];

      const admins = users.filter((u: any) => u.role === 'admin');
      setAdminCount(admins.length);

      const enriched: RequestWithDetails[] = reqData.map((req: any) => ({
        ...req,
        document: docs.find((d: any) => d.id === req.document_id),
        requester: users.find((u: any) => u.id === req.requested_by),
        votes: votes
          .filter((v: any) => v.deletion_request_id === req.id)
          .map((v: any) => ({ ...v, voter: users.find((u: any) => u.id === v.voter_id) })),
      }));

      setRequests(enriched);
    } catch (error) {
      console.error('Error loading deletion requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveVotesRequired = (request: RequestWithDetails) => {
    if (adminCount <= 1) return 1;
    if (adminCount === 2) return 2;
    return Math.min(request.votes_required, adminCount);
  };

  const handleVote = async (requestId: string, vote: 'approve' | 'reject' | 'info_needed') => {
    if (!profile) return;
    setSubmitting(requestId);

    try {
      const comment = voteComments[requestId] || null;

      const { error: voteError } = await supabase.from('deletion_votes').insert({
        deletion_request_id: requestId,
        voter_id: profile.id,
        vote,
        comment,
      });

      if (voteError) throw voteError;

      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'document.delete_vote',
        details: { request_id: requestId, vote, comment },
      });

      setVoteComments((prev) => ({ ...prev, [requestId]: '' }));
      await loadRequests();
    } catch (error) {
      console.error('Error casting vote:', error);
    } finally {
      setSubmitting(null);
    }
  };

  const handleAutoApprove = async (requestId: string) => {
    if (!profile) return;
    setSubmitting(requestId);

    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) return;

      const { error: voteError } = await supabase.from('deletion_votes').insert({
        deletion_request_id: requestId,
        voter_id: profile.id,
        vote: 'approve',
        comment: 'Auto-approuve (administrateur unique)',
      });

      if (voteError) throw voteError;

      // The trigger will automatically resolve this since it meets the single-admin threshold
      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'document.delete_vote',
        details: { request_id: requestId, vote: 'approve', comment: 'Auto-approuve (administrateur unique)', auto_approved: true },
      });

      await loadRequests();
    } catch (error) {
      console.error('Error auto-approving:', error);
    } finally {
      setSubmitting(null);
    }
  };

  const hasVoted = (request: RequestWithDetails) => {
    return request.votes.some((v) => v.voter_id === profile?.id);
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

  const canVote = (request: RequestWithDetails) => {
    return (
      profile?.role === 'admin' &&
      request.status !== 'approved' &&
      request.status !== 'rejected' &&
      !hasVoted(request)
    );
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600">
            <Users className="w-4 h-4" />
            {adminCount} admin{adminCount > 1 ? 's' : ''}
            {adminCount <= 1 && (
              <span className="text-xs text-amber-600 font-medium ml-1">(auto-approbation)</span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              Toutes
            </button>
          </div>
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
            const effectiveRequired = getEffectiveVotesRequired(request);
            const isSingleAdmin = adminCount <= 1;
            const showVotePanel = canVote(request);

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
                            {request.created_at ? new Date(request.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : 'Date inconnue'}
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
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ${v.vote === 'approve'
                              ? 'bg-green-100 text-green-700'
                              : v.vote === 'reject'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                              }`}
                            title={`${v.voter?.full_name}: ${v.vote === 'approve' ? 'Approuve' : v.vote === 'reject' ? 'Rejete' : 'Info demandee'
                              }`}
                          >
                            {v.voter?.full_name?.charAt(0) || '?'}
                          </div>
                        ))}
                      </div>
                      <span className="text-sm text-slate-600">
                        {approvals}/{effectiveRequired} approbation{effectiveRequired > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min((approvals / effectiveRequired) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {request.votes.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {request.votes.map((v) => (
                        <div key={v.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${v.vote === 'approve'
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
                            {v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {showVotePanel && isSingleAdmin && (
                    <div className="border-t border-slate-200 pt-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
                        <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                          <Zap className="w-4 h-4" />
                          Vous etes le seul administrateur
                        </div>
                        <p className="text-sm text-amber-600">
                          La suppression sera executee immediatement apres votre approbation.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAutoApprove(request.id)}
                          disabled={submitting === request.id}
                          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {submitting === request.id ? 'Traitement...' : 'Approuver et supprimer'}
                        </button>
                        <button
                          onClick={() => handleVote(request.id, 'reject')}
                          disabled={submitting === request.id}
                          className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Refuser
                        </button>
                      </div>
                    </div>
                  )}

                  {showVotePanel && !isSingleAdmin && (
                    <div className="border-t border-slate-200 pt-4">
                      <div className="mb-3">
                        <textarea
                          value={voteComments[request.id] || ''}
                          onChange={(e) =>
                            setVoteComments((prev) => ({ ...prev, [request.id]: e.target.value }))
                          }
                          placeholder="Commentaire (optionnel)"
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVote(request.id, 'approve')}
                          disabled={submitting === request.id}
                          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleVote(request.id, 'reject')}
                          disabled={submitting === request.id}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Refuser
                        </button>
                        <button
                          onClick={() => handleVote(request.id, 'info_needed')}
                          disabled={submitting === request.id}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <HelpCircle className="w-4 h-4" />
                          Demander info
                        </button>
                      </div>
                    </div>
                  )}

                  {hasVoted(request) && request.status === 'pending' && (
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Vous avez deja vote - en attente des autres administrateurs</span>
                      </div>
                    </div>
                  )}

                  {request.requested_by === profile?.id && !hasVoted(request) && request.status === 'pending' && !isSingleAdmin && (
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
