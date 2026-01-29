import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Invitation = Database['public']['Tables']['user_invitations']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
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
        setError('Cette invitation est invalide ou a expiré');
        setLoading(false);
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        setError('Cette invitation a expiré');
        setLoading(false);
        return;
      }

      setInvitation(inv);

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', inv.organization_id)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!org) throw new Error('Organization not found');

      setOrganization(org);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError('Erreur lors du chargement de l\'invitation');
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
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const virtualEmail = `${formData.username}+${organization.code}@archivia.app`;

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
          full_name: invitation.full_name || '',
          email: invitation.email,
          role: invitation.role,
        });

        if (profileError) throw profileError;

        const { error: updateError } = await supabase
          .from('user_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        if (updateError) throw updateError;

        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur lors de l\'acceptation de l\'invitation');
      }
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-8">
          <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Rejoindre une organisation</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Erreur</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Succès!</p>
              <p className="text-sm text-green-700 mt-1">Redirection en cours...</p>
            </div>
          </div>
        )}

        {!error && invitation && organization && !success && (
          <>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-700">
                Vous êtes invité à rejoindre <strong>{organization.name}</strong> en tant que <strong>{invitation.role === 'admin' ? 'Administrateur' : invitation.role === 'editor' ? 'Éditeur' : 'Lecteur'}</strong>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Adresse email
                </label>
                <input
                  type="email"
                  disabled
                  value={invitation.email}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Identifiant
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Votre identifiant unique"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Au moins 6 caractères"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Confirmez votre mot de passe"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-2 rounded-lg font-medium transition-colors"
              >
                {submitting ? 'Traitement...' : 'Accepter l\'invitation'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
