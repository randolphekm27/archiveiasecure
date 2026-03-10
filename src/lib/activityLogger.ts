import { 
  FilePlus, 
  FileEdit, 
  FileX, 
  Vote, 
  Trash2, 
  RefreshCcw, 
  LogIn, 
  LogOut, 
  UserPlus, 
  UserCheck, 
  UserMinus, 
  Shield, 
  FolderPlus, 
  FolderX, 
  Settings,
  Activity
} from 'lucide-react';
import { supabase } from './supabase';

export async function logActivity(params: {
  organizationId: string;
  userId: string;
  action: string;
  documentId?: string;
  details?: Record<string, unknown>;
}) {
  let ipAddress = 'Unknown';
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    ipAddress = data.ip;
  } catch (err) {
    console.warn('Could not fetch IP address:', err);
  }

  const { error } = await (supabase as any).from('activity_logs').insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    action: params.action,
    document_id: params.documentId,
    details: params.details as any,
    user_agent: navigator.userAgent,
    ip_address: ipAddress,
  });

  if (error) {
    console.error('Failed to log activity:', error);
  }
}

export const ACTION_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  'document.upload': { label: 'Document ajout\u00e9', color: 'text-emerald-600', icon: FilePlus },
  'document.update': { label: 'Document modifi\u00e9', color: 'text-blue-600', icon: FileEdit },
  'document.delete_request': { label: 'Suppression demand\u00e9e', color: 'text-amber-600', icon: FileX },
  'document.delete_vote': { label: 'Vote de suppression', color: 'text-amber-600', icon: Vote },
  'document.deleted': { label: 'Document supprim\u00e9', color: 'text-rose-600', icon: Trash2 },
  'document.restored': { label: 'Document restaur\u00e9', color: 'text-emerald-600', icon: RefreshCcw },
  'user.login': { label: 'Connexion', color: 'text-indigo-600', icon: LogIn },
  'user.logout': { label: 'D\u00e9connexion', color: 'text-indigo-600', icon: LogOut },
  'user.invited': { label: 'Utilisateur invit\u00e9', color: 'text-emerald-600', icon: UserPlus },
  'user.joined': { label: 'Utilisateur rejoint', color: 'text-emerald-600', icon: UserCheck },
  'user.deleted': { label: 'Utilisateur supprim\u00e9', color: 'text-rose-600', icon: UserMinus },
  'user.role_changed': { label: 'R\u00f4le modifi\u00e9', color: 'text-blue-600', icon: Shield },
  'category.created': { label: 'Cat\u00e9gorie cr\u00e9\u00e9e', color: 'text-emerald-600', icon: FolderPlus },
  'category.deleted': { label: 'Cat\u00e9gorie supprim\u00e9e', color: 'text-rose-600', icon: FolderX },
  'org.updated': { label: 'Organisation modifi\u00e9e', color: 'text-blue-600', icon: Settings },
};

export function getActionInfo(action: string) {
  return ACTION_LABELS[action] || { label: action, color: 'text-slate-600', icon: Activity };
}
