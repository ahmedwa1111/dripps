import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, EmployeeAccount } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isStaff: boolean;
  isModerator: boolean;
  employeeAccount: EmployeeAccount | null;
  employeeRoles: Array<{ id: string; name: string }>;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [employeeAccount, setEmployeeAccount] = useState<EmployeeAccount | null>(null);
  const [employeeRoles, setEmployeeRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const isAdmin =
    roles.includes('admin') ||
    roles.includes('manager') ||
    employeeRoles.some((role) => role.name === 'admin') ||
    permissions.includes('settings.manage') ||
    permissions.includes('employees.manage');
  const isStaff = isAdmin;
  const isModerator = !!employeeAccount;

  const hasPermission = (permission: string) => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    return data.map(r => r.role as AppRole);
  };

  const fetchEmployeeProfile = async (accessToken: string) => {
    try {
      const resp = await fetch('/api/moderator/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (resp.status === 403 && data?.error === 'Account disabled') {
          await supabase.auth.signOut();
        }
        setEmployeeAccount(null);
        setEmployeeRoles([]);
        setPermissions([]);
        return;
      }

      const data = await resp.json();
      setEmployeeAccount(data.account ?? null);
      setEmployeeRoles(data.roles ?? []);
      setPermissions(data.permissions ?? []);
    } catch {
      setEmployeeAccount(null);
      setEmployeeRoles([]);
      setPermissions([]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to avoid potential race conditions
        setTimeout(async () => {
          const userRoles = await fetchUserRoles(session.user.id);
          setRoles(userRoles);
          if (session.access_token) {
            await fetchEmployeeProfile(session.access_token);
          }
        }, 0);
      } else {
        setRoles([]);
        setEmployeeAccount(null);
        setEmployeeRoles([]);
        setPermissions([]);
      }

      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userRoles = await fetchUserRoles(session.user.id);
        setRoles(userRoles);
        if (session.access_token) {
          await fetchEmployeeProfile(session.access_token);
        }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setEmployeeAccount(null);
    setEmployeeRoles([]);
    setPermissions([]);
  };

  return (
      <AuthContext.Provider value={{
        user,
        session,
        loading,
        roles,
        isAdmin,
        isStaff,
        isModerator,
        employeeAccount,
        employeeRoles,
        permissions,
        hasPermission,
        signUp,
        signIn,
        signOut,
      }}>
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
