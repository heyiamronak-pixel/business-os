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
  TeamMember,
  MarketingCampaign,
  Supplier,
  Purchase,
  PurchasePaymentStatus,
  ThemeId,
  ThemeMode,
  WorkspaceSetup,
} from '@/domain/types';
import {
  applyPurchaseToInventory,
  applySaleToInventory,
  calculateMetrics,
  createPurchaseItems,
  createSaleItems,
  makeId,
  purchasePaymentSummary,
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
type TeamMemberInput = Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type CampaignInput = Omit<MarketingCampaign, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };
type SupplierInput = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

type BusinessContextValue = {
  state: BusinessState;
  workspace: WorkspaceSetup | null;
  metrics: BusinessMetrics;
  saveWorkspace: (setup: WorkspaceSetup) => void;
  clearWorkspace: () => void;
  restoreBackup: (backup: BusinessState) => void;
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
  saveTeamMember: (member: TeamMemberInput) => void;
  deleteTeamMember: (id: string) => void;
  saveCampaign: (campaign: CampaignInput) => void;
  deleteCampaign: (id: string) => void;
  saveSupplier: (supplier: SupplierInput) => void;
  deleteSupplier: (id: string) => void;
  createPurchase: (input: { supplierId: string; items: Array<{ productId: string; quantity: number; unitCost: number }>; paidAmount: number; note: string }) => void;
  updatePurchasePayment: (id: string, paidAmount: number) => void;
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

  const restoreBackup = (backup: BusinessState) => {
    if (!backup || typeof backup !== 'object' || !Array.isArray(backup.products) || !Array.isArray(backup.inventoryMovements) || !Array.isArray(backup.customers) || !Array.isArray(backup.sales) || !Array.isArray(backup.expenses) || !Array.isArray(backup.revenueTargets) || !Array.isArray(backup.tasks)) {
      throw new Error('Backup file is missing required workspace data.');
    }
    setState({
      workspace: backup.workspace && typeof backup.workspace === 'object' ? backup.workspace : null,
      products: backup.products,
      inventoryMovements: backup.inventoryMovements,
      customers: backup.customers,
      sales: backup.sales,
      expenses: backup.expenses,
      revenueTargets: backup.revenueTargets,
      tasks: backup.tasks,
      teamMembers: Array.isArray(backup.teamMembers) ? backup.teamMembers : [],
      campaigns: Array.isArray(backup.campaigns) ? backup.campaigns : [],
    });
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

  const saveTeamMember = (member: TeamMemberInput) => {
    if (!member.name.trim()) throw new Error('Enter a team member name.');
    if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) throw new Error('Enter a valid email address.');
    setState((current) => {
      const next = withDates({ ...member, name: member.name.trim(), email: member.email.trim(), phone: member.phone.trim(), department: member.department.trim() });
      const exists = current.teamMembers.some((item) => item.id === next.id);
      return { ...current, teamMembers: exists ? current.teamMembers.map((item) => item.id === next.id ? { ...item, ...next } : item) : [next, ...current.teamMembers] };
    });
  };

  const deleteTeamMember = (id: string) => {
    setState((current) => ({ ...current, teamMembers: current.teamMembers.filter((member) => member.id !== id) }));
  };

  const saveCampaign = (campaign: CampaignInput) => {
    if (!campaign.name.trim()) throw new Error('Enter a campaign name.');
    if (campaign.startDate && campaign.endDate && campaign.endDate < campaign.startDate) throw new Error('Campaign end date must be on or after its start date.');
    const numericFields = [campaign.budget, campaign.spend, campaign.impressions, campaign.clicks, campaign.leads, campaign.conversions, campaign.revenue];
    if (numericFields.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Campaign metrics must be valid non-negative numbers.');
    if (campaign.clicks > campaign.impressions && campaign.impressions > 0) throw new Error('Clicks cannot exceed impressions.');
    if (campaign.conversions > campaign.leads && campaign.leads > 0) throw new Error('Conversions cannot exceed leads.');
    setState((current) => {
      const next = withDates({ ...campaign, name: campaign.name.trim(), channel: campaign.channel.trim(), objective: campaign.objective.trim(), notes: campaign.notes.trim() });
      const exists = current.campaigns.some((item) => item.id === next.id);
      return { ...current, campaigns: exists ? current.campaigns.map((item) => item.id === next.id ? { ...item, ...next } : item) : [next, ...current.campaigns] };
    });
  };

  const deleteCampaign = (id: string) => {
    setState((current) => ({ ...current, campaigns: current.campaigns.filter((campaign) => campaign.id !== id) }));
  };

  const saveSupplier = (supplier: SupplierInput) => {
    if (!supplier.name.trim()) throw new Error('Enter a supplier name.');
    if (supplier.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.email)) throw new Error('Enter a valid email address.');
    setState((current) => {
      const next = withDates({ ...supplier, name: supplier.name.trim(), contactName: supplier.contactName.trim(), email: supplier.email.trim(), phone: supplier.phone.trim(), address: supplier.address.trim(), taxId: supplier.taxId.trim(), notes: supplier.notes.trim() });
      const exists = current.suppliers.some((item) => item.id === next.id);
      return { ...current, suppliers: exists ? current.suppliers.map((item) => item.id === next.id ? { ...item, ...next } : item) : [next, ...current.suppliers] };
    });
  };

  const deleteSupplier = (id: string) => {
    if (state.purchases.some((purchase) => purchase.supplierId === id)) throw new Error('This supplier has purchase history. Mark the supplier inactive instead of deleting the record.');
    setState((current) => ({ ...current, suppliers: current.suppliers.filter((supplier) => supplier.id !== id) }));
  };

  const createPurchase = ({ supplierId, items, paidAmount, note }: { supplierId: string; items: Array<{ productId: string; quantity: number; unitCost: number }>; paidAmount: number; note: string }) => {
    if (!supplierId) throw new Error('Select a supplier.');
    setState((current) => {
      const supplier = current.suppliers.find((item) => item.id === supplierId);
      if (!supplier || supplier.status !== 'Active') throw new Error('Select an active supplier.');
      const purchaseItems = createPurchaseItems(current.products, items);
      const total = purchaseItems.reduce((sum, item) => sum + item.total, 0);
      const payment = purchasePaymentSummary(total, paidAmount);
      const now = new Date().toISOString();
      const id = makeId('purchase');
      const purchase: Purchase = { id, supplierId, supplierName: supplier.name, items: purchaseItems, subtotal: total, total, ...payment, note: note.trim(), createdAt: now, updatedAt: now };
      const inventory = applyPurchaseToInventory(
        current.products,
        purchaseItems,
        (item) => ({ id: makeId('movement'), productId: item.productId, type: 'stock-in', quantity: item.quantity, note: 'purchase:' + id, createdAt: now }),
        current.inventoryMovements,
      );
      return { ...current, ...inventory, purchases: [purchase, ...current.purchases] };
    });
  };

  const updatePurchasePayment = (id: string, paidAmount: number) => {
    if (!Number.isFinite(paidAmount) || paidAmount < 0) throw new Error('Enter a valid paid amount.');
    setState((current) => {
      const purchase = current.purchases.find((item) => item.id === id);
      if (!purchase) return current;
      const payment = purchasePaymentSummary(purchase.total, paidAmount);
      return { ...current, purchases: current.purchases.map((item) => item.id === id ? { ...item, ...payment, updatedAt: new Date().toISOString() } : item) };
    });
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
      restoreBackup,
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
      saveTeamMember,
      deleteTeamMember,
      saveCampaign,
      deleteCampaign,
      saveSupplier,
      deleteSupplier,
      createPurchase,
      updatePurchasePayment,
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