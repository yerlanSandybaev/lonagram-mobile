import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { validateSignIn, validateSignUp, type SignUpInput } from "@/lib/auth-input";
import { loadAccountProfile, type AccountProfile } from "@/lib/profile";
import { getMobileEnv, getSupabase } from "@/lib/supabase";

export type AuthMessage = { error: string; notice?: boolean };

type AuthContextValue = {
  ready: boolean;
  configured: boolean;
  configError?: string;
  session: Session | null;
  profile: AccountProfile | null;
  signIn: (input: { email: string; password: string }) => Promise<AuthMessage>;
  signUp: (input: SignUpInput) => Promise<AuthMessage>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const empty: AuthMessage = { error: "" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const env = useMemo(() => getMobileEnv(), []);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setReady(true);
      return;
    }
    let active = true;
    void (async () => {
      const { data } = await client.auth.getSession();
      if (!active) return;
      if (!data.session) {
        setSession(null);
        setReady(true);
        return;
      }
      const userResult = await client.auth.getUser();
      if (!active) return;
      const status = userResult.error?.status;
      if (status === 401 || status === 403) {
        await client.auth.signOut();
        if (!active) return;
        setSession(null);
      } else {
        setSession(data.session);
      }
      setReady(true);
    })();
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = getSupabase();
    const userId = session?.user.id;
    if (!client || !userId) {
      setProfile(null);
      return;
    }
    let active = true;
    void loadAccountProfile(client, userId).then((next) => {
      if (active) setProfile(next);
    });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured: env.configured,
      configError: env.error,
      session,
      profile,
      async signIn(input) {
        const parsed = validateSignIn(input);
        if (!parsed.ok) return { error: parsed.error };
        const client = getSupabase();
        if (!client) {
          return { error: env.error ?? "Add the Lonagram Supabase URL and publishable key in .env.local." };
        }
        try {
          const { data, error } = await client.auth.signInWithPassword(parsed.value);
          if (error || !data.user) return { error: "Email or password is incorrect." };
          return empty;
        } catch {
          return { error: "Could not reach Lonagram. Check your connection and try again." };
        }
      },
      async signUp(input) {
        const parsed = validateSignUp(input);
        if (!parsed.ok) return { error: parsed.error };
        const client = getSupabase();
        if (!client) {
          return { error: env.error ?? "Add the Lonagram Supabase URL and publishable key in .env.local." };
        }
        try {
          const { data, error } = await client.auth.signUp({
            email: parsed.value.email,
            password: parsed.value.password,
            options: { data: parsed.value.data },
          });
          if (error) return { error: error.message };
          if (!data.session) {
            return { error: "Check your email to confirm the account, then sign in.", notice: true };
          }
          return empty;
        } catch {
          return { error: "Could not reach Lonagram. Check your connection and try again." };
        }
      },
      async signOut() {
        const client = getSupabase();
        if (client) await client.auth.signOut();
        setSession(null);
        setProfile(null);
      },
    }),
    [env, profile, ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
