import test from "node:test";
import assert from "node:assert/strict";
import { nextTaskDueDate } from "../../artifacts/business-os/src/lib/task-utils.ts";

test("daily and weekly recurring tasks advance from their due date", () => {
  assert.equal(nextTaskDueDate("2026-11-17", "daily", "2026-11-17T12:00:00.000Z"), "2026-11-18");
  assert.equal(nextTaskDueDate("2026-11-17", "weekly", "2026-11-17T12:00:00.000Z"), "2026-11-24");
});

test("monthly recurrence clamps to the last day of shorter months", () => {
  assert.equal(nextTaskDueDate("2026-01-31", "monthly", "2026-01-31T12:00:00.000Z"), "2026-02-28");
  assert.equal(nextTaskDueDate("2024-01-31", "monthly", "2024-01-31T12:00:00.000Z"), "2024-02-29");
});

test("recurring tasks without due dates use the completion date", () => {
  assert.equal(nextTaskDueDate(undefined, "daily", "2026-11-17T12:00:00.000Z"), "2026-11-18");
  assert.equal(nextTaskDueDate("2026-11-17", "none", "2026-11-17T12:00:00.000Z"), undefined);
});