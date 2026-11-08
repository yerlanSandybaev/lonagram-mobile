// Account recovery actions that run on-device with supabase-js against the
// user's own session. No server secret is involved. Error text never reveals
// whether an email address or username is registered.
export const MIN_PASSWORD_LENGTH = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthError = { message?: string } | null;
export type AccountAuthClient = {
  auth: {
    updateUser(
      attributes: { email?: string; password?: string },
      options?: { emailRedirectTo?: string },
    ): Promise<{ error: AuthError }>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: AuthError }>;
    signOut(options: { scope: "others" | "global" | "local" }): Promise<{ error: AuthError }>;
  };
};
export type AccountResult = { ok: true; notice: string } | { ok: false; error: string };

export function apiOrigin(raw: string | undefined): string | null {
  const value = raw?.trim().replace(/\/+$/, "");
  return value ? value : null;
}

export function forgotPasswordUrl(origin: string | undefined): string | null {
  const base = apiOrigin(origin);
  return base ? `${base}/forgot-password` : null;
}

export function validateNewPassword(next: string, confirm: string): string | null {
  if (next.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (next !== confirm) return "The two new passwords do not match.";
  return null;
}

const EMAIL_FAILED = "We could not send the confirmation link. Check the address and try again later.";

export async function setRecoveryEmail(
  client: AccountAuthClient | null,
  rawEmail: string,
  origin: string | undefined,
): Promise<AccountResult> {
  const email = rawEmail.trim();
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "Enter a valid email address." };
  const base = apiOrigin(origin);
  if (!client || !base) return { ok: false, error: "Recovery email is not available right now." };
  try {
    const { error } = await client.auth.updateUser({ email }, { emailRedirectTo: `${base}/auth/confirm?type=email_change` });
    // The raw provider message could disclose that the address is already taken, so it is never shown.
    if (error) return { ok: false, error: EMAIL_FAILED };
    return {
      ok: true,
      notice: `We sent a confirmation link to ${email}. Open it to finish. Until you do, this account cannot be recovered.`,
    };
  } catch {
    return { ok: false, error: EMAIL_FAILED };
  }
}

export async function changePassword(
  client: AccountAuthClient | null,
  input: { email: string | undefined; current: string; next: string; confirm: string },
): Promise<AccountResult> {
  if (!input.current) return { ok: false, error: "Enter your current password." };
  const invalid = validateNewPassword(input.next, input.confirm);
  if (invalid) return { ok: false, error: invalid };
  if (!client || !input.email) return { ok: false, error: "Your session expired. Sign in again." };
  try {
    // Re-check the current password instead of trusting the session alone.
    const check = await client.auth.signInWithPassword({ email: input.email, password: input.current });
    if (check.error) return { ok: false, error: "Your current password is incorrect." };
    const updated = await client.auth.updateUser({ password: input.next });
    if (updated.error) return { ok: false, error: "Your password could not be changed. Please try again later." };
    return { ok: true, notice: "Password updated. You can also sign out other devices below." };
  } catch {
    return { ok: false, error: "Your password could not be changed. Please try again later." };
  }
}

export async function signOutOtherDevices(client: AccountAuthClient | null): Promise<AccountResult> {
  if (!client) return { ok: false, error: "Your session expired. Sign in again." };
  try {
    const { error } = await client.auth.signOut({ scope: "others" });
    if (error) return { ok: false, error: "Other devices could not be signed out. Please try again." };
    return { ok: true, notice: "Signed out of your other devices. This device stays signed in." };
  } catch {
    return { ok: false, error: "Other devices could not be signed out. Please try again." };
  }
}
