import { supabase } from './supabase';

export async function logActivity(params: {
  organizationId: string;
  userId: string;
  action: string;
  documentId?: string;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('activity_logs').insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    action: params.action,
    document_id: params.documentId,
    details: params.details as any,
    user_agent: navigator.userAgent,
  });

  if (error) {
    console.error('Failed to log activity:', error);
  }
}

export const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'document.upload': { label: 'Document ajout\u00e9', color: '#10B981' },
  'document.update': { label: 'Document modifi\u00e9', color: '#3B82F6' },
  'document.delete_request': { label: 'Suppression demand\u00e9e', color: '#F59E0B' },
  'document.delete_vote': { label: 'Vote de suppression', color: '#F59E0B' },
  'document.deleted': { label: 'Document supprim\u00e9', color: '#EF4444' },
  'document.restored': { label: 'Document restaur\u00e9', color: '#10B981' },
  'user.login': { label: 'Connexion', color: '#6366F1' },
  'user.logout': { label: 'D\u00e9connexion', color: '#6366F1' },
  'user.invited': { label: 'Utilisateur invit\u00e9', color: '#10B981' },
  'user.joined': { label: 'Utilisateur rejoint', color: '#10B981' },
  'user.deleted': { label: 'Utilisateur supprim\u00e9', color: '#EF4444' },
  'user.role_changed': { label: 'R\u00f4le modifi\u00e9', color: '#3B82F6' },
  'category.created': { label: 'Cat\u00e9gorie cr\u00e9\u00e9e', color: '#10B981' },
  'category.deleted': { label: 'Cat\u00e9gorie supprim\u00e9e', color: '#EF4444' },
  'org.updated': { label: 'Organisation modifi\u00e9e', color: '#3B82F6' },
};

export function getActionInfo(action: string) {
  return ACTION_LABELS[action] || { label: action, color: '#94A3B8' };
}
