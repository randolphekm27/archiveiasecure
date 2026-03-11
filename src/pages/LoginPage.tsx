import { useState } from 'react';
import { Building2, Lock, User, Mail, CircleUser as UserCircle2, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdOrg, setCreatedOrg] = useState<{ code: string; username: string } | null>(null);
  const { signIn, createOrganization } = useAuth();

  const [loginForm, setLoginForm] = useState({
    orgCode: '',
    username: '',
    password: '',
  });

  const [createForm, setCreateForm] = useState({
    orgName: '',
    orgCode: '',
    adminEmail: '',
    adminName: '',
    adminUsername: '',
    adminJobTitle: '',
    adminPassword: '',
    confirmPassword: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(loginForm.orgCode, loginForm.username.trim(), loginForm.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (createForm.adminPassword !== createForm.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (createForm.adminPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const code = createForm.orgCode.toUpperCase();
      await createOrganization({
        name: createForm.orgName,
        code,
        adminEmail: createForm.adminEmail,
        adminPassword: createForm.adminPassword,
        adminName: createForm.adminName,
        adminUsername: createForm.adminUsername,
        adminJobTitle: createForm.adminJobTitle,
      });

      setCreatedOrg({ code, username: createForm.adminUsername });
      setLoginForm({
        orgCode: code,
        username: createForm.adminUsername,
        password: createForm.adminPassword,
      });

      setTimeout(() => {
        setMode('login');
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation');
    } finally {
      setLoading(false);
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
          <p className="text-slate-600">Gestion intelligente d'archives</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${mode === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Se Connecter
            </button>
            <button
              onClick={() => { setMode('create'); setError(''); setCreatedOrg(null); }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${mode === 'create'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Creer Organisation
            </button>
          </div>

          {createdOrg && mode === 'login' && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-800">Organisation creee avec succes !</span>
              </div>
              <p className="text-sm text-emerald-700 mb-2">
                Connectez-vous avec les identifiants suivants :
              </p>
              <div className="bg-white rounded-lg p-3 space-y-1 text-sm">
                <p><span className="font-medium text-slate-600">Code :</span> <span className="font-mono text-slate-900">{createdOrg.code}</span></p>
                <p><span className="font-medium text-slate-600">Utilisateur :</span> <span className="font-mono text-slate-900">{createdOrg.username}</span></p>
                <p><span className="font-medium text-slate-600">Mot de passe :</span> <span className="text-slate-900">celui que vous avez choisi</span></p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Code Organisation
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginForm.orgCode}
                    onChange={(e) => setLoginForm({ ...loginForm, orgCode: e.target.value.toUpperCase() })}
                    placeholder="Ex: MEMP_2024"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    placeholder="Votre identifiant"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Votre mot de passe"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
              >
                {loading ? 'Connexion...' : 'Se Connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom de l'organisation
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createForm.orgName}
                    onChange={(e) => setCreateForm({ ...createForm, orgName: e.target.value })}
                    placeholder="Ex: Ministere de l'Education"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Code unique (sans espaces)
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createForm.orgCode}
                    onChange={(e) => setCreateForm({ ...createForm, orgCode: e.target.value.replace(/\s/g, '_').toUpperCase() })}
                    placeholder="Ex: MEMP_2024"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition font-mono"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Ce code sera utilise pour la connexion</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nom de l'administrateur
                  </label>
                  <div className="relative">
                    <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={createForm.adminName}
                      onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                      placeholder="Prenom et nom"
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Fonction / Poste
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={createForm.adminJobTitle}
                      onChange={(e) => setCreateForm({ ...createForm, adminJobTitle: e.target.value })}
                      placeholder="Ex: CEO, Archiviste..."
                      className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom d'utilisateur (pour la connexion)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createForm.adminUsername}
                    onChange={(e) => setCreateForm({ ...createForm, adminUsername: e.target.value })}
                    placeholder="Ex: jean.dupont"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email administrateur
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={createForm.adminEmail}
                    onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    placeholder="admin@organisation.com"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={createForm.adminPassword}
                    onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                    placeholder="Votre mot de passe"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirmer mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    placeholder="Confirmer le mot de passe"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  Utilisez votre <strong>nom d'utilisateur</strong> et le <strong>code de l'organisation</strong> pour vous connecter.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/30"
              >
                {loading ? 'Creation...' : 'Creer l\'Organisation'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Une solution securisee pour vos archives
        </p>
      </div>
    </div>
  );
}
