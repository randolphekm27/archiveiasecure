import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type PageState = 'loading' | 'ready' | 'error' | 'success';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageState, setPageState] = useState<PageState>('loading');
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * Supabase sends the recovery token in the URL hash:
     * /reset-password#access_token=xxx&type=recovery&...
     *
     * The Supabase JS client automatically exchanges this hash for a session
     * when `onAuthStateChange` fires with the PASSWORD_RECOVERY event.
     * We must WAIT for this event before showing the form.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        // Token is valid - show the form
        setPageState('ready');
      } else if (event === 'SIGNED_IN' && session) {
        // Sometimes the event is SIGNED_IN instead of PASSWORD_RECOVERY
        // Check the URL hash to confirm this is a recovery flow
        if (window.location.hash.includes('type=recovery')) {
          setPageState('ready');
        }
      }
    });

    // Safety timeout: if after 5 seconds no recovery event fired,
    // check if the hash is completely missing (direct navigation, not from email link)
    const timeout = setTimeout(() => {
      setPageState((current) => {
        if (current === 'loading') {
          const hash = window.location.hash;
          if (!hash || !hash.includes('access_token')) {
            return 'error';
          }
          // Hash exists but event didn't fire yet — keep waiting a bit more
          return 'loading';
        }
        return current;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setFormError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password);
      setPageState('success');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">ArchivIA Pro</h1>
          <p className="text-slate-600">Réinitialisation du mot de passe</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* --- LOADING --- */}
          {pageState === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Vérification du lien de récupération...</p>
              <p className="text-slate-400 text-sm mt-2">Veuillez patienter quelques secondes</p>
            </div>
          )}

          {/* --- ERROR: invalid/expired link --- */}
          {pageState === 'error' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Lien invalide ou expiré</h2>
              <p className="text-slate-600 mb-6">
                Ce lien de récupération est invalide ou a expiré. Les liens sont valables <strong>1 heure</strong>.
                Veuillez soumettre une nouvelle demande.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/30"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {/* --- SUCCESS --- */}
          {pageState === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Mot de passe mis à jour !</h2>
              <p className="text-slate-600 mb-6">
                Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Aller à la connexion
              </button>
            </div>
          )}

          {/* --- FORM --- */}
          {pageState === 'ready' && (
            <>
              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Au moins 8 caractères"
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mise à jour...
                    </span>
                  ) : 'Enregistrer le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          ArchivIA Pro — Sécurité maximale
        </p>
      </div>
    </div>
  );
}
