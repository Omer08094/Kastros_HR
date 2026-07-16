# Hidden features (feature flags)

This document records features that are **implemented but hidden** from the live UI. Code and data are kept so they can be re-enabled without a redeploy of old logic.

---

## Expense claims (hidden as of July 2026)

**Decision:** Expense claims are hidden from employees and HR while the module is not in use for go-live. Implementation remains in the codebase.

### What is hidden when disabled

| Area | Behavior |
|------|----------|
| Sidebar | **Expense claims** link removed |
| `/expenses` | Redirects to `/dashboard` |
| Server actions | `submitExpense`, `decideExpense`, `markExpensePaid`, `deleteExpense` return an error |
| How-to manual | Module 5 (employee) and Module 15 (HR) removed from the public guide |

### What is NOT removed

| Area | Behavior |
|------|----------|
| Firestore | `expenses[]` array in `kastros-hr/store` — **unchanged**, existing claims preserved |
| Firebase Storage | Receipt files under `uploads/{uuid}` — **unchanged** |
| `/api/hr-file/{ref}` | Still serves expense receipt files if someone has a direct link |
| Source code | [`src/app/(hr)/expenses/`](../src/app/(hr)/expenses/), [`ExpensesClient`](../src/components/hr/ExpensesClient.tsx), [`hr-actions-extra.ts`](../src/lib/store/hr-actions-extra.ts) |

**No database migration is required** to hide or re-enable this feature.

### Environment variable

```env
# Set to true to show Expense claims in the app and manual.
KASTROS_EXPENSES_ENABLED=false
```

- **`true`** — feature visible (sidebar, page, actions, manual modules)
- **`false` or unset** — feature hidden (default after this change)

### Re-enable on Vercel

1. Vercel → Project → **Settings** → **Environment Variables**
2. Set `KASTROS_EXPENSES_ENABLED` = `true` for **Production** (and Preview if needed)
3. **Redeploy** the latest deployment

### Local development

Add to `.env.local`:

```env
KASTROS_EXPENSES_ENABLED=true
```

Restart `npm run dev` after changing env vars.

### Implementation reference

- Feature flag: [`src/lib/feature-flags.ts`](../src/lib/feature-flags.ts)
- Nav filter: [`src/lib/route-access.ts`](../src/lib/route-access.ts)
- Manual filter: [`src/lib/help/manual-content.ts`](../src/lib/help/manual-content.ts)

---

## Adding future hidden features

Follow the same pattern:

1. Add a helper in `src/lib/feature-flags.ts`
2. Gate nav (`route-access.ts`), page redirect, and server actions
3. Document here with date, env var name, and re-enable steps
