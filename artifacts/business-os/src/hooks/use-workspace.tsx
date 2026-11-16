import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  BusinessMetrics,
  BusinessState,
  Customer,
  Expense,
  InventoryMovement,
  InventoryMovementType,
  PaymentStatus,
  Product,
  RevenueTarget,
  Sale,
  SaleItem,
  Task,
  ThemeId,
  ThemeMode,
  WorkspaceSetup,
} from '@/domain/types';
import {
  applySaleToInventory,
  calculateMetrics,
  createSaleItems,
  makeId,
  saleTotals,
  revertSaleFromInventory,
} from '@/services/business-logic';
import { createLocalBusinessRepository } from '@/services/business-repository';
import { themeSuggestions } from '@/services/theme-utils';

export type { WorkspaceSetup };

type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type TargetInput = Omit<RevenueTarget, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

type BusinessContextValue = {
  state: BusinessState;
  workspace: WorkspaceSetup | null;
  metrics: BusinessMetrics;
  saveWorkspace: (setup: WorkspaceSetup) => void;
  clearWorkspace: () => void;
  saveProduct: (product: ProductInput) => void;
  deleteProduct: (id: string) => void;
  saveCustomer: (customer: CustomerInput) => void;
  deleteCustomer: (id: string) => void;
  saveExpense: (expense: ExpenseInput) => void;
  deleteExpense: (id: string) => void;
  saveRevenueTarget: (target: TargetInput) => void;
  deleteRevenueTarget: (id: string) => void;
  saveTask: (task: TaskInput) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: Task['status']) => void;
  recordInventoryMovement: (
    productId: string,
    type: InventoryMovementType,
    quantity: number,
    note: string,
  ) => void;
  createSale: (input: {
    customerId: string;
    items: Array<{ productId: string; quantity: number }>;
    discount: number;
    paymentStatus: PaymentStatus;
  }) => void;
  updateSale: (
    id: string,
    input: Pick<Sale, 'customerId' | 'discount' | 'paymentStatus'>,
  ) => void;
  deleteSale: (id: string) => void;
  themeOptions: ReturnType<typeof themeSuggestions>;
};

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

