import type { MobileFetch } from "./mobile-api";

// Username sign-up and sign-in through the website (POST /api/mobile/v1/auth).
// The website creates accounts and looks usernames up on the server, because that
// needs the service-role key, which never ships in the app. No Authorization header.

export type AuthSession = { access_token: string; refresh_token: string; expires_at: number | null };
export type AuthSuccess = { ok: true; session: AuthSession; userId: string; onboardingComplete: boolean };
export type AuthFailure = {
  ok: false;
  error: string;
  // Server codes: validation, weak_password, invalid_credentials, verification_required,
  // username_taken, created_sign_in, rate_limited, unavailable, configuration.
  // App codes: not_deployed (the endpoint is not live yet), network.
  code: string;
  status: number;
};
export type AuthResult = AuthSuccess | AuthFailure;

export type SignUpRequest = { username: string; password: string; is18Plus: true; email?: string };
export type SignInRequest = { username: string; password: string };

const NETWORK = "Could not reach Lonagram. Check your connection and try again.";

export function createMobileAuth(baseUrl: string | undefined, request: MobileFetch = fetch) {
  async function post(operation: "auth.signUp" | "auth.signIn", input: SignUpRequest | SignInRequest): Promise<AuthResult> {
    if (!baseUrl) return { ok: false, error: "Sign-in is not configured.", code: "configuration", status: 0 };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await request(new URL("/api/mobile/v1/auth", baseUrl).toString(), {
        method: "POST",
        credentials: "omit",
        redirect: "error",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, input }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: Omit<AuthSuccess, "ok">; error?: string; code?: string }
        | null;
      // Before the website ships this route it answers with its 404 page.
      if (response.status === 404 || result === null) return { ok: false, error: NETWORK, code: "not_deployed", status: response.status };
      if (response.ok && result.ok === true && result.data?.session?.access_token && result.data.session.refresh_token) {
        return { ok: true, session: result.data.session, userId: result.data.userId, onboardingComplete: Boolean(result.data.onboardingComplete) };
      }
      return { ok: false, error: result.error ?? "Could not finish. Please try again.", code: result.code ?? "api", status: response.status };
    } catch {
      return { ok: false, error: NETWORK, code: "network", status: 0 };
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    signUp: (input: SignUpRequest) => post("auth.signUp", input),
    signIn: (input: SignInRequest) => post("auth.signIn", input),
  };
}
