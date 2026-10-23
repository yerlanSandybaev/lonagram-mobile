import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createDraftStore } from "@/lib/drafts";

const DraftContext = createContext<ReturnType<typeof createDraftStore> | null>(
  null,
);
export function DraftProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createDraftStore);
  return (
    <DraftContext.Provider value={store}>{children}</DraftContext.Provider>
  );
}
export function useMessageDraft(id: string) {
  const store = useContext(DraftContext);
  if (!store) throw new Error("DraftProvider is missing.");
  const draft = useSyncExternalStore(store.subscribe, () => store.get(id));
  return {
    ...draft,
    edit: (text: string) => store.edit(id, text),
    send: (submit: (text: string, key: string) => Promise<unknown>) =>
      store.send(id, submit),
  };
}
