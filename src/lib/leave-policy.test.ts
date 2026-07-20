import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAllocatedDays } from "./leave-policy";
import type { HrStore } from "./store/types";

function miniStore(overrides: Partial<HrStore> = {}): HrStore {
  return {
    employees: [],
    leaveCategories: [
      { id: "lv-cat-annual", name: "Annual leave", defaultDaysPerYear: 14, isActive: true, sortOrder: 1 },
    ],
    employeeLeaveAllocations: [
      {
        id: "lva-1",
        employeeEmail: "employee@kastros.co",
        categoryId: "lv-cat-annual",
        year: 2026,
        allocatedDays: 20,
      },
    ],
    leaveRequests: [],
  } as HrStore;
}

describe("getAllocatedDays", () => {
  it("returns employee override when present", () => {
    const store = miniStore();
    assert.equal(getAllocatedDays(store, "employee@kastros.co", "lv-cat-annual", 2026), 20);
  });

  it("falls back to category default when no override row exists", () => {
    const store = miniStore();
    store.employeeLeaveAllocations = [];
    assert.equal(getAllocatedDays(store, "employee@kastros.co", "lv-cat-annual", 2026), 14);
  });
});
