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
  providedStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): BusinessRepository {
  // Accessing localStorage itself can throw in restricted/private browser
  // contexts, so resolve it defensively instead of during parameter evaluation.
  let storage = providedStorage;
  if (!storage && typeof window !== 'undefined') {
    try {
      storage = window.localStorage;
    } catch {
      storage = undefined;
    }
  }

  return {
    load() {
      if (!storage) return emptyState();
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return emptyState();
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return emptyState();
        }
        const saved = parsed as Partial<BusinessState>;
        // Keep malformed or older records from breaking screens that expect arrays.
        return {
          ...emptyState(),
          ...saved,
          products: Array.isArray(saved.products) ? saved.products : [],
          inventoryMovements: Array.isArray(saved.inventoryMovements) ? saved.inventoryMovements : [],
          customers: Array.isArray(saved.customers) ? saved.customers : [],
          sales: Array.isArray(saved.sales) ? saved.sales : [],
          expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
          revenueTargets: Array.isArray(saved.revenueTargets) ? saved.revenueTargets : [],
          tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
          workspace: saved.workspace && typeof saved.workspace === 'object' ? saved.workspace : null,
        };
      } catch {
        return emptyState();
      }
    },
    save(state) {
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Storage can be unavailable or full. Keep the current session usable.
      }
    },
    clear() {
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        // Clearing unavailable storage should not crash the application.
      }
    },
  };
}