import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySaleToInventory,
  createSaleItems,
  saleTotals,
  revertSaleFromInventory,
} from '../../artifacts/business-os/src/services/business-logic.ts';
import type { Product, SaleItem } from '../../artifacts/business-os/src/domain/types.ts';

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
