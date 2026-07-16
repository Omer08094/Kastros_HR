/** Expense claims module (sidebar, /expenses, server actions, manual modules). */
export function expensesEnabled(): boolean {
  return process.env.KASTROS_EXPENSES_ENABLED === "true";
}
