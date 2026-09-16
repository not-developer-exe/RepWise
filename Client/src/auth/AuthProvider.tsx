import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
  } from "react";
  import type { Session, User } from "@supabase/supabase-js";
  import { authService } from "./auth.service";
  
  type AuthContextValue = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
  };
  
  const AuthContext = createContext<AuthContextValue | undefined>(undefined);
  
  type AuthProviderProps = {
    children: ReactNode;
  };
  
  export function AuthProvider({ children }: AuthProviderProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      let mounted = true;
  
      authService.getSession().then(({ data, error }) => {
        if (!mounted) {
          return;
        }
  
        if (error) {
          console.error("Failed to restore authentication session:", error);
        }
  
        setSession(data.session);
        setLoading(false);
      });
  
      const {
        data: { subscription },
      } = authService.onAuthStateChange((nextSession) => {
        setSession(nextSession);
        setLoading(false);
      });
  
      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }, []);
  
    const value = useMemo<AuthContextValue>(
      () => ({
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          const { error } = await authService.signOut();
  
          if (error) {
            throw error;
          }
        },
      }),
      [session, loading],
    );
  
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }
  
  export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
  
    if (!context) {
      throw new Error("useAuth must be used inside an AuthProvider.");
    }
  
    return context;
  }