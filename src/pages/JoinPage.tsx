import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, AlertCircle, CheckCircle, Shield, Lock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';

interface InvitationData {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  organization_id: string;
  personal_message: string | null;
  expires_at: string;
}

interface OrganizationData {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [inviterName, setInviterName] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      if (!token) {
        setError('Token invalide');
        setLoading(false);
        return;
      }

      const { data: inv, error: invError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .maybeSingle();

      if (invError) throw invError;

      if (!inv) {
        setError('Cette invitation est invalide ou a deja ete utilisee');
        setLoading(false);
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        setError('Cette invitation a expire. Demandez une nouvelle invitation a votre administrateur.');
        setLoading(false);
        return;
      }

      setInvitation(inv);
      if (inv.full_name) {
        setFormData((prev) => ({ ...prev, fullName: inv.full_name || '' }));
      }

      const [{ data: org }, { data: inviter }] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', inv.organization_id).maybeSingle(),
        supabase.from('users').select('full_name').eq('id', inv.invited_by).maybeSingle(),
      ]);

      if (!org) throw new Error('Organisation introuvable');
      setOrganization(org);
      if (inviter) setInviterName(inviter.full_name);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError("Erreur lors du chargement de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation || !organization) return;

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    if (!formData.acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation");
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const virtualEmail = `${formData.username}+${organization.code}@archivia.app`.toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: virtualEmail,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: virtualEmail,
          password: formData.password,
        });

        if (signInError) throw signInError;

        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          organization_id: organization.id,
          username: formData.username,
          full_name: formData.fullName,
          email: invitation.email,
          role: invitation.role as any,
        });

        if (profileError) throw profileError;

        const { error: updateError } = await supabase
          .from('user_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        if (updateError) throw updateError;

        await logActivity({
          organizationId: organization.id,
          userId: authData.user.id,
          action: 'user.joined',
          details: {
            full_name: formData.fullName,
            role: invitation.role,
            invited_by: inviterName,
          },
        });

        setSuccess(true);
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      if (err instanceof Error) {
        if (err.message.includes('already registered')) {
          setError('Un compte existe deja avec ce nom d\'utilisateur. Essayez un autre nom.');
        } else {
          setError(err.message);
        }
      } else {
        setError("Erreur lors de l'acceptation de l'invitation");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleFr = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'editor': return 'Editeur';
      case 'reader': return 'Lecteur';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de l'invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-blue-700 px-8 py-8 text-center">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt=""
                className="w-16 h-16 rounded-xl mx-auto mb-3 bg-white/10 object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-xl font-bold text-white">
              {organization?.name || 'Organisation'}
            </h1>
            <p className="text-blue-200 text-sm mt-1">ArchivIA Pro</p>
          </div>

          <div className="p-8">
            {error && !success && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Erreur</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Compte active !</h3>
                <p className="text-slate-600">Redirection vers votre espace...</p>
              </div>
            )}

            {!success && invitation && organization && (
              <>
                <div className="mb-6 space-y-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-sm text-slate-800">
                      <strong>{inviterName || 'Un administrateur'}</strong> vous invite a rejoindre{' '}
                      <strong>{organization.name}</strong>.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        Role : {getRoleFr(invitation.role)}
                      </span>
                    </div>
                  </div>

                  {invitation.personal_message && (
                    <div className="bg-slate-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                      <p className="text-sm text-slate-700 italic">"{invitation.personal_message}"</p>
                      <p className="text-xs text-slate-500 mt-1">- {inviterName}</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Votre nom complet
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Votre prenom et nom"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Ce nom sera utilise pour vous identifier dans l'organisation
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={invitation.email}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nom d'utilisateur
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s/g, '') })}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Choisissez un identifiant"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Vous utiliserez ce nom et le code <strong>{organization.code}</strong> pour vous connecter
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Au moins 6 caracteres"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Confirmez votre mot de passe"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="terms" className="text-sm text-slate-600">
                      J'accepte les conditions d'utilisation d'ArchivIA Pro et je m'engage a respecter la
                      confidentialite des documents de l'organisation.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-3 rounded-lg font-semibold transition-colors text-base"
                  >
                    {submitting ? 'Activation...' : 'Activer mon compte'}
                  </button>
                </form>
              </>
            )}

            {!invitation && !loading && error && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">
                  Si vous avez deja un compte, connectez-vous depuis la page de connexion.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
