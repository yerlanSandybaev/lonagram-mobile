export const MOBILE_AUTH_REDIRECT = "lonagram://auth/callback";

export function oauthCode(url: string): string {
  const parsed = new URL(url);
  if (
    `${parsed.protocol}//${parsed.host}${parsed.pathname}` !==
    MOBILE_AUTH_REDIRECT
  )
    throw new Error("Unexpected sign-in redirect.");
  if (parsed.searchParams.has("error"))
    throw new Error("Google sign-in could not finish. Please try again.");
  const code = parsed.searchParams.get("code");
  if (!code)
    throw new Error(
      "Sign-in did not return a confirmation code. Please try again.",
    );
  return code;
}
