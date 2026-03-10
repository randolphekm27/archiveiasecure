import { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Shield,
  Calendar,
  Activity,
  FileText,
  Clock,
  Eye,
  Upload,
  Search,
  Download,
  UserPlus,
  Settings,
  FolderOpen,
  Trash2,
  RotateCcw,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getActionInfo } from '../lib/activityLogger';
import type { Database } from '../lib/database.types';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export default function ProfilePage() {
  const { profile, organization, refreshProfile } = useAuth();
  const [personalLogs, setPersonalLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    fullName: '',
    jobTitle: '',
  });

  useEffect(() => {
    if (profile) {
      loadPersonalActivity();
      setEditData({
        fullName: profile.full_name || '',
        jobTitle: (profile as any).job_title || '',
      });
    }
  }, [profile]);

  const loadPersonalActivity = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setPersonalLogs(data);
    } catch (error) {
      console.error('Error loading personal activity:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('users')
        .update({
          full_name: editData.fullName,
          job_title: editData.jobTitle,
        })
        .eq('id', profile.id);

      if (error) throw error;
      setEditing(false);
      
      alert('Profil mis a jour avec succes !');
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erreur lors de la mise a jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const getPermissions = () => {
    const base: { icon: any; text: string; allowed: boolean }[] = [
      { icon: Eye, text: 'Consulter tous les documents', allowed: true },
      { icon: Search, text: 'Recherche simple et avancee', allowed: true },
      { icon: Download, text: 'Telecharger les documents', allowed: true },
      { icon: User, text: 'Modifier son profil personnel', allowed: true },
    ];

    const editor: { icon: any; text: string; allowed: boolean }[] = [
      { icon: Upload, text: 'Scanner et ajouter des documents', allowed: profile?.role !== 'reader' },
      { icon: FileText, text: 'Modifier les metadonnees des documents', allowed: profile?.role !== 'reader' },
      { icon: FolderOpen, text: 'Creer des dossiers et organiser', allowed: profile?.role !== 'reader' },
    ];

    const admin: { icon: any; text: string; allowed: boolean }[] = [
      { icon: UserPlus, text: 'Inviter de nouveaux membres', allowed: profile?.role === 'admin' },
      { icon: Shield, text: 'Definir les roles des utilisateurs', allowed: profile?.role === 'admin' },
      { icon: Settings, text: 'Configurer les parametres', allowed: profile?.role === 'admin' },
      { icon: Activity, text: "Voir le journal d'activite complet", allowed: profile?.role === 'admin' },
      { icon: Trash2, text: 'Demander la suppression de documents', allowed: profile?.role === 'admin' },
      { icon: RotateCcw, text: 'Restaurer des documents supprimes', allowed: profile?.role === 'admin' },
    ];

    return [...base, ...editor, ...admin].filter((p) => p.allowed);
  };

  const getRoleFr = () => {
    switch (profile?.role) {
      case 'admin': return 'Administrateur';
      case 'editor': return 'Editeur';
      default: return 'Lecteur';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Mon Compte</h2>
        <p className="text-slate-600">Informations personnelles et activite</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-600">
                {profile?.full_name?.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-slate-900">{profile?.full_name}</h3>
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full transition-colors"
              >
                {editing ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            <p className="text-slate-600">@{profile?.username}</p>
            {profile?.email && <p className="text-sm text-slate-500 mt-0.5">{profile.email}</p>}
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  value={editData.fullName}
                  onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Fonction / Poste
                </label>
                <input
                  type="text"
                  required
                  value={editData.jobTitle}
                  onChange={(e) => setEditData({ ...editData, jobTitle: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-slate-600" />
                <p className="text-sm text-slate-600">Poste / Fonction</p>
              </div>
              <p className="font-medium text-slate-900">{(profile as any)?.job_title || 'Non defini'}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-slate-600" />
                <p className="text-sm text-slate-600">Role</p>
              </div>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  profile?.role === 'admin'
                    ? 'bg-rose-100 text-rose-700'
                    : profile?.role === 'editor'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {getRoleFr()}
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-slate-600" />
                <p className="text-sm text-slate-600">Organisation</p>
              </div>
              <p className="font-medium text-slate-900">{organization?.name}</p>
              <p className="text-sm text-slate-600 mt-1">Code: {organization?.code}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-slate-600" />
                <p className="text-sm text-slate-600">Membre depuis</p>
              </div>
              <p className="font-medium text-slate-900">
                {profile?.created_at &&
                  new Date(profile.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Mes autorisations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {getPermissions().map((perm, i) => {
            const Icon = perm.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-slate-700">{perm.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Mon activite recente
        </h3>

        {loadingLogs ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : personalLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Aucune activite enregistree</p>
          </div>
        ) : (
          <div className="space-y-2">
            {personalLogs.map((log) => {
              const actionInfo = getActionInfo(log.action);
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: actionInfo.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-900">{actionInfo.label}</span>
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
