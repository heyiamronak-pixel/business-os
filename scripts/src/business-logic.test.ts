import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPurchaseToInventory,
  applySaleToInventory,
  calculateMetrics,
  buildSaleReversalMovements,
  paidRevenueWithinRange,
  createPurchaseItems,
  createSaleItems,
  inventoryMovementDelta,
  saleTotals,
  validateProductRecord,
  purchasePaymentSummary,
  revertSaleFromInventory,
} from '../../artifacts/business-os/src/services/business-logic.ts';
import type { BusinessState, Product, SaleItem } from '../../artifacts/business-os/src/domain/types.ts';

const product: Product = {
  id: 'p1',
  name: 'Test item',
  sku: 'TEST-1',
  barcode: '',
  category: 'General',
  costPrice: 40,
  sellingPrice: 100,
  stock: 5,
  minimumStock: 1,
  unit: 'piece',
  imageDataUrl: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('sale cart merges repeated product rows before stock validation', () => {
  const items = createSaleItems([product], [
    { productId: 'p1', quantity: 2 },
    { productId: 'p1', quantity: 2 },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 4);
  assert.equal(items[0].total, 400);
});

test('sale cart rejects combined quantity greater than available stock', () => {
  assert.throws(
    () => createSaleItems([product], [
      { productId: 'p1', quantity: 3 },
      { productId: 'p1', quantity: 3 },
    ]),
    /not have enough stock/,
  );
});

test('sale cart rejects invalid quantities and missing products', () => {
  assert.throws(() => createSaleItems([product], [{ productId: 'p1', quantity: 0 }]), /valid product/);
  assert.throws(() => createSaleItems([product], [{ productId: 'missing', quantity: 1 }]), /no longer exists/);
});

test('sale totals cap discounts and calculate cost and gross profit', () => {
  const items = createSaleItems([product], [{ productId: 'p1', quantity: 2 }]);
  assert.deepEqual(saleTotals(items, 500), {
    subtotal: 200,
    discount: 200,
    total: 0,
    costTotal: 80,
    grossProfit: -80,
  });
});

test('inventory is decremented once for merged sale items and movement is recorded', () => {
  const items: SaleItem[] = createSaleItems([product], [
    { productId: 'p1', quantity: 2 },
    { productId: 'p1', quantity: 1 },
  ]);
  const result = applySaleToInventory(
    [product],
    items,
    (item) => ({
      id: 'm1',
      productId: item.productId,
      type: 'stock-out',
      quantity: item.quantity,
      note: 'sale:test',
      createdAt: '2026-01-02T00:00:00.000Z',
    }),
    [],
  );
  assert.equal(result.products[0].stock, 2);
  assert.equal(result.inventoryMovements.length, 1);
  assert.equal(result.inventoryMovements[0].quantity, 3);
});

test('deleting a sale restores its stock quantities', () => {
  const saleItems = createSaleItems([product], [{ productId: 'p1', quantity: 3 }]);
  const afterSale = [{ ...product, stock: 2 }];
  const restored = revertSaleFromInventory(afterSale, [{
    id: 's1',
    customerId: '',
    items: saleItems,
    subtotal: 300,
    discount: 0,
    total: 300,
    costTotal: 120,
    grossProfit: 180,
    paymentStatus: 'paid',
    createdAt: '2026-01-02T00:00:00.000Z',
  }]);
  assert.equal(restored[0].stock, 5);
});

test('dashboard metrics exclude pending sales and scope target achievement to target dates', () => {
  const sale = (id: string, createdAt: string, total: number, costTotal: number, paymentStatus: 'paid' | 'pending' | 'refunded') => ({
    id,
    customerId: '',
    items: [],
    subtotal: total,
    discount: 0,
    total,
    costTotal,
    grossProfit: total - costTotal,
    paymentStatus,
    createdAt,
  });
  const state: BusinessState = {
    workspace: null,
    products: [],
    inventoryMovements: [],
    customers: [],
    sales: [
      sale('inside-paid', '2026-11-05T10:00:00.000Z', 500, 50, 'paid'),
      sale('inside-pending', '2026-11-10T10:00:00.000Z', 400, 40, 'pending'),
      sale('outside-paid', '2026-10-20T10:00:00.000Z', 900, 90, 'paid'),
    ],
    expenses: [{
      id: 'e1',
      category: 'Rent',
      amount: 100,
      date: '2026-11-01',
      description: '',
      paymentMethod: 'Bank',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    }],
    revenueTargets: [{
      id: 't1',
      period: 'monthly',
      label: 'November target',
      amount: 1000,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    }],
    tasks: [],
    teamMembers: [],
    campaigns: [],
    suppliers: [],
    purchases: [],
  };

  const metrics = calculateMetrics(state, new Date(2026, 10, 16, 12, 0, 0));
  assert.equal(metrics.revenue, 1400);
  assert.equal(metrics.profit, 1160);
  assert.equal(metrics.revenueTarget, 1000);
  assert.equal(metrics.revenueAchieved, 500);
  assert.equal(metrics.targetRemaining, 500);
  assert.equal(metrics.targetAchievement, 50);
});

test('purchase items validate products and preserve a purchase cost snapshot', () => {
  const items = createPurchaseItems([product], [{ productId: 'p1', quantity: 3, unitCost: 35 }]);
  assert.deepEqual(items, [{
    productId: 'p1',
    name: 'Test item',
    quantity: 3,
    unitCost: 35,
    total: 105,
  }]);
  assert.throws(() => createPurchaseItems([product], [{ productId: 'missing', quantity: 1, unitCost: 10 }]), /no longer exists/);
  assert.throws(() => createPurchaseItems([product], [{ productId: 'p1', quantity: 0, unitCost: 10 }]), /whole quantity/);
});

test('purchase receipt increases stock and writes stock-in movements', () => {
  const items = createPurchaseItems([product], [
    { productId: 'p1', quantity: 2, unitCost: 35 },
    { productId: 'p1', quantity: 1, unitCost: 38 },
  ]);
  const result = applyPurchaseToInventory(
    [product],
    items,
    (item) => ({
      id: 'purchase-movement-' + item.quantity,
      productId: item.productId,
      type: 'stock-in',
      quantity: item.quantity,
      note: 'purchase:p1',
      createdAt: '2026-11-16T00:00:00.000Z',
    }),
    [],
  );
  assert.equal(result.products[0].stock, 8);
  assert.equal(result.inventoryMovements.length, 2);
  assert.ok(result.inventoryMovements.every(movement => movement.type === 'stock-in'));
});

test('purchase payment summary classifies pending, partial and paid balances', () => {
  assert.deepEqual(purchasePaymentSummary(100, 0), { paidAmount: 0, balance: 100, paymentStatus: 'Pending' });
  assert.deepEqual(purchasePaymentSummary(100, 40), { paidAmount: 40, balance: 60, paymentStatus: 'Partial' });
  assert.deepEqual(purchasePaymentSummary(100, 100), { paidAmount: 100, balance: 0, paymentStatus: 'Paid' });
  assert.throws(() => purchasePaymentSummary(100, 101), /between zero/);
});

test('inventory movements require positive in/out quantities and allow signed adjustments', () => {
  assert.equal(inventoryMovementDelta('stock-in', 4), 4);
  assert.equal(inventoryMovementDelta('stock-out', 2.5), -2.5);
  assert.equal(inventoryMovementDelta('adjustment', -3), -3);
  assert.throws(() => inventoryMovementDelta('stock-in', -2), /positive quantity/);
  assert.throws(() => inventoryMovementDelta('stock-out', -2), /positive quantity/);
  assert.throws(() => inventoryMovementDelta('adjustment', 0), /non-zero quantity/);
});

test('target revenue calculation includes only paid sales within target dates', () => {
  const sales = [
    { id: 'before', createdAt: '2026-10-31T23:59:00.000Z', paymentStatus: 'paid', total: 100 },
    { id: 'inside', createdAt: '2026-11-10T09:00:00.000Z', paymentStatus: 'paid', total: 250 },
    { id: 'pending', createdAt: '2026-11-12T09:00:00.000Z', paymentStatus: 'pending', total: 500 },
    { id: 'after', createdAt: '2026-12-01T00:00:00.000Z', paymentStatus: 'paid', total: 700 },
  ] as BusinessState['sales'];
  assert.equal(paidRevenueWithinRange(sales, '2026-11-01', '2026-11-30'), 250);
});

test('product records reject duplicate SKU/barcode and invalid numeric values', () => {
  const productWithCode = { ...product, sku: 'ABC-1', barcode: '123456' };
  assert.throws(() => validateProductRecord({ ...product, sku: ' abc-1 ' }, [productWithCode]), /SKU is already used/);
  assert.throws(() => validateProductRecord({ ...product, barcode: '123456' }, [productWithCode]), /barcode is already used/);
  assert.throws(() => validateProductRecord({ ...product, sellingPrice: -1 }, []), /non-negative/);
  assert.doesNotThrow(() => validateProductRecord({ ...product, id: 'p1', sku: 'ABC-1', barcode: '123456' }, [productWithCode]));
});

test('deleting a sale creates traceable stock-in reversal movements', () => {
  const items = createSaleItems([product], [{ productId: 'p1', quantity: 2 }]);
  const sale = {
    id: 'sale-1', customerId: '', items, subtotal: 200, discount: 0, total: 200,
    costTotal: 80, grossProfit: 120, paymentStatus: 'paid' as const,
    createdAt: '2026-11-16T09:00:00.000Z',
  };
  const movements = buildSaleReversalMovements(sale, () => 'reverse-1', '2026-11-16T10:00:00.000Z');
  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, 'stock-in');
  assert.equal(movements[0].quantity, 2);
  assert.equal(movements[0].note, 'sale-void:sale-1');
});
