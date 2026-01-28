import { User, Building2, Shield, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { profile, organization } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Mon Compte</h2>
        <p className="text-slate-600">Informations personnelles</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{profile?.full_name}</h3>
            <p className="text-slate-600">@{profile?.username}</p>
          </div>
        </div>

        <div className="space-y-4">
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
              <Shield className="w-4 h-4 text-slate-600" />
              <p className="text-sm text-slate-600">Rôle</p>
            </div>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                profile?.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : profile?.role === 'editor'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {profile?.role === 'admin' ? 'Administrateur' : profile?.role === 'editor' ? 'Éditeur' : 'Lecteur'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-slate-600" />
              <p className="text-sm text-slate-600">Membre depuis</p>
            </div>
            <p className="font-medium text-slate-900">
              {profile?.created_at && new Date(profile.created_at).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-2">Autorisations</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            <span>Consulter tous les documents de l'organisation</span>
          </li>
          {profile?.role !== 'reader' && (
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span>Ajouter et modifier des documents</span>
            </li>
          )}
          {profile?.role === 'admin' && (
            <>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Gérer les utilisateurs</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Gérer les catégories</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <span>Supprimer des documents</span>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
