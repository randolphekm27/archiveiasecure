import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['users']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  signIn: (orgCode: string, username: string, password: string) => Promise<void>;
  signUp: (orgCode: string, username: string, email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  createOrganization: (orgData: { name: string; code: string; adminEmail: string; adminPassword: string; adminName: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setOrganization(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error loading profile:', profileError);
      return;
    }

    setProfile(profileData);

    if (profileData?.organization_id) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profileData.organization_id)
        .maybeSingle();

      if (orgError) {
        console.error('Error loading organization:', orgError);
        return;
      }

      setOrganization(orgData);
    }
  };

  const signIn = async (orgCode: string, username: string, password: string) => {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('code', orgCode)
      .maybeSingle();

    if (orgError || !org) {
      throw new Error('Code organisation invalide');
    }

    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', org.id)
      .eq('username', username)
      .maybeSingle();

    if (userError || !userProfile) {
      throw new Error('Identifiant invalide');
    }

    const { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
      email: `${username}@${orgCode}.archivia.local`,
      password,
    });

    if (authError) {
      throw new Error('Mot de passe incorrect');
    }

    await loadProfile(authUser.user.id);
  };

  const signUp = async (orgCode: string, username: string, email: string, password: string, fullName: string) => {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('code', orgCode)
      .maybeSingle();

    if (orgError || !org) {
      throw new Error('Code organisation invalide');
    }

    const virtualEmail = `${username}@${orgCode}.archivia.local`;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: virtualEmail,
      password,
    });

    if (signUpError) {
      throw signUpError;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        organization_id: org.id,
        username,
        full_name: fullName,
        role: 'reader',
      });

      if (profileError) {
        throw profileError;
      }

      await loadProfile(authData.user.id);
    }
  };

  const createOrganization = async (orgData: { name: string; code: string; adminEmail: string; adminPassword: string; adminName: string }) => {
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('code', orgData.code)
      .maybeSingle();

    if (existingOrg) {
      throw new Error('Ce code organisation existe déjà');
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        code: orgData.code,
        name: orgData.name,
        admin_email: orgData.adminEmail,
      })
      .select()
      .single();

    if (orgError) {
      throw orgError;
    }

    const virtualEmail = `admin@${orgData.code}.archivia.local`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: virtualEmail,
      password: orgData.adminPassword,
    });

    if (authError) {
      throw authError;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        organization_id: org.id,
        username: 'admin',
        full_name: orgData.adminName,
        role: 'admin',
      });

      if (profileError) {
        throw profileError;
      }

      const defaultCategories = [
        { name: 'Administratif', description: 'Documents administratifs', color: '#3B82F6' },
        { name: 'Finances', description: 'Documents financiers', color: '#10B981' },
        { name: 'Ressources Humaines', description: 'Documents RH', color: '#F59E0B' },
        { name: 'Projets', description: 'Documents de projets', color: '#8B5CF6' },
      ];

      await supabase.from('categories').insert(
        defaultCategories.map(cat => ({
          ...cat,
          organization_id: org.id,
        }))
      );

      await loadProfile(authData.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, organization, loading, signIn, signUp, signOut, createOrganization }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
