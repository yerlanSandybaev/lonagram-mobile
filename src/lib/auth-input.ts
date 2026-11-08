const USERNAME = /^[a-z0-9_]{3,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
  displayName: string;
  is18Plus: boolean;
};

export type SignUpValues = {
  email: string;
  password: string;
  username: string;
  displayName: string;
  data: {
    is_18_plus: true;
    username: string;
    display_name: string;
  };
};

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateSignUp(input: SignUpInput): FieldResult<SignUpValues> {
  if (!input.is18Plus) return { ok: false, error: "Lonagram is for adults 18 and older." };
  const username = input.username.trim().toLowerCase();
  if (!USERNAME.test(username)) {
    return { ok: false, error: "Username must be 3–20 characters using lowercase letters, numbers, or underscores." };
  }
  const displayName = input.displayName.trim();
  if (displayName.length < 2 || displayName.length > 40) {
    return { ok: false, error: "Display name must be between 2 and 40 characters." };
  }
  const email = input.email.trim();
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  return {
    ok: true,
    value: {
      email,
      password: input.password,
      username,
      displayName,
      data: {
        is_18_plus: true,
        username,
        display_name: displayName,
      },
    },
  };
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
