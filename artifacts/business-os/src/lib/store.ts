import { create } from "zustand";
import { emptyDb, type Business, type WorkspaceDB } from "@/lib/domain";
import { buildContext, deriveNotifications } from "@/lib/engines";
import { localRepository } from "@/lib/repo";
import * as svc from "@/lib/services";

interface AppState {
  hydrated: boolean;
  db: WorkspaceDB;
  currentBusinessId: string | null;
  hydrate: () => void;
  persist: () => void;
  setCurrentBusiness: (id: string | null) => void;
  apply: (next: WorkspaceDB) => void;
  run: (mut: (db: WorkspaceDB) => WorkspaceDB) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  db: emptyDb(),
  currentBusinessId: null,
  hydrate: () => {
    const loaded = localRepository.load();
    const current =
      loaded.currentBusinessId && loaded.db.businesses.some((b) => b.id === loaded.currentBusinessId)
        ? loaded.currentBusinessId
        : loaded.db.businesses[0]?.id ?? null;
    set({ db: loaded.db, currentBusinessId: current, hydrated: true });
  },
  persist: () => {
    localRepository.save({ db: get().db, currentBusinessId: get().currentBusinessId });
  },
  setCurrentBusiness: (id) => {
    set({ currentBusinessId: id });
    get().persist();
  },
  apply: (next) => {
    const currentId = get().currentBusinessId;
    const business = next.businesses.find((b) => b.id === currentId);
    let db = next;
    if (business) {
      const ctx = buildContext(next, business);
      db = svc.mergeNotifications(next, deriveNotifications(ctx));
    }
    set({ db });
    get().persist();
  },
  run: (mut) => {
    get().apply(mut(get().db));
  },
}));

export function useBusiness(): Business | undefined {
  return useAppStore((s) => s.db.businesses.find((b) => b.id === s.currentBusinessId));
}

export function useDb(): WorkspaceDB {
  return useAppStore((s) => s.db);
}

export { svc };