function withDates<T extends { id?: string; createdAt?: string; updatedAt?: string }>(
  item: T,
): T & { id: string; createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  return {
    ...item,
    id: item.id ?? makeId('record'),
    createdAt: item.createdAt ?? now,
    updatedAt: now,
  } as T & { id: string; createdAt: string; updatedAt: string };
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => createLocalBusinessRepository(), []);
  const [state, setState] = useState<BusinessState>(() => repository.load());

  useEffect(() => {
    repository.save(state);
  }, [repository, state]);

  useEffect(() => {
    const root = document.documentElement;
    const workspace = state.workspace;
    const theme = workspace?.themeId ?? 'professional';
    const mode = workspace?.themeMode ?? 'auto';
    root.dataset.theme = theme;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncMode = () => {
      root.classList.toggle('dark', mode === 'dark' || (mode === 'auto' && media.matches));
    };
    syncMode();
    if (mode === 'auto') {
      media.addEventListener?.('change', syncMode);
    }
    return () => media.removeEventListener?.('change', syncMode);
  }, [state.workspace]);

  const saveWorkspace = (setup: WorkspaceSetup) => {
    setState((current) => ({ ...current, workspace: setup }));
  };

  const clearWorkspace = () => {
    setState((current) => ({ ...current, workspace: null }));
  };

  const saveProduct = (product: ProductInput) => {
    setState((current) => {
      const next = withDates(product);
      const exists = current.products.some((item) => item.id === next.id);
      return {
        ...current,
        products: exists
          ? current.products.map((item) => (item.id === next.id ? { ...item, ...next } : item))
          : [next, ...current.products],
      };
    });
  };

  const deleteProduct = (id: string) => {
    setState((current) => ({
      ...current,
      products: current.products.filter((product) => product.id !== id),
    }));
  };

  const saveCustomer = (customer: CustomerInput) => {
    setState((current) => {
      const next = withDates(customer);
      const exists = current.customers.some((item) => item.id === next.id);
      return {
        ...current,
        customers: exists
          ? current.customers.map((item) => (item.id === next.id ? { ...item, ...next } : item))
          : [next, ...current.customers],
      };
    });
  };

  const deleteCustomer = (id: string) => {
    setState((current) => ({
      ...current,
      customers: current.customers.filter((customer) => customer.id !== id),
      sales: current.sales.map((sale) => (sale.customerId === id ? { ...sale, customerId: '' } : sale)),
    }));
  };

  const saveExpense = (expense: ExpenseInput) => {
    setState((current) => {
      const next = withDates(expense);
      const exists = current.expenses.some((item) => item.id === next.id);
      return {
        ...current,
        expenses: exists
          ? current.expenses.map((item) => (item.id === next.id ? { ...item, ...next } : item))
          : [next, ...current.expenses],
      };
    });
  };

  const deleteExpense = (id: string) => {
    setState((current) => ({
      ...current,
      expenses: current.expenses.filter((expense) => expense.id !== id),
    }));
  };

  const saveRevenueTarget = (target: TargetInput) => {
    setState((current) => {
      const next = withDates(target);
      const exists = current.revenueTargets.some((item) => item.id === next.id);
      return {
        ...current,
        revenueTargets: exists
          ? current.revenueTargets.map((item) => (item.id === next.id ? { ...item, ...next } : item))
          : [next, ...current.revenueTargets],
      };
    });
  };

  const deleteRevenueTarget = (id: string) => {
    setState((current) => ({
      ...current,
      revenueTargets: current.revenueTargets.filter((target) => target.id !== id),
    }));
  };

  const saveTask = (task: TaskInput) => {
    setState((current) => {
      const next = withDates(task);
      const exists = current.tasks.some((item) => item.id === next.id);
      return {
        ...current,
        tasks: exists
          ? current.tasks.map((item) => (item.id === next.id ? { ...item, ...next } : item))
          : [next, ...current.tasks],
      };
    });
  };

  const deleteTask = (id: string) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    }));
  };

  const setTaskStatus = (id: string, status: Task['status']) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, status, updatedAt: new Date().toISOString() } : task),
    }));
  };

  const recordInventoryMovement = (
    productId: string,
    type: InventoryMovementType,
    quantity: number,
    note: string,
  ) => {
    if (!Number.isFinite(quantity) || quantity === 0) throw new Error('Enter a non-zero quantity.');
    setState((current) => {
      const product = current.products.find((item) => item.id === productId);
      if (!product) throw new Error('Select a valid product.');
      const delta = type === 'stock-in' ? Math.abs(quantity) : type === 'stock-out' ? -Math.abs(quantity) : quantity;
      const nextStock = product.stock + delta;
      if (nextStock < 0) throw new Error('Stock cannot go below zero.');
      const movement: InventoryMovement = {
        id: makeId('movement'),
        productId,
        type,
        quantity,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      };
      return {
        ...current,
        products: current.products.map((item) => (item.id === productId ? { ...item, stock: nextStock, updatedAt: movement.createdAt } : item)),
        inventoryMovements: [movement, ...current.inventoryMovements],
      };
    });
  };

  const createSale = ({
    customerId,
    items,
    discount,
    paymentStatus,
  }: {
    customerId: string;
    items: Array<{ productId: string; quantity: number }>;
    discount: number;
    paymentStatus: PaymentStatus;
  }) => {
    setState((current) => {
      const saleItems = createSaleItems(current.products, items);
      if (!saleItems.length) throw new Error('Add at least one product to the sale.');
      const totals = saleTotals(saleItems, discount);
      const sale: Sale = {
        id: makeId('sale'),
        customerId,
        items: saleItems,
        ...totals,
        paymentStatus,
        createdAt: new Date().toISOString(),
      };
      const inventory = applySaleToInventory(
        current.products,
        saleItems,
        (item) => ({
          id: makeId('movement'),
          productId: item.productId,
          type: 'stock-out',
          quantity: item.quantity,
          note: `sale:${sale.id}`,
          createdAt: sale.createdAt,
        }),
        current.inventoryMovements,
      );
      return { ...current, ...inventory, sales: [sale, ...current.sales] };
    });
  };

  const updateSale = (
    id: string,
    input: Pick<Sale, 'customerId' | 'discount' | 'paymentStatus'>,
  ) => {
    setState((current) => {
      const sale = current.sales.find((item) => item.id === id);
      if (!sale) return current;
      const totals = saleTotals(sale.items, input.discount);
      return {
        ...current,
        sales: current.sales.map((item) =>
          item.id === id ? { ...item, ...input, ...totals } : item,
        ),
      };
    });
  };

  const deleteSale = (id: string) => {
    setState((current) => {
      const sale = current.sales.find((item) => item.id === id);
      if (!sale) return current;
      const restoredProducts = revertSaleFromInventory(current.products, [sale]);
      return {
        ...current,
        products: restoredProducts,
        sales: current.sales.filter((item) => item.id !== id),
        inventoryMovements: current.inventoryMovements.filter((movement) => movement.note !== `sale:${id}`),
      };
    });
  };

  const value = useMemo<BusinessContextValue>(
    () => ({
      state,
      workspace: state.workspace,
      metrics: calculateMetrics(state),
      saveWorkspace,
      clearWorkspace,
      saveProduct,
      deleteProduct,
      saveCustomer,
      deleteCustomer,
      saveExpense,
      deleteExpense,
      saveRevenueTarget,
      deleteRevenueTarget,
      saveTask,
      deleteTask,
      setTaskStatus,
      recordInventoryMovement,
      createSale,
      updateSale,
      deleteSale,
      themeOptions: themeSuggestions(state.workspace?.brandColor ?? '#1f2937'),
    }),
    [state],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within BusinessProvider');
  return context;
}

export const useWorkspace = useBusiness;