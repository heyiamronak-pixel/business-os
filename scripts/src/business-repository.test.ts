import test from "node:test";
import assert from "node:assert/strict";
import { createLocalBusinessRepository } from "../../artifacts/business-os/src/services/business-repository.ts";

const STORAGE_KEY = "business-os-state-v2";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

test("new repository starts with every current collection", () => {
  const state = createLocalBusinessRepository(new MemoryStorage()).load();
  assert.equal(state.workspace, null);
  assert.deepEqual(state.products, []);
  assert.deepEqual(state.inventoryMovements, []);
  assert.deepEqual(state.customers, []);
  assert.deepEqual(state.sales, []);
  assert.deepEqual(state.expenses, []);
  assert.deepEqual(state.revenueTargets, []);
  assert.deepEqual(state.tasks, []);
  assert.deepEqual(state.teamMembers, []);
  assert.deepEqual(state.campaigns, []);
  assert.deepEqual(state.suppliers, []);
  assert.deepEqual(state.purchases, []);
});

test("older browser data loads without losing records or missing new collections", () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({
    workspace: null,
    products: [{ id: "legacy-product", name: "Legacy item" }],
    inventoryMovements: [],
    customers: [{ id: "legacy-customer", name: "Legacy customer" }],
    sales: [],
    expenses: [],
    revenueTargets: [],
    tasks: [],
  }));

  const state = createLocalBusinessRepository(storage).load();
  assert.equal(state.products[0]?.id, "legacy-product");
  assert.equal(state.customers[0]?.id, "legacy-customer");
  assert.deepEqual(state.teamMembers, []);
  assert.deepEqual(state.campaigns, []);
  assert.deepEqual(state.suppliers, []);
  assert.deepEqual(state.purchases, []);
});

test("repository round-trips newer workspace collections", () => {
  const storage = new MemoryStorage();
  const repository = createLocalBusinessRepository(storage);
  const state = repository.load();
  state.teamMembers = [{
    id: "member-1",
    name: "Asha",
    email: "asha@example.test",
    phone: "9999999999",
    role: "Manager",
    department: "Operations",
    status: "Active",
    createdAt: "2026-11-16T08:00:00.000Z",
    updatedAt: "2026-11-16T08:00:00.000Z",
  }];
  state.campaigns = [{
    id: "campaign-1",
    name: "Winter leads",
    channel: "Meta Ads",
    objective: "Leads",
    status: "Active",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    budget: 10000,
    spend: 4500,
    impressions: 20000,
    clicks: 600,
    leads: 40,
    conversions: 8,
    revenue: 24000,
    notes: "",
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-16T08:00:00.000Z",
  }];
  repository.save(state);

  const restored = repository.load();
  assert.deepEqual(restored.teamMembers, state.teamMembers);
  assert.deepEqual(restored.campaigns, state.campaigns);
});

test("malformed browser JSON falls back safely without throwing", () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, "{not valid json");
  const repository = createLocalBusinessRepository(storage);
  assert.doesNotThrow(() => repository.load());
  assert.deepEqual(repository.load().purchases, []);
});

test("repository remains usable when browser storage is unavailable", () => {
  const repository = createLocalBusinessRepository();
  assert.deepEqual(repository.load().products, []);
  assert.doesNotThrow(() => repository.save(repository.load()));
  assert.doesNotThrow(() => repository.clear());
});
