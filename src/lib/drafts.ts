export type Draft = {
  text: string;
  pending: boolean;
  error: string;
  attempt: { body: string; key: string } | null;
};
const empty: Draft = { text: "", pending: false, error: "", attempt: null };

// This store belongs to one signed-in account and is never persisted to disk.
export function createDraftStore() {
  const drafts = new Map<string, Draft>();
  const listeners = new Set<() => void>();
  const get = (id: string) => drafts.get(id) ?? empty;
  const update = (id: string, next: Draft) => {
    drafts.set(id, next);
    listeners.forEach((listener) => listener());
  };
  return {
    get,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    edit(id: string, text: string) {
      if (!get(id).pending) update(id, { ...get(id), text });
    },
    async send(
      id: string,
      submit: (text: string, key: string) => Promise<unknown>,
    ) {
      const draft = get(id);
      const body = draft.text.trim();
      if (draft.pending || !body) return false;
      const attempt =
        draft.attempt?.body === body
          ? draft.attempt
          : {
              body,
              key: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
            };
      update(id, { ...draft, pending: true, error: "", attempt });
      try {
        await submit(body, attempt.key);
        update(id, { ...empty });
        return true;
      } catch (error) {
        update(id, {
          ...draft,
          pending: false,
          attempt,
          error:
            error instanceof Error
              ? error.message
              : "Could not send. Your draft is kept.",
        });
        return false;
      }
    },
  };
}
