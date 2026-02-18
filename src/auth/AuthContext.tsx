import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthResult {
  error: string | null;
}

interface SignUpResult extends AuthResult {
  requiresEmailVerification: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PRODUCTION_REDIRECT_URL = "https://drippss.com";

const getFriendlyAuthError = (error: AuthError | null): string | null => {
  if (!error) {
    return null;
  }

  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (message.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }

  if (message.includes("already registered") || message.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters long.";
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many attempts. Please wait and try again.";
  }

  if (message.includes("network request failed")) {
    return "Network error. Check your connection and try again.";
  }

  return error.message;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const setAuthState = (nextSession: Session | null) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setAuthState(null);
          return;
        }

        setAuthState(data.session);
      })
      .catch(() => setAuthState(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthState(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: PRODUCTION_REDIRECT_URL,
      },
    });

    return {
      error: getFriendlyAuthError(error),
      requiresEmailVerification: Boolean(data.user && !data.session),
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: getFriendlyAuthError(error) };
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signOut();
    return { error: getFriendlyAuthError(error) };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [user, session, loading, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
