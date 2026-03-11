import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type PageState = 'loading' | 'ready' | 'error' | 'success';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [pageState, setPageState] = useState<PageState>('loading');
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let safetyTimeout: ReturnType<typeof setTimeout>;

    const handleSession = async () => {
      try {
        // 1. Vérifier si on a un code dans l'URL (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          // Échanger le code contre une session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // 2. Vérifier si on a une session active
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          if (mounted) setPageState('ready');
          return;
        }

        // 3. Pas de session encore — attendre l'event PASSWORD_RECOVERY (5s)
        safetyTimeout = setTimeout(() => {
          if (mounted) setPageState('error');
        }, 5000);

      } catch (err) {
        console.error('[Reset] Error:', err);
        if (mounted) setPageState('error');
      }
    };

    // Écouter les événements d'auth Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) && mounted) {
        clearTimeout(safetyTimeout);
        setPageState('ready');
      }
    });

    handleSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
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
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setSubmitting(false);
    }
  };

  const strengthLevel = (() => {
    if (password.length < 6) return 0;
    if (password.length < 9) return 1;
    if (password.length < 12) return 2;
    return 3;
  })();

  const strengthConfig = [
    { label: 'Trop court', color: 'bg-red-400' },
    { label: 'Acceptable', color: 'bg-orange-400' },
    { label: 'Bon', color: 'bg-yellow-400' },
    { label: 'Excellent', color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">ArchivIA Pro</h1>
          <p className="text-slate-600">Réinitialisation du mot de passe</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* LOADING */}
          {pageState === 'loading' && (
            <div className="text-center py-10">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-700 font-medium">Vérification du lien...</p>
              <p className="text-slate-400 text-sm mt-2">Validation en cours, veuillez patienter</p>
            </div>
          )}

          {/* ERROR */}
          {pageState === 'error' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Lien invalide ou expiré</h2>
              <p className="text-slate-600 mb-6">
                Ce lien de récupération est invalide ou a expiré.
                Les liens sont valables <strong>1 heure</strong>.
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

          {/* SUCCESS */}
          {pageState === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Mot de passe mis à jour !</h2>
              <p className="text-slate-600 mb-6">
                Votre mot de passe a été modifié avec succès.
                Vous allez être redirigé vers la page de connexion.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Aller à la connexion
              </button>
            </div>
          )}

          {/* FORM */}
          {pageState === 'ready' && (
            <>
              {formError && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nouveau mot de passe
                    <span className="text-slate-400 font-normal ml-1">(min. 8 caractères)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Au moins 8 caractères"
                      className="w-full pl-11 pr-16 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
                    >
                      {showPassword ? 'Masquer' : 'Voir'}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              level <= strengthLevel
                                ? strengthConfig[strengthLevel].color
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">{strengthConfig[strengthLevel].label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répétez votre nouveau mot de passe"
                      className={`w-full pl-11 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                        confirmPassword && confirmPassword !== password
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-300'
                      }`}
                    />
                    {confirmPassword && confirmPassword === password && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || password.length < 8 || password !== confirmPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30 mt-2"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mise à jour...
                    </span>
                  ) : (
                    'Enregistrer le nouveau mot de passe'
                  )}
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
