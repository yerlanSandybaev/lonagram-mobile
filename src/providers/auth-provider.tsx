import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { appleIdentityToken, createAppleNonce, isAppleCancel } from "@/lib/apple-auth";
import { MOBILE_AUTH_REDIRECT, oauthCode } from "@/lib/oauth-callback";
import { uuidv4 } from "@/lib/uuid";

import {
  isUsername,
  validateSignIn,
  validateSignUp,
  type SignUpInput,
} from "@/lib/auth-input";
import { loadAccountProfile, type AccountProfile } from "@/lib/profile";
import { getMobileEnv, getSupabase } from "@/lib/supabase";
import { apiOrigin } from "@/lib/account";
import { createMobileAuth, type AuthSession } from "@/lib/mobile-auth";

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
  signInGoogle: () => Promise<AuthMessage>;
  signInApple: () => Promise<AuthMessage>;
  completeOAuth: (url: string) => Promise<AuthMessage>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const mobileAuth = createMobileAuth(apiOrigin(process.env.EXPO_PUBLIC_LONAGRAM_API_URL) ?? undefined);

// Keep a session the website returned. The auth listener then signs the app in;
// the app layout sends new accounts to onboarding and everyone else to Home.
async function storeSession(client: NonNullable<ReturnType<typeof getSupabase>>, session: AuthSession): Promise<AuthMessage> {
  try {
    const { error } = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    return error ? { error: "Signed in, but the session could not be saved. Please try again." } : { error: "" };
  } catch {
    return { error: "Signed in, but the session could not be saved. Please try again." };
  }
}
const empty: AuthMessage = { error: "" };
WebBrowser.maybeCompleteAuthSession();
let exchange: { code: string; promise: Promise<AuthMessage> } | null = null;
async function completeOAuth(url: string): Promise<AuthMessage> {
  try {
    const code = oauthCode(url);
    if (exchange?.code === code) return exchange.promise;
    const client = getSupabase();
    if (!client) return { error: "Sign-in is not configured." };
    const promise = client.auth
      .exchangeCodeForSession(code)
      .then(({ error }) =>
        error
          ? { error: "Sign-in could not finish. Please try again." }
          : empty,
      )
      .catch(() => ({
        error: "Could not reach Lonagram. Try signing in again.",
      }));
    exchange = { code, promise };
    return promise;
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Sign-in could not finish.",
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const env = useMemo(() => getMobileEnv(), []);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const googlePending = useRef(false);

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setReady(true);
      return;
    }
    let active = true;
    let revision = 0;
    const initialRevision = revision;
    void (async () => {
      const { data } = await client.auth.getSession();
      if (!active || revision !== initialRevision) return;
      if (!data.session) {
        setSession(null);
        setReady(true);
        return;
      }
      const userResult = await client.auth.getUser();
      if (!active || revision !== initialRevision) return;
      const status = userResult.error?.status;
      if (status === 401 || status === 403) {
        await client.auth.signOut();
        if (!active) return;
        setSession(null);
      } else {
        setSession(data.session);
      }
      setReady(true);
    })().catch(() => {
      if (active && revision === initialRevision) {
        setSession(null);
        setReady(true);
      }
    });
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      revision += 1;
      setSession(next);
      setReady(true);
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
    setProfile(null);
    void loadAccountProfile(client, userId)
      .then((next) => {
        if (active) setProfile(next);
      })
      .catch(() => {
        if (active) setProfile(null);
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
      completeOAuth,
      async signInGoogle() {
        if (googlePending.current) return empty;
        const client = getSupabase();
        if (!client) return { error: "Sign-in is not configured." };
        googlePending.current = true;
        try {
          const { data, error } = await client.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: MOBILE_AUTH_REDIRECT,
              skipBrowserRedirect: true,
              queryParams: { prompt: "select_account" },
            },
          });
          if (error || !data.url)
            return {
              error: "Google sign-in is unavailable. Please try again.",
            };
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            MOBILE_AUTH_REDIRECT,
          );
          return result.type === "success"
            ? await completeOAuth(result.url)
            : empty;
        } catch {
          return { error: "Could not open Google sign-in. Please try again." };
        } finally {
          googlePending.current = false;
        }
      },
      async signInApple() {
        if (googlePending.current) return empty;
        const client = getSupabase();
        if (!client) return { error: "Sign-in is not configured." };
        googlePending.current = true;
        try {
          const nonce = await createAppleNonce(
            () => uuidv4() + uuidv4(),
            (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
          );
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: nonce.hashed,
          });
          const token = appleIdentityToken(credential);
          if (!token) return { error: "Apple sign-in could not finish. Please try again." };
          const { error } = await client.auth.signInWithIdToken({ provider: "apple", token, nonce: nonce.raw });
          return error ? { error: "Apple sign-in could not finish. Please try again." } : empty;
        } catch (error) {
          return isAppleCancel(error) ? empty : { error: "Could not sign in with Apple. Please try again." };
        } finally {
          googlePending.current = false;
        }
      },
      async signIn(input) {
        const parsed = validateSignIn(input);
        if (!parsed.ok) return { error: parsed.error };
        const client = getSupabase();
        if (!client) {
          return {
            error:
              env.error ??
              "Add the Lonagram Supabase URL and publishable key in .env.local.",
          };
        }
        // Usernames are looked up on the website, which knows each account's internal address.
        if (isUsername(input.email)) {
          const result = await mobileAuth.signIn({ username: input.email.trim().toLowerCase(), password: input.password });
          if (result.ok) return storeSession(client, result.session);
          if (result.code !== "not_deployed") return { error: result.error };
          // The website endpoint is not live yet: use the older direct sign-in below.
        }
        try {
          const { data, error } = await client.auth.signInWithPassword(
            parsed.value,
          );
          if (error || !data.user)
            return { error: "Email, username or password is incorrect." };
          return empty;
        } catch {
          return {
            error:
              "Could not reach Lonagram. Check your connection and try again.",
          };
        }
      },
      async signUp(input) {
        const parsed = validateSignUp(input);
        if (!parsed.ok) return { error: parsed.error };
        const client = getSupabase();
        if (!client) {
          return {
            error:
              env.error ??
              "Add the Lonagram Supabase URL and publishable key in .env.local.",
          };
        }
        // No email code: the website creates the account and returns a session. Onboarding follows.
        const result = await mobileAuth.signUp({ ...parsed.value, is18Plus: true });
        if (result.ok) return storeSession(client, result.session);
        if (result.code === "created_sign_in") return { error: "Your account is ready. Sign in with your username and password.", notice: true };
        if (result.code !== "not_deployed") return { error: result.error };
        // The website endpoint is not live yet. The older direct sign-up needs a real email.
        if (!parsed.value.email) {
          return { error: "Creating an account in the app needs the latest Lonagram server. Sign up on lonagram.com for now, then sign in here." };
        }
        try {
          const { data, error } = await client.auth.signUp({
            email: parsed.value.email,
            password: parsed.value.password,
            options: { data: { is_18_plus: true, username: parsed.value.username, display_name: parsed.value.username } },
          });
          if (error) return { error: error.message };
          if (!data.session) {
            return {
              error: "Check your email to confirm the account, then sign in.",
              notice: true,
            };
          }
          return empty;
        } catch {
          return {
            error:
              "Could not reach Lonagram. Check your connection and try again.",
          };
        }
      },
      async signOut() {
        const client = getSupabase();
        if (client) {
          const { error } = await client.auth.signOut({ scope: "local" });
          if (error) throw new Error("Could not sign out. Please try again.");
        }
        exchange = null;
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
