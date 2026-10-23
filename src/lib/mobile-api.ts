export class MobileApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 0,
  ) {
    super(message);
  }
}

type SessionSource = () => Promise<{
  access_token: string;
  expires_at?: number;
} | null>;
export type MobileFetch = (
  url: string,
  options: RequestInit,
) => Promise<Response>;

// No cookie auth, actor IDs, internal RPC secret, or automatic mutation retries.
export function createMobileApi(
  baseUrl: string | undefined,
  session: SessionSource,
  request: MobileFetch = fetch,
) {
  return async function call<T>(
    operation: string,
    input: unknown = {},
    idempotencyKey?: string,
  ): Promise<T> {
    if (!baseUrl)
      throw new MobileApiError(
        "This feature is waiting for the Lonagram mobile connection.",
        "configuration",
      );
    const origin = new URL(baseUrl);
    if (
      origin.protocol !== "https:" &&
      !(
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname)
      )
    ) {
      throw new MobileApiError(
        "The Lonagram API must use HTTPS.",
        "configuration",
      );
    }
    if (
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/"
    ) {
      throw new MobileApiError(
        "Configure the Lonagram API origin without a path or credentials.",
        "configuration",
      );
    }
    const current = await session();
    if (
      !current ||
      (current.expires_at && current.expires_at * 1000 <= Date.now())
    ) {
      throw new MobileApiError(
        "Your session expired. Sign in again.",
        "unauthenticated",
        401,
      );
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await request(
        new URL("/api/mobile/v1", origin).toString(),
        {
          method: "POST",
          credentials: "omit",
          redirect: "error",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${current.access_token}`,
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          },
          body: JSON.stringify({ operation, input }),
        },
      );
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        data?: T;
        error?: string;
        code?: string;
      } | null;
      if (!response.ok || result?.ok !== true) {
        throw new MobileApiError(
          result?.error ??
            "Could not complete the request. Your draft is kept.",
          result?.code ?? "api",
          response.status,
        );
      }
      return result.data as T;
    } catch (error) {
      if (error instanceof MobileApiError) throw error;
      throw new MobileApiError(
        "Connection interrupted. Your draft is kept. Retry to check the same request.",
        "network",
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}
