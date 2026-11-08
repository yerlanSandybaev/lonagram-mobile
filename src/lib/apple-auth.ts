// Sign in with Apple helpers. Apple receives a SHA-256 hash of a random nonce,
// Supabase receives the raw nonce, and Supabase checks that the two match the
// identity token. That blocks replay of a stolen token.
export type AppleNonce = { raw: string; hashed: string };

export async function createAppleNonce(
  random: () => string,
  sha256: (value: string) => Promise<string>,
): Promise<AppleNonce> {
  const raw = random().replace(/-/g, "");
  return { raw, hashed: await sha256(raw) };
}

export function appleIdentityToken(credential: { identityToken?: string | null } | null | undefined): string | null {
  const token = credential?.identityToken?.trim();
  return token ? token : null;
}

// The user closed the Apple sheet. That is not an error worth showing.
export function isAppleCancel(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "ERR_REQUEST_CANCELED";
}
