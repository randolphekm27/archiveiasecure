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
  signUp: (orgCode: string, username: string, email: string, password: string, fullName: string, jobTitle?: string) => Promise<void>;
  signOut: () => Promise<void>;
  createOrganization: (orgData: {
    name: string;
    code: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
    adminUsername: string;
    adminJobTitle: string;
  }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to ensure consistent virtual email generation
const generateVirtualEmail = (username: string, orgCode: string): string => {
  const normalizedUsername = username.trim().toLowerCase().replace(/\s+/g, '.');
  const normalizedOrgCode = orgCode.trim().toUpperCase();
  return `${normalizedUsername}+${normalizedOrgCode}@archivia.app`.toLowerCase();
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!mounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setOrganization(null);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile(profileData);
        if (profileData.organization_id) {
          const { data: orgData, error: orgError } = await (supabase as any)
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .maybeSingle();

          if (orgError) throw orgError;
          setOrganization(orgData);
        }
        return profileData;
      }
      return null;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signIn = async (orgCode: string, username: string, password: string) => {
    try {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        await supabase.auth.signOut({ scope: 'local' });
      }

      const virtualEmail = generateVirtualEmail(username, orgCode);

      // Attempt login with virtual email first (standard for this app)
      let { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password,
      });

      // If that fails, try with the username/email directly as some users might try their real email
      if (authError) {
        const { data: directAuth, error: directError } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });

        if (!directError) {
          authUser = directAuth;
          authError = null;
        }
      }

      if (authError) {
        if (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found')) {
          throw new Error('Identifiants ou mot de passe incorrects');
        }
        throw authError;
      }

      if (authUser?.user) {
        await loadProfile(authUser.user.id);
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Erreur de connexion');
    }
  };

  const signUp = async (orgCode: string, username: string, email: string, password: string, fullName: string, jobTitle?: string) => {
    try {
      const { data: org, error: orgError } = await (supabase as any)
        .from('organizations')
        .select('id')
        .eq('code', orgCode.toUpperCase())
        .maybeSingle();

      if (orgError || !org) throw new Error('Code organisation invalide');

      const virtualEmail = generateVirtualEmail(username, orgCode);

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: virtualEmail,
        password,
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Sign in automatically
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: virtualEmail,
          password,
        });

        if (signInError) throw signInError;

        const { error: profileError } = await (supabase as any).from('users').upsert({
          id: authData.user.id,
          organization_id: org.id,
          username: username.trim().toLowerCase().replace(/\s+/g, '.'),
          full_name: fullName,
          job_title: jobTitle,
          email: email,
          role: 'editor',
          updated_at: new Date().toISOString(),
        });

        if (profileError) throw profileError;
        await loadProfile(authData.user.id);
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Erreur lors de l\'inscription');
    }
  };

  const createOrganization = async (orgData: {
    name: string;
    code: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
    adminUsername: string;
    adminJobTitle: string;
  }) => {
    try {
      const { data: existingOrg } = await (supabase as any)
        .from('organizations')
        .select('id')
        .eq('code', orgData.code.toUpperCase())
        .maybeSingle();

      if (existingOrg) throw new Error('Ce code organisation existe deja');

      const { data: org, error: orgError } = await (supabase as any)
        .from('organizations')
        .insert({
          code: orgData.code.toUpperCase(),
          name: orgData.name,
          admin_email: orgData.adminEmail,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      const virtualEmail = generateVirtualEmail(orgData.adminUsername, orgData.code);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: virtualEmail,
        password: orgData.adminPassword,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: virtualEmail,
          password: orgData.adminPassword,
        });

        if (signInError) throw signInError;

        const { error: profileError } = await (supabase as any).from('users').upsert({
          id: authData.user.id,
          organization_id: org.id,
          username: orgData.adminUsername.trim().toLowerCase().replace(/\s+/g, '.'),
          full_name: orgData.adminName,
          email: orgData.adminEmail,
          job_title: orgData.adminJobTitle,
          role: 'admin',
          is_founder: true, // CRITICAL: Mark as founder to bypass RLS/Trigger issues
          is_active: true,
          last_login: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error(`Erreur lors de la creation du profil: ${profileError.message}`);
        }

        const defaultCategories = [
          { name: 'Administratif', description: 'Documents administratifs', color: '#3B82F6' },
          { name: 'Finances', description: 'Documents financiers', color: '#10B981' },
          { name: 'Ressources Humaines', description: 'Documents RH', color: '#F59E0B' },
          { name: 'Projets', description: 'Documents de projets', color: '#8B5CF6' },
        ];

        await (supabase as any).from('categories').insert(
          defaultCategories.map((cat) => ({
            ...cat,
            organization_id: org.id,
          }))
        );

        await loadProfile(authData.user.id);
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Erreur lors de la creation de l\'organisation');
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore signOut errors
    }
    setUser(null);
    setProfile(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, organization, loading, signIn, signUp, signOut, createOrganization, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
