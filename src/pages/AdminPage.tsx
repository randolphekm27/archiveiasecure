import { useState, useEffect } from 'react';
import {
  Users,
  FolderOpen,
  Building2,
  Plus,
  Trash2,
  X,
  UserPlus,
  Mail,
  Copy,
  Check,
  MessageSquare,
  Shield,
  Send,
  Edit2,
  Download,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import InvitationHistory from '../components/InvitationHistory';
import type { Database } from '../lib/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Invitation = Database['public']['Tables']['user_invitations']['Row'];

export default function AdminPage() {
  const { profile, organization } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'invitations' | 'org'>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invitations, setInvitations] = useState<(Invitation & { inviter_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);

  const [editingUser, setEditingUser] = useState<{
    id: string;
    fullName: string;
    role: 'admin' | 'editor' | 'reader';
    categoryIds: string[];
  } | null>(null);
  const [submittingUserEdit, setSubmittingUserEdit] = useState(false);

  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    role: 'reader' as 'admin' | 'editor' | 'reader',
    personalMessage: '',
    categoryIds: [] as string[],
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    retention_period_years: 10,
  });

  const [invitationResult, setInvitationResult] = useState<{
    url: string;
    emailSent: boolean;
    error?: string;
    isTestingModeError?: boolean;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  const [editingOrg, setEditingOrg] = useState(false);
  const [orgData, setOrgData] = useState({
    name: '',
    description: '',
    phone: '',
    website: '',
    primary_color: '#2563EB',
    secondary_color: '#1E40AF',
    accent_color: '#6366F1',
    font_family: 'Inter',
    deletion_votes_required: 3,
  });
  const [submittingOrg, setSubmittingOrg] = useState(false);

  useEffect(() => {
    if (organization) {
      setOrgData({
        name: organization.name || '',
        description: (organization as any).description || '',
        phone: (organization as any).phone || '',
        website: (organization as any).website || '',
        primary_color: (organization as any).primary_color || '#2563EB',
        secondary_color: (organization as any).secondary_color || '#1E40AF',
        accent_color: (organization as any).accent_color || '#6366F1',
        font_family: (organization as any).font_family || 'Inter',
        deletion_votes_required: (organization as any).deletion_votes_required || 3,
      });
    }
  }, [organization]);

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    setSubmittingOrg(true);

    try {
      const { error } = await (supabase as any).from('organizations').update({
        name: orgData.name,
        description: orgData.description,
        phone: orgData.phone,
        website: orgData.website,
        primary_color: orgData.primary_color,
        secondary_color: orgData.secondary_color,
        accent_color: orgData.accent_color,
        font_family: orgData.font_family,
        deletion_votes_required: orgData.deletion_votes_required,
      }).eq('id', profile.organization_id);

      if (error) throw error;

      if (profile) {
        await logActivity({
          organizationId: profile.organization_id,
          userId: profile.id,
          action: 'organization.updated',
          details: { fields_updated: Object.keys(orgData) }
        });
      }

      window.location.reload();
    } catch (error) {
      console.error("Error updating organization:", error);
      alert("Erreur lors de la mise à jour de l'organisation.");
    } finally {
      setSubmittingOrg(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    try {
      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      const [usersResult, catsResult, invResult] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('name'),
        supabase
          .from('user_invitations')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false }),
      ]);

      if (usersResult.data) setUsers(usersResult.data);
      if (catsResult.data) setCategories(catsResult.data);
      if (invResult.data && usersResult.data) {
        const enriched = (invResult.data as any[]).map((inv) => ({
          ...inv,
          inviter_name: (usersResult.data as any[]).find((u) => u.id === inv.invited_by)?.full_name,
        }));
        setInvitations(enriched);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      if (!profile?.organization_id) return;
      const [usersResult, catsResult, docsResult] = await Promise.all([
        supabase.from('users').select('*').eq('organization_id', profile.organization_id),
        supabase.from('categories').select('*').eq('organization_id', profile.organization_id),
        supabase.from('documents').select('*').eq('organization_id', profile.organization_id),
      ]);

      const data = {
        exportDate: new Date().toISOString(),
        organizationId: profile.organization_id,
        users: usersResult.data,
        categories: catsResult.data,
        documents: docsResult.data,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${profile.organization_id}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'system.backup_exported',
        details: { recordsExported: (usersResult.data?.length || 0) + (catsResult.data?.length || 0) + (docsResult.data?.length || 0) }
      });
      
    } catch (err) {
      console.error('Export failed', err);
      alert("Erreur lors de l'export des données.");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !organization) return;

    setSubmittingInvite(true);

    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: inviteError } = await (supabase as any).from('user_invitations').insert({
        organization_id: profile.organization_id,
        email: newUser.email,
        full_name: newUser.fullName,
        role: newUser.role,
        token,
        invited_by: profile.id,
        expires_at: expiresAt.toISOString(),
        personal_message: newUser.personalMessage || null,
        category_ids: newUser.categoryIds,
      });

      if (inviteError) throw inviteError;

      const invitationUrl = `${window.location.origin}/join/${token}`;

      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'user.invited',
        details: {
          email: newUser.email,
          full_name: newUser.fullName,
          role: newUser.role,
        },
      });

      let emailSent = false;
      let error = '';
      let isTestingModeError = false;

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('send-invitation', {
          body: {
            to: newUser.email,
            fullName: newUser.fullName,
            organizationName: organization.name,
            invitationUrl,
            role: newUser.role,
            inviterName: profile.full_name,
            inviterEmail: profile.email,
            personalMessage: newUser.personalMessage,
          },
        });

        if (invokeError) throw invokeError;

        emailSent = data?.emailSent === true;
        error = data?.error || '';
        isTestingModeError = data?.isTestingModeError || false;

        // If automatic email fails, create an internal notification for admins as a backup
        if (!emailSent) {
          await (supabase as any).from('notifications').insert({
            organization_id: profile.organization_id,
            user_id: profile.id,
            title: 'Invitation crée (Email échoué)',
            message: `L'invitation pour ${newUser.fullName} (${newUser.email}) a été créée mais l'email n'a pas pu être envoyé.`,
            type: 'warning',
            link_to: 'admin'
          });
        }
      } catch (err) {
        console.error('Error calling send-invitation:', err);
        error = err instanceof Error ? err.message : 'Erreur inconnue lors de l\'envoi';
      }

      setInvitationResult({ url: invitationUrl, emailSent, error, isTestingModeError });
    } catch (error) {
      console.error('Error inviting user:', error);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const closeInvitationModal = () => {
    setShowUserModal(false);
    setInvitationResult(null);
    setNewUser({ fullName: '', email: '', role: 'reader', personalMessage: '', categoryIds: [] });
    loadData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Confirmer la suppression de cet utilisateur ?')) return;

    try {
      const targetUser = users.find((u) => u.id === userId);
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;

      if (profile) {
        await logActivity({
          organizationId: profile.organization_id,
          userId: profile.id,
          action: 'user.deleted',
          details: { deleted_user: targetUser?.full_name, deleted_role: targetUser?.role },
        });
      }

      await loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;

    try {
      const { error } = await (supabase as any).from('categories').insert({
        organization_id: profile.organization_id,
        name: newCategory.name,
        description: newCategory.description,
        color: newCategory.color,
        retention_period_years: newCategory.retention_period_years,
      });

      if (error) throw error;

      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'category.created',
        details: { name: newCategory.name },
      });

      await loadData();
      setShowCategoryModal(false);
      setNewCategory({ name: '', description: '', color: '#3B82F6', retention_period_years: 10 });
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const reason = prompt('Veuillez indiquer la raison de cette demande de suppression de catégorie (requiert un vote consensuel des administrateurs) :');
    if (!reason) return;

    try {
      const cat = categories.find((c) => c.id === categoryId);
      const { error } = await (supabase as any).from('deletion_requests').insert({
        organization_id: profile?.organization_id,
        target_type: 'category',
        category_id: categoryId,
        requested_by: profile?.id,
        reason: reason
      });
      if (error) throw error;

      if (profile) {
        await logActivity({
          organizationId: profile.organization_id,
          userId: profile.id,
          action: 'category.deletion_requested',
          details: { name: cat?.name, reason },
        });
      }

      alert('Demande de suppression de catégorie soumise au vote des administrateurs.');

      await loadData();
    } catch (error) {
      console.error('Error requesting category deletion:', error);
      alert('Erreur lors de la demande de suppression.');
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !profile) return;
    setSubmittingUserEdit(true);

    try {
      const targetUser = users.find((u) => u.id === editingUser.id);
      const { error } = await (supabase as any).from('users').update({
        role: editingUser.role,
        category_ids: editingUser.categoryIds
      }).eq('id', editingUser.id);

      if (error) throw error;

      await logActivity({
        organizationId: profile.organization_id,
        userId: profile.id,
        action: 'user.role_changed',
        details: {
          target_user: targetUser?.full_name,
          old_role: targetUser?.role,
          new_role: editingUser.role,
          categories_updated: true
        },
      });

      setShowEditUserModal(false);
      await loadData();
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setSubmittingUserEdit(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrateur', bg: 'bg-rose-100', text: 'text-rose-700' };
      case 'editor':
        return { label: 'Editeur', bg: 'bg-blue-100', text: 'text-blue-700' };
      default:
        return { label: 'Lecteur', bg: 'bg-slate-100', text: 'text-slate-700' };
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
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Administration</h2>
          <p className="text-slate-600">Gerez votre organisation</p>
        </div>
        <button
          onClick={handleExportData}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exporter les donnees</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-1">
            {[
              { id: 'users' as const, label: 'Utilisateurs', icon: Users },
              { id: 'invitations' as const, label: 'Invitations', icon: Send },
              { id: 'categories' as const, label: 'Categories', icon: FolderOpen },
              { id: 'org' as const, label: 'Organisation', icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Utilisateurs ({users.length})
                </h3>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Inviter un membre
                </button>
              </div>

              <div className="space-y-2">
                {users.map((user) => {
                  const badge = getRoleBadge(user.role);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <span className="font-bold text-blue-600">{user.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.full_name}</p>
                          <p className="text-sm text-slate-500">@{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {user.id !== profile?.id ? (
                          <div className="flex items-center gap-1">
                            <span className={`px-3 py-1 mr-2 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                            {!(user as any).is_founder && (
                              <button
                                onClick={() => {
                                  setEditingUser({
                                    id: user.id,
                                    fullName: user.full_name,
                                    role: user.role as any,
                                    categoryIds: (user as any).category_ids || []
                                  });
                                  setShowEditUserModal(true);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Modifier les acces"
                              >
                                <Edit2 className="w-4 h-4 text-slate-600" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        )}
                        {user.id !== profile?.id && !(user as any).is_founder && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Categories ({categories.length})
                </h3>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une categorie
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <FolderOpen className="w-5 h-5" style={{ color: cat.color || '#3B82F6' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{cat.name}</p>
                        {cat.description && (
                          <p className="text-sm text-slate-600 truncate">{cat.description}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Rétention : {(cat as any).retention_period_years || 10} an(s)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'invitations' && (
            <InvitationHistory
              invitations={invitations}
              onRefresh={loadData}
              onCopyLink={handleCopyLink}
            />
          )}

          {activeTab === 'org' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Informations de l'organisation
                </h3>
                {profile?.role === 'admin' && !editingOrg && (
                  <button onClick={() => setEditingOrg(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    <Edit2 className="w-4 h-4" /> Modifier
                  </button>
                )}
              </div>

              {!editingOrg ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Nom de l'organisation", value: organization?.name },
                    { label: 'Description', value: (organization as any)?.description || '-' },
                    { label: 'Code organisation', value: organization?.code, mono: true },
                    { label: 'Email administrateur', value: organization?.admin_email },
                    { label: 'Telephone', value: (organization as any)?.phone || '-' },
                    { label: 'Site Web', value: (organization as any)?.website || '-' },
                    { label: 'Date de creation', value: organization?.created_at && new Date(organization.created_at).toLocaleDateString('fr-FR') },
                    { label: 'Votes requis pour suppression', value: (organization as any)?.deletion_votes_required || '3' },
                  ].map((item) => (
                    <div key={item.label} className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">{item.label}</p>
                      <p className={`font-medium text-slate-900 ${item.mono ? 'font-mono' : ''}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}

                  <div className="p-4 bg-slate-50 rounded-lg col-span-1 md:col-span-2">
                    <p className="text-sm text-slate-600 mb-2">Couleurs du thème</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-200" style={{ backgroundColor: (organization as any)?.primary_color || '#2563EB' }} />
                        <span className="text-sm font-mono text-slate-700">{(organization as any)?.primary_color || '#2563EB'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-200" style={{ backgroundColor: (organization as any)?.secondary_color || '#1E40AF' }} />
                        <span className="text-sm font-mono text-slate-700">{(organization as any)?.secondary_color || '#1E40AF'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-200" style={{ backgroundColor: (organization as any)?.accent_color || '#6366F1' }} />
                        <span className="text-sm font-mono text-slate-700">{(organization as any)?.accent_color || '#6366F1'} (Accent)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Police :</span>
                        <span className="text-sm font-medium text-slate-900">{(organization as any)?.font_family || 'Inter'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateOrg} className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom de l'organisation</label>
                      <input type="text" required value={orgData.name} onChange={(e) => setOrgData({ ...orgData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                      <textarea rows={3} value={orgData.description} onChange={(e) => setOrgData({ ...orgData, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Brève description de votre organisation..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Telephone</label>
                      <input type="text" value={orgData.phone} onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+33 1 23 45 67 89" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Web</label>
                      <input type="url" value={orgData.website} onChange={(e) => setOrgData({ ...orgData, website: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Couleur Primaire</label>
                      <div className="flex gap-2">
                        <input type="color" value={orgData.primary_color} onChange={(e) => setOrgData({ ...orgData, primary_color: e.target.value })} className="w-12 h-10 rounded-lg cursor-pointer" />
                        <input type="text" value={orgData.primary_color} onChange={(e) => setOrgData({ ...orgData, primary_color: e.target.value })} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Couleur d'Accent</label>
                      <div className="flex gap-2">
                        <input type="color" value={orgData.accent_color} onChange={(e) => setOrgData({ ...orgData, accent_color: e.target.value })} className="w-12 h-10 rounded-lg cursor-pointer" />
                        <input type="text" value={orgData.accent_color} onChange={(e) => setOrgData({ ...orgData, accent_color: e.target.value })} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Typographie (Police)</label>
                      <select value={orgData.font_family} onChange={(e) => setOrgData({ ...orgData, font_family: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="Inter">Inter (Defaut)</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Outfit">Outfit</option>
                        <option value="Poppins">Poppins</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Votes de suppression requis</label>
                      <input type="number" min="1" max="10" value={orgData.deletion_votes_required} onChange={(e) => setOrgData({ ...orgData, deletion_votes_required: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button type="submit" disabled={submittingOrg} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                      {submittingOrg ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                    <button type="button" onClick={() => setEditingOrg(false)} className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition-colors">
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            {invitationResult ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Invitation creee</h3>
                  {invitationResult.emailSent ? (
                    <p className="text-sm text-green-600 mt-1">
                      Un email a ete envoye a {newUser.email}
                    </p>
                  ) : (
                    <div className="mt-2 text-sm">
                      <p className="text-amber-600 font-medium">
                        L'email n'a pas pu etre envoye automatiquement.
                      </p>
                      {invitationResult.error && (
                        <p className="text-slate-500 mt-1 text-xs px-4">
                          {invitationResult.error}
                        </p>
                      )}
                      <p className="text-slate-600 mt-2">
                        Partagez le lien ci-dessous manuellement avec le membre.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Lien d'invitation :</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={invitationResult.url}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-600"
                    />
                    <button
                      onClick={() => handleCopyLink(invitationResult.url)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? 'Copie' : 'Copier'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={closeInvitationModal}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Inviter un nouveau membre</h3>
                  <button onClick={closeInvitationModal} className="p-2 hover:bg-slate-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="Prenom et nom"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Adresse email professionnelle
                    </label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="utilisateur@exemple.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Role
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="reader">Lecteur - Consultation uniquement</option>
                      <option value="editor">Editeur - Ajout et modification de documents</option>
                      <option value="admin">Administrateur - Acces complet</option>
                    </select>
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Categories d'acces (optionnel)
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                        {categories.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newUser.categoryIds.includes(cat.id)}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [...newUser.categoryIds, cat.id]
                                  : newUser.categoryIds.filter((id) => id !== cat.id);
                                setNewUser({ ...newUser, categoryIds: ids });
                              }}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: (cat.color || '#3B82F6') as string }} />
                            {cat.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <MessageSquare className="w-4 h-4 inline mr-1" />
                      Message personnel (optionnel)
                    </label>
                    <textarea
                      value={newUser.personalMessage}
                      onChange={(e) => setNewUser({ ...newUser, personalMessage: e.target.value })}
                      placeholder="Ajoutez un message pour contextualiser l'invitation..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-slate-700">
                      Un email d'invitation sera envoye avec un lien securise valable 7 jours.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submittingInvite}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-2.5 rounded-lg font-medium transition-colors"
                    >
                      {submittingInvite ? 'Envoi en cours...' : "Envoyer l'invitation"}
                    </button>
                    <button
                      type="button"
                      onClick={closeInvitationModal}
                      className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Ajouter une categorie</h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom de la categorie
                </label>
                <input
                  type="text"
                  required
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Ex: Pedagogie"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description (optionnel)
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Description de la categorie"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Couleur</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-16 h-10 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Période de rétention (années)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={newCategory.retention_period_years}
                  onChange={(e) => setNewCategory({ ...newCategory, retention_period_years: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Les documents seront conservés cette durée avant proposition d'archivage.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Modifier l'utilisateur : {editingUser.fullName}
              </h3>
              <button onClick={() => setShowEditUserModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Role
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="reader">Lecteur - Consultation uniquement</option>
                  <option value="editor">Editeur - Ajout et modification de documents</option>
                  <option value="admin">Administrateur - Acces complet</option>
                </select>
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Categories d'acces
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingUser.categoryIds.includes(cat.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...editingUser.categoryIds, cat.id]
                              : editingUser.categoryIds.filter((id) => id !== cat.id);
                            setEditingUser({ ...editingUser, categoryIds: ids });
                          }}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: (cat.color || '#3B82F6') as string }} />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Laissez vide pour autoriser toutes les categories (Comportement Admin).</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submittingUserEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-2.5 rounded-lg font-medium transition-colors"
                >
                  {submittingUserEdit ? 'Enregistrement...' : "Enregistrer les modifications"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
