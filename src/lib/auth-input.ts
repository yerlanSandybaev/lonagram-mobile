const USERNAME = /^[a-z0-9_]{3,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-up is username + password, with an optional contact email (no code is sent).
export type SignUpInput = {
  username: string;
  password: string;
  email?: string;
  is18Plus: boolean;
};

export type SignUpValues = {
  username: string;
  password: string;
  email?: string;
};

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

// Same rules as the website's sign-up.
export function validateSignUp(input: SignUpInput): FieldResult<SignUpValues> {
  if (!input.is18Plus) return { ok: false, error: "Lonagram is for adults 18 and older." };
  const username = input.username.trim().toLowerCase();
  if (!USERNAME.test(username)) {
    return { ok: false, error: "Username must be 3–20 characters using lowercase letters, numbers, or underscores." };
  }
  if (input.password.length < 8 || input.password.length > 128) return { ok: false, error: "Use a password between 8 and 128 characters." };
  const email = input.email?.trim().toLowerCase() ?? "";
  if (email && (!EMAIL.test(email) || email.length > 254)) return { ok: false, error: "Enter a valid email address, or leave it blank." };
  return { ok: true, value: { username, password: input.password, ...(email ? { email } : {}) } };
}

// Whether the sign-in field holds a username (not an email address).
export function isUsername(identifier: string): boolean {
  return USERNAME.test(identifier.trim().toLowerCase());
}

// Accounts created with only a username use this internal address on the web (it never receives mail).
export const INTERNAL_ACCOUNT_DOMAIN = "accounts.lonagram.invalid";

// The sign-in field takes an email or a username, like the website.
export function signInEmail(identifier: string): string | null {
  const value = identifier.trim();
  if (value.includes("@")) return EMAIL.test(value) ? value : null;
  const username = value.toLowerCase();
  return USERNAME.test(username) ? `${username}@${INTERNAL_ACCOUNT_DOMAIN}` : null;
}

export function validateSignIn(input: { email: string; password: string }): FieldResult<{ email: string; password: string }> {
  const email = signInEmail(input.email);
  if (!email || input.password.length < 8) {
    return { ok: false, error: "Email, username or password is incorrect." };
  }
  return { ok: true, value: { email, password: input.password } };
}
