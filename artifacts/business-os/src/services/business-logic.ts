import type {
  BusinessMetrics,
  BusinessState,
  InventoryMovement,
  Product,
  Sale,
  SaleItem,
} from '@/domain/types';

export function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function localDateKey(date: Date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

export function calculateMetrics(state: BusinessState, today = new Date()): BusinessMetrics {
  const revenue = state.sales
    .filter((sale) => sale.paymentStatus === 'paid')
    .reduce((sum, sale) => sum + sale.total, 0);
  const expenses = state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const profit = revenue - state.sales
    .filter((sale) => sale.paymentStatus === 'paid')
    .reduce((sum, sale) => sum + sale.costTotal, 0) - expenses;
  const currentTarget = state.revenueTargets.find((target) => {
    const current = localDateKey(today);
    return target.startDate <= current && target.endDate >= current;
  });
  const revenueTarget = currentTarget?.amount ?? 0;
  const revenueAchieved = currentTarget
    ? state.sales
        .filter((sale) => sale.paymentStatus === 'paid' && sale.createdAt.slice(0, 10) >= currentTarget.startDate && sale.createdAt.slice(0, 10) <= currentTarget.endDate)
        .reduce((sum, sale) => sum + sale.total, 0)
    : 0;
  const targetRemaining = Math.max(revenueTarget - revenueAchieved, 0);
  const daysRemaining = currentTarget
    ? Math.max(
        Math.ceil(
          (new Date(`${currentTarget.endDate}T23:59:59`).getTime() - today.getTime()) /
            86400000,
        ),
        1,
      )
    : 0;
  const lowStockCount = state.products.filter(
    (product) => product.stock > 0 && product.stock <= product.minimumStock,
  ).length;
  const outOfStockCount = state.products.filter((product) => product.stock <= 0).length;
  const overdueTaskCount = state.tasks.filter(
    (task) => task.status !== 'Completed' && task.dueDate < localDateKey(today),
  ).length;

  return {
    revenue,
    expenses,
    profit,
    profitMargin: revenue ? (profit / revenue) * 100 : 0,
    revenueTarget,
    revenueAchieved,
    targetRemaining,
    targetAchievement: revenueTarget ? Math.min((revenue / revenueTarget) * 100, 100) : 0,
    requiredDailyRevenue: daysRemaining ? targetRemaining / daysRemaining : 0,
    requiredWeeklyRevenue: daysRemaining ? (targetRemaining / daysRemaining) * 7 : 0,
    salesCount: state.sales.length,
    customerCount: state.customers.length,
    taskCount: state.tasks.filter((task) => task.status !== 'Completed').length,
    overdueTaskCount,
    lowStockCount,
    outOfStockCount,
  };
}

export function createSaleItems(
  products: Product[],
  cart: Array<{ productId: string; quantity: number }>,
): SaleItem[] {
  // Merge repeated cart rows before checking stock. Otherwise two rows for the
  // same product could each pass validation while the combined quantity
  // exceeds stock, and inventory would only deduct the first row.
  const quantities = new Map<string, number>();
  for (const item of cart) {
    if (!item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error('Enter a valid product and a quantity greater than zero.');
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  return Array.from(quantities, ([productId, quantity]) => {
    const product = products.find((item) => item.id === productId);
    if (!product) throw new Error('One of the selected products no longer exists.');
    if (quantity > product.stock) {
      throw new Error(`${product.name} does not have enough stock.`);
    }
    return {
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.sellingPrice,
      unitCost: product.costPrice,
      total: product.sellingPrice * quantity,
    };
  });
}

export function saleTotals(items: SaleItem[], discount: number) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const total = subtotal - safeDiscount;
  const costTotal = items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
  return { subtotal, discount: safeDiscount, total, costTotal, grossProfit: total - costTotal };
}

export function applySaleToInventory(
  products: Product[],
  items: SaleItem[],
  movementFactory: (item: SaleItem) => InventoryMovement,
  movements: InventoryMovement[],
) {
  const quantitiesByProduct = new Map<string, number>();
  for (const item of items) {
    quantitiesByProduct.set(
      item.productId,
      (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  const updatedProducts = products.map((product) => {
    const quantity = quantitiesByProduct.get(product.id) ?? 0;
    return quantity
      ? { ...product, stock: product.stock - quantity, updatedAt: new Date().toISOString() }
      : product;
  });
  return {
    products: updatedProducts,
    inventoryMovements: [...movements, ...items.map(movementFactory)],
  };
}

export function revertSaleFromInventory(products: Product[], sale: Sale[]) {
  return products.map((product) => {
    const quantity = sale
      .flatMap((record) => record.items)
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    return quantity ? { ...product, stock: product.stock + quantity, updatedAt: new Date().toISOString() } : product;
  });
}