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
      console.log(`[Auth] Attempting login: Org=${orgCode}, User=${username} -> vEmail=${virtualEmail}`);

      // Attempt login with virtual email first (standard for this app)
      let { data: authUser, error: authError } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password,
      });

      // If that fails, try with the username/email directly as some users might try their real email
      // Note: This only works if their auth account was created with their real email, 
      // which happens in some alternate signup flows or legacy data.
      if (authError) {
        console.warn(`[Auth] Virtual email login failed: ${authError.message}. Trying direct email...`);
        const { data: directAuth, error: directError } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });

        if (!directError) {
          authUser = directAuth;
          authError = null;
        } else {
          console.error(`[Auth] Direct login also failed: ${directError.message}`);
        }
      }

      if (authError) {
        if (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found')) {
          throw new Error('Identifiants ou mot de passe incorrects. Rappelez-vous que vous devez utiliser votre nom d’utilisateur (ex: jean.dupont) et non votre email si vous avez créé une organisation.');
        }
        throw authError;
      }

      if (authUser?.user) {
        const profile = await loadProfile(authUser.user.id);
        if (!profile) {
          console.error('[Auth] Login succeeded but profile is missing in the users table.');
          throw new Error('Votre compte est actif mais votre profil est manquant. Veuillez contacter l’administrateur.');
        }
      }
    } catch (error) {
      console.error('SignIn error details:', error);
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
        // Sign in automatically to get session for RLS
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
          is_active: true,
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Profile creation error during signup:', profileError);
          throw new Error(`Erreur lors de la création du profil: ${profileError.message}`);
        }
        
        await loadProfile(authData.user.id);
      }
    } catch (error) {
      console.error('Signup error:', error);
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
      // 1. Check if org code already exists
      const { data: existingOrg } = await (supabase as any)
        .from('organizations')
        .select('id')
        .eq('code', orgData.code.toUpperCase())
        .maybeSingle();

      if (existingOrg) throw new Error('Ce code organisation existe déjà.');

      // 2. Create organization
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

      // 3. Create auth user with virtual email
      const virtualEmail = generateVirtualEmail(orgData.adminUsername, orgData.code);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: virtualEmail,
        password: orgData.adminPassword,
        options: {
          data: {
            full_name: orgData.adminName,
            is_admin: true
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 4. Sign in to get session immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: virtualEmail,
          password: orgData.adminPassword,
        });

        if (signInError) {
          console.error('Initial signin error:', signInError);
          // Don't throw here, try to continue since auth user is created
        }

        // 5. Create user profile with Admin role and is_founder flag
        // Use upsert to be safe, but it should be an insert
        const { error: profileError } = await (supabase as any).from('users').upsert({
          id: authData.user.id,
          organization_id: org.id,
          username: orgData.adminUsername.trim().toLowerCase().replace(/\s+/g, '.'),
          full_name: orgData.adminName,
          email: orgData.adminEmail,
          job_title: orgData.adminJobTitle,
          role: 'admin',
          is_founder: true, 
          is_active: true,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Profile creation error during org creation:', profileError);
          throw new Error(`Erreur lors de la création du profil administrateur: ${profileError.message}`);
        }

        // 6. Create default categories
        const defaultCategories = [
          { name: 'Administratif', description: 'Documents administratifs', color: '#3B82F6' },
          { name: 'Finances', description: 'Documents financiers', color: '#10B981' },
          { name: 'Ressources Humaines', description: 'Documents RH', color: '#F59E0B' },
          { name: 'Projets', description: 'Documents de projets', color: '#8B5CF6' },
        ];

        try {
          await (supabase as any).from('categories').insert(
            defaultCategories.map((cat) => ({
              ...cat,
              organization_id: org.id,
            }))
          );
        } catch (catError) {
          console.warn('Could not create default categories:', catError);
          // Non-critical, continue
        }

        // 7. Finalize loading state
        await loadProfile(authData.user.id);
      }
    } catch (error) {
      console.error('Create organization error:', error);
      if (error instanceof Error) throw error;
      throw new Error('Erreur lors de la création de l\'organisation');
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
