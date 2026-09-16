import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type AuthResult<T> = {
  data: T;
  error: AuthError | null;
};

export const authService = {
  async signIn(
    email: string,
    password: string,
  ): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      data,
      error,
    };
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();

    return {
      error,
    };
  },

  async getSession(): Promise<AuthResult<{ session: Session | null }>> {
    const { data, error } = await supabase.auth.getSession();

    return {
      data,
      error,
    };
  },

  onAuthStateChange(
    callback: (session: Session | null) => void,
  ) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },
};