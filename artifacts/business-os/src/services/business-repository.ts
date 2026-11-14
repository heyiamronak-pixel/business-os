import type { BusinessState } from '@/domain/types';

export interface BusinessRepository {
  load(): BusinessState;
  save(state: BusinessState): void;
  clear(): void;
}

const STORAGE_KEY = 'business-os-state-v2';

const emptyState = (): BusinessState => ({
  workspace: null,
  products: [],
  inventoryMovements: [],
  customers: [],
  sales: [],
  expenses: [],
  revenueTargets: [],
  tasks: [],
});

export function createLocalBusinessRepository(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined =
    typeof window === 'undefined' ? undefined : window.localStorage,
): BusinessRepository {
  return {
    load() {
      if (!storage) return emptyState();
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return emptyState();
        return { ...emptyState(), ...(JSON.parse(raw) as Partial<BusinessState>) };
      } catch {
        return emptyState();
      }
    },
    save(state) {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    clear() {
      storage?.removeItem(STORAGE_KEY);
    },
  };
}