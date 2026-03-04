import { useState } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Mail,
  User,
  Calendar,
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type Invitation = Database['public']['Tables']['user_invitations']['Row'] & {
  inviter_name?: string;
};

interface Props {
  invitations: Invitation[];
  onRefresh: () => void;
  onCopyLink: (url: string) => void;
}

function getStatus(inv: Invitation): 'accepted' | 'expired' | 'pending' {
  if (inv.accepted_at) return 'accepted';
  if (new Date(inv.expires_at) < new Date()) return 'expired';
  return 'pending';
}

function getStatusDisplay(status: 'accepted' | 'expired' | 'pending') {
  switch (status) {
    case 'accepted':
      return { label: 'Acceptee', icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'expired':
      return { label: 'Expiree', icon: XCircle, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
    case 'pending':
      return { label: 'En attente', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  }
}

const getRoleFr = (role: string) => {
  switch (role) {
    case 'admin': return 'Administrateur';
    case 'editor': return 'Editeur';
    default: return 'Lecteur';
  }
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return { bg: 'bg-rose-100', text: 'text-rose-700' };
    case 'editor':
      return { bg: 'bg-blue-100', text: 'text-blue-700' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700' };
  }
};

export default function InvitationHistory({ invitations, onRefresh, onCopyLink }: Props) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'expired'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = filter === 'all'
    ? invitations
    : invitations.filter((inv) => getStatus(inv) === filter);

  const counts = {
    all: invitations.length,
    pending: invitations.filter((i) => getStatus(i) === 'pending').length,
    accepted: invitations.filter((i) => getStatus(i) === 'accepted').length,
    expired: invitations.filter((i) => getStatus(i) === 'expired').length,
  };

  const handleCopy = (inv: Invitation) => {
    const url = `${window.location.origin}/join/${inv.token}`;
    onCopyLink(url);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Journal des invitations ({invitations.length})
        </h3>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="flex gap-2">
        {([
          { key: 'all' as const, label: 'Toutes' },
          { key: 'pending' as const, label: 'En attente' },
          { key: 'accepted' as const, label: 'Acceptees' },
          { key: 'expired' as const, label: 'Expirees' },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune invitation {filter !== 'all' ? 'dans cette categorie' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const status = getStatus(inv);
            const statusDisplay = getStatusDisplay(status);
            const StatusIcon = statusDisplay.icon;
            const roleBadge = getRoleBadge(inv.role);

            return (
              <div
                key={inv.id}
                className={`p-4 border rounded-lg transition-colors ${statusDisplay.border} ${statusDisplay.bg} bg-opacity-30`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      status === 'accepted' ? 'bg-green-100' : status === 'expired' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <User className={`w-5 h-5 ${
                        status === 'accepted' ? 'text-green-600' : status === 'expired' ? 'text-red-500' : 'text-amber-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">{inv.full_name || 'Sans nom'}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusDisplay.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge.bg} ${roleBadge.text}`}>
                          {getRoleFr(inv.role)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{inv.email}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Envoyee le {new Date(inv.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </span>
                        {inv.inviter_name && (
                          <span>par {inv.inviter_name}</span>
                        )}
                        {status === 'accepted' && inv.accepted_at && (
                          <span className="text-green-600">
                            Acceptee le {new Date(inv.accepted_at).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="text-amber-600">
                            Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR', {
                              day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      {inv.personal_message && (
                        <p className="text-sm text-slate-500 mt-2 italic border-l-2 border-slate-300 pl-3">
                          "{inv.personal_message}"
                        </p>
                      )}
                    </div>
                  </div>

                  {status === 'pending' && (
                    <button
                      onClick={() => handleCopy(inv)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
                    >
                      {copiedId === inv.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600">Copie</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-600">Copier le lien</span>
                        </>
                      )}
                    </button>
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
