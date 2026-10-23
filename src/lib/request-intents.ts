// Non-chat actions keep a request key through uncertain failures, and rotate it
// after a confirmed result so later actions cannot replay an old conversation.
export function createIntentRunner() {
  const keys = new Map<string, string>();
  const running = new Map<string, Promise<unknown>>();
  return function run<T>(
    scope: string,
    submit: (key: string) => Promise<T>,
  ): Promise<T> {
    const existing = running.get(scope);
    if (existing) return existing as Promise<T>;
    const key =
      keys.get(scope) ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    keys.set(scope, key);
    const promise = Promise.resolve()
      .then(() => submit(key))
      .then((result) => {
        keys.delete(scope);
        return result;
      })
      .catch((error: unknown) => {
        const status = (error as { status?: number } | null)?.status;
        if (status && status >= 400 && status < 500 && status !== 409)
          keys.delete(scope);
        throw error;
      })
      .finally(() => running.delete(scope));
    running.set(scope, promise);
    return promise;
  };
}
