# Palheta Soft ERP (Ciclo 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Cycle 1 of Palheta Soft ERP, delivering local Docker-ready Supabase migrations (multi-tenant `public` schema with RLS, dynamic module/profile tree, and `parametros_web`) and a 100% responsive Next.js application strictly styled by `DESIGN.md` for Core ERP modules (Auth, Admin/Governance, Financial Dashboard, Multi-Point Cash Registers, Gateway-Ready PDV, Fixed/Variable Expenses, Products, and Parameterized CLT/Non-CLT Employees).

**Architecture:** Modular monolith in Next.js (App Router + TypeScript) backed by Supabase PostgreSQL. All visual primitives live in a single reusable UI library (`src/components/ui`) mapped 1:1 to `DESIGN.md`, while financial/inventory mutations, recursive RBAC menu resolution, and CLT monthly obligation generation execute inside atomic PostgreSQL RPC functions protected by Row Level Security.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-17-palheta-soft-erp-design.md` and `DESIGN.md`

## Global Constraints

- **Single Design Source (`DESIGN.md`):** Every color, font (`Inter` with `lnum`/`locl` and explicit negative letter-spacing on headings), radius (`4px` inputs, `8px` utility buttons, `12px` cards, `16px` modals, `9999px` primary CTAs), shadow, and spacing token comes exclusively from `DESIGN.md`. Canvas is `#f6f5f4`, surfaces are `#ffffff`, structural action is `#0075de` (`#005bab` active), hairline is `#e6e6e6`, and sticker colors are decorative only.
- **Reusable Component Mandate (`src/components/ui`):** Cards, inputs, selects, accordions, modals, alerts, badges, help hints, tables, and buttons must be created in `src/components/ui` and exported globally. Feature modules must import from `@/components/ui` and never create ad-hoc styled `<button>` or `<input>` elements unless strictly necessary and designed for reuse.
- **100% Responsive & Touch-Ready:** Every screen must work cleanly across Mobile (`<= 600px`), Tablet (`768px-840px`), and Desktop (`1080px+`), preserving minimum `44x44px` touch targets on interactive mobile controls and stacking tables into cards on mobile.
- **Contextual Help (`?`) Without Dashes:** Every module displays a clean `?` help icon (`HelpHint`) in its header reading `help_title` and `help_text` from `system_modules`, plus selective `HelpHint` icons on strategic financial/operational cards (not on every card). User-facing help texts and UI copy must NEVER contain em-dashes (`—`) or en-dashes (`–`); write natural sentences with commas, colons, and periods.
- **Global Parameterization (`parametros_web`):** Table `public.parametros_web` (`chave_parametro`, `valor_parametro` as large `TEXT` storing JSON or extended text, with optional `establishment_id` override) stores all CLT tax brackets, FGTS, 13th, Vacation + 1/3, VT cap, employer rates, and due days. Zero tax rates or brackets may be hardcoded in TypeScript or SQL calculation bodies.
- **Session-Cached Sidebar & Super-Admin Access:** Navigation tree is resolved at login via `resolve_user_navigation` and cached in the session until logout/re-login (except when Super-Admin switches active tenant via the Support Switcher). Super-Admin has unrestricted access to all modules and tenants.

## Review Focus

1. **Split payment cent mismatch in PDV:** When paying a R$ 100,00 sale across multiple methods (e.g., PIX + Cash) with a discount, if `sum(payments.gross_amount) !== sale.gross_amount`, the sale must reject atomically before writing items, stock changes, or cash movements (tested in Task 3 & Task 8).
2. **Parent-child inheritance & multi-profile deduplication in Sidebar:** A user holding two profiles (one granting parent module `erp.financeiro`, another granting child module `erp.pdv` under `erp.operacao`) must get all active children of `erp.financeiro`, `erp.operacao` as a parent group containing only `erp.pdv` (not sibling `erp.estoque`), and zero duplicate menu items (tested in Task 2 & Task 5).
3. **Em-dashes or en-dashes leaking into module/card help copy:** Seeded `system_modules.help_text`, `HelpHint` popovers, and admin module validation must reject or strip `—` and `–` so user explanations read naturally (tested in Task 2 & Task 4).
4. **Progressive CLT INSS calculation & missing/overridden `parametros_web`:** Progressive INSS brackets apply marginally per salary band rather than flatly on full gross salary, and tenant-level `parametros_web` overrides must take precedence over global (`establishment_id IS NULL`) rows without hardcoded tax numbers (tested in Task 9).
5. **Cash drawer expected balance polluted by PIX/Card or Realized Profit polluted by CLT provisions:** Physical drawer reconciliation (`closing_cash_expected`) must sum only `'cash'` movements, and Dashboard `realized_net_profit` must exclude `is_provision = true` expenses so 13th/Vacation accounting reserves never double-deduct cash (tested in Task 3, Task 7 & Task 9).

---

## File Structure Map

```text
palhetasoft/
├── DESIGN.md
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20261117000001_platform_rbac_and_params.sql
│   │   └── 20261117000002_erp_core_and_rpcs.sql
│   └── seed.sql
├── src/
│   ├── styles/
│   │   └── tokens.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── help-hint.tsx
│   │   │   ├── page-header.tsx
│   │   │   ├── responsive-data-table.tsx
│   │   │   └── index.ts
│   │   └── layout/
│   │       ├── app-shell.tsx
│   │       ├── sidebar-nav.tsx
│   │       ├── mobile-nav.tsx
│   │       └── tenant-switcher.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   ├── admin.ts
│   │   │   └── middleware.ts
│   │   ├── copy-guard.ts
│   │   └── formatters.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── types.ts
│   │   │   ├── navigation-tree.ts
│   │   │   ├── session-nav.ts
│   │   │   └── actions.ts
│   │   ├── parametros/
│   │   │   ├── types.ts
│   │   │   └── service.ts
│   │   ├── admin/
│   │   │   └── actions.ts
│   │   ├── dashboard/
│   │   │   ├── calculations.ts
│   │   │   └── queries.ts
│   │   ├── expenses/
│   │   │   └── actions.ts
│   │   ├── products/
│   │   │   └── actions.ts
│   │   ├── cash-register/
│   │   │   ├── reconciliation.ts
│   │   │   └── actions.ts
│   │   ├── pdv/
│   │   │   ├── payment-processor.ts
│   │   │   └── actions.ts
│   │   └── employees/
│   │       ├── clt-calculator.ts
│   │       └── actions.ts
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── login/page.tsx
│       └── (erp)/
│           ├── layout.tsx
│           ├── dashboard/page.tsx
│           ├── pdv/page.tsx
│           ├── caixa/page.tsx
│           ├── despesas/page.tsx
│           ├── funcionarios/page.tsx
│           ├── produtos/page.tsx
│           └── admin/page.tsx
└── tests/
    ├── design-tokens.test.ts
    ├── migrations-and-seed.test.ts
    ├── ui-components.test.tsx
    ├── navigation-tree.test.ts
    ├── dashboard-and-cash.test.ts
    ├── pdv-payments.test.ts
    ├── clt-calculator.test.ts
    └── architecture-guard.test.ts
```

---

### Task 1: Project Scaffolding, `DESIGN.md` Tokens & Test Harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `src/styles/tokens.css`, `src/app/layout.tsx`, `src/lib/formatters.ts`, `src/lib/copy-guard.ts`
- Test: `tests/design-tokens.test.ts`

**Interfaces:**
- Produces:
  - CSS variables in `src/styles/tokens.css` matching every color, radius, spacing, typography, and shadow token in `DESIGN.md`
  - `validateUserFacingCopy(text: string): { valid: boolean; reason?: string }` in `src/lib/copy-guard.ts` (rejects strings containing `—` `\u2014` or `–` `\u2013`)
  - `formatBRL(value: number): string` and `roundCents(value: number): number` in `src/lib/formatters.ts`

- [ ] **Step 1: Initialize Next.js + TypeScript + Tailwind + Vitest config files and write the failing token & copy-guard tests**

Create `package.json` (Next.js, React, `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`, Tailwind, `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`), install packages, and write `tests/design-tokens.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateUserFacingCopy } from '@/lib/copy-guard';
import { formatBRL, roundCents } from '@/lib/formatters';

describe('DESIGN.md token fidelity & copy guard', () => {
  it('defines exact brand, surface, ink, hairline and sticker variables from DESIGN.md', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
    expect(css).toContain('--color-primary: #0075de;');
    expect(css).toContain('--color-primary-active: #005bab;');
    expect(css).toContain('--color-secondary: #213183;');
    expect(css).toContain('--color-canvas-soft: #f6f5f4;');
    expect(css).toContain('--color-surface: #ffffff;');
    expect(css).toContain('--color-hairline: #e6e6e6;');
    expect(css).toContain('--radius-xs: 4px;');
    expect(css).toContain('--radius-md: 8px;');
    expect(css).toContain('--radius-lg: 12px;');
    expect(css).toContain('--radius-xl: 16px;');
  });

  it('rejects em-dashes and en-dashes in user-facing copy', () => {
    expect(validateUserFacingCopy('Gerencie suas vendas e acompanhe o caixa do dia.').valid).toBe(true);
    expect(validateUserFacingCopy('Caixa — abertura e fechamento').valid).toBe(false);
    expect(validateUserFacingCopy('Período 01–30').valid).toBe(false);
  });

  it('formats BRL currency and rounds cents deterministically', () => {
    expect(roundCents(10.555)).toBe(10.56);
    expect(formatBRL(1234.5)).toMatch(/1\.234,50/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/design-tokens.test.ts`
Expected: FAIL with missing modules `@/lib/copy-guard`, `@/lib/formatters`, and `src/styles/tokens.css`.

- [ ] **Step 3: Implement `src/styles/tokens.css`, `src/lib/copy-guard.ts`, `src/lib/formatters.ts`, and `src/app/layout.tsx`**

Map every `colors`, `typography` (including negative `letter-spacing` utility classes `.typo-display-1` through `.typo-eyebrow` and `font-feature-settings: "lnum" 1, "locl" 1`), `rounded`, `spacing`, and Level-1/Level-2 layered shadows from `DESIGN.md` into `src/styles/tokens.css`. Load `Inter` via `next/font/google` in `src/app/layout.tsx` with `bg-[var(--color-canvas-soft)] text-[var(--color-ink)]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/design-tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js app, DESIGN.md tokens, and test harness"
```

---

### Task 2: Supabase Config & Migration 001 (Multi-Tenant Core, `parametros_web`, Help-Enabled Modules & RBAC)

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20261117000001_platform_rbac_and_params.sql`
- Create: `src/modules/auth/types.ts`, `src/modules/auth/navigation-tree.ts`
- Test: `tests/navigation-tree.test.ts`

**Interfaces:**
- Produces:
  - SQL tables: `establishments`, `app_users`, `system_modules` (with `help_title`, `help_text`, constraint forbidding `—`/`–`), `parametros_web` (`id`, `establishment_id` nullable, `chave_parametro`, `valor_parametro` `TEXT`, `descricao`, `updated_at`), `establishment_modules`, `access_profiles`, `profile_modules`, `user_profiles`
  - SQL functions: `public.is_super_admin()`, `public.can_access_establishment(target_establishment_id uuid)`, `public.get_parametro_web(p_chave text, p_establishment_id uuid)`, `public.resolve_user_navigation(p_user_id uuid, p_active_establishment_id uuid)`
  - TypeScript mirror & tree builder `buildNavigationTree(modules: SystemModuleRow[], grantedModuleIds: string[], enabledModuleIds: string[], isSuperAdmin: boolean): NavigationNode[]` in `src/modules/auth/navigation-tree.ts`

- [ ] **Step 1: Write failing tests for parent/child inheritance, multi-profile deduplication, Super-Admin full access, and Migration 001 SQL invariants**

Write `tests/navigation-tree.test.ts` asserting:
1. Assigning a parent module (`erp.financeiro`) automatically grants all its active children enabled for the establishment.
2. Assigning only a child module (`erp.pdv` under `erp.operacao`) includes `erp.operacao` as a parent group node and `erp.pdv` as child, while excluding sibling `erp.caixa` if ungranted.
3. Combining two profiles with overlapping modules produces zero duplicate nodes and preserves `sort_order`.
4. `isSuperAdmin = true` unlocks all active `super_admin` and tenant modules.
5. `20261117000001_platform_rbac_and_params.sql` defines `CREATE TABLE public.parametros_web` with `chave_parametro text NOT NULL` and `valor_parametro text NOT NULL`, `help_text` check constraint `CHECK (help_text !~ '[—–]')`, RLS enabled on every table, and `resolve_user_navigation`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/navigation-tree.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `supabase/config.toml`, `20261117000001_platform_rbac_and_params.sql`, `src/modules/auth/types.ts`, and `src/modules/auth/navigation-tree.ts`**

Ensure `parametros_web` has unique index `CREATE UNIQUE INDEX parametros_web_scope_key_idx ON public.parametros_web (COALESCE(establishment_id, '00000000-0000-0000-0000-000000000000'::uuid), chave_parametro)` and `get_parametro_web` returns the establishment-specific `valor_parametro` if present, falling back to `establishment_id IS NULL`. Ensure `system_modules` checks `help_title !~ '[—–]' AND help_text !~ '[—–]'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/navigation-tree.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml supabase/migrations/20261117000001_platform_rbac_and_params.sql src/modules/auth/ tests/navigation-tree.test.ts
git commit -m "feat(db): add multi-tenant RBAC, help-enabled modules, and parametros_web migration"
```

---

### Task 3: Migration 002 (Frente 1 ERP Tables, Transactional RPCs & Local Docker Seed)

**Files:**
- Create: `supabase/migrations/20261117000002_erp_core_and_rpcs.sql`
- Create: `supabase/seed.sql`
- Test: `tests/migrations-and-seed.test.ts`

**Interfaces:**
- Consumes: `establishments`, `app_users`, `parametros_web`, `can_access_establishment` from Task 2
- Produces:
  - SQL tables: `financial_categories`, `payment_method_configs`, `register_points`, `cash_registers` (partial unique index `WHERE status = 'open'` on `register_point_id`), `products`, `sales`, `sale_items`, `sale_payments`, `employees`, `expenses` (with `is_provision`, `competence_month`, `obligation_code`), `cash_movements`
  - SQL RPCs: `complete_pdv_sale`, `cancel_pdv_sale`, `close_cash_register`, `generate_clt_monthly_obligations`, `get_financial_dashboard`
  - Complete `supabase/seed.sql` seeding `parametros_web` (`clt_tributos_vigentes`), Super-Admin, Balneário Águas Claras, modules with dash-free Portuguese help explanations, register points (`Caixa Bar`, `Caixa Restaurante`), profiles, and sample products/categories

- [ ] **Step 1: Write failing tests inspecting Migration 002 RPC contracts and verifying zero dashes in `seed.sql` help texts and valid JSON in `parametros_web` seed**

Write `tests/migrations-and-seed.test.ts` verifying:
1. All 11 ERP tables exist with `ENABLE ROW LEVEL SECURITY` in `20261117000002_erp_core_and_rpcs.sql`.
2. `complete_pdv_sale` validates `sum(payments) = gross_amount` (raising exception on cent mismatch), supports `'customer_credit'` enum value reserved for Cycle 2, deducts `stock_quantity` when `track_stock = true`, and logs `cash_movements`.
3. `close_cash_register` computes `closing_cash_expected` strictly from `'cash'` movements (`opening`, `sale_inflow`, `supply_inflow`, minus `bleed_outflow`, `expense_outflow`, `sale_reversal_outflow`).
4. `get_financial_dashboard` separates `is_provision = false` (Realized & Pending Cash) from `is_provision = true` (CLT Accounting Reserves).
5. Every `help_title` and `help_text` inserted in `supabase/seed.sql` passes `validateUserFacingCopy` (zero `—` or `–`) and the seeded `clt_tributos_vigentes` `valor_parametro` parses as valid JSON containing INSS brackets, IRRF brackets, FGTS rate, 13th/Vacation fractions, VT cap, and due days.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/migrations-and-seed.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `20261117000002_erp_core_and_rpcs.sql` and `supabase/seed.sql`**

Write clean, idempotent PostgreSQL DDL, RLS policies using `public.can_access_establishment(establishment_id)`, atomic PL/pgSQL RPCs, and comprehensive local Docker seed data (including `auth.users` + `auth.identities` entries with `crypt('palheta123', gen_salt('bf'))` for `superadmin@palhetasoft.com`, `admin@aguasclaras.com`, and `caixa@aguasclaras.com`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/migrations-and-seed.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261117000002_erp_core_and_rpcs.sql supabase/seed.sql tests/migrations-and-seed.test.ts
git commit -m "feat(db): add Frente 1 ERP tables, transactional RPCs, and local Docker seed"
```

---

### Task 4: Centralized Reusable UI Kit (`src/components/ui/`) & `HelpHint`

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/modal.tsx`, `src/components/ui/alert.tsx`, `src/components/ui/accordion.tsx`, `src/components/ui/help-hint.tsx`, `src/components/ui/page-header.tsx`, `src/components/ui/responsive-data-table.tsx`, `src/components/ui/index.ts`
- Test: `tests/ui-components.test.tsx`

**Interfaces:**
- Consumes: `tokens.css` and `validateUserFacingCopy` from Task 1
- Produces: Barrel export `@/components/ui` providing:
  - `Button` (`variant?: 'primary' | 'secondary' | 'utility' | 'icon-circular' | 'danger-utility'`)
  - `Card` (`variant?: 'flat' | 'elevated' | 'soft' | 'featured-night'`, optional `helpTitle?: string`, `helpText?: string`)
  - `Input`, `Select`, `Textarea`
  - `Badge` (`sticker?: 'sky' | 'purple' | 'pink' | 'orange' | 'teal' | 'green' | 'brown' | 'primary'`)
  - `Modal`
  - `Alert`
  - `Accordion`
  - `HelpHint` (`title: string`, `description: string` — circular `?` icon button using `CircleHelp` from `lucide-react`, normalizing any accidental `—`/`–` and toggling an accessible popover/sheet)
  - `PageHeader` (`title: string`, `subtitle?: string`, `helpTitle: string`, `helpText: string`, `actions?: ReactNode`)
  - `ResponsiveDataTable<T>` (renders desktop table with `ex-data-table-cell` tokens and mobile stacked `Card` list)

- [ ] **Step 1: Write failing component tests in `tests/ui-components.test.tsx`**

Test:
1. `Button` `primary` applies pill radius (`rounded-full`) and `#0075de` token, while `utility` applies `rounded-[8px]`, and both meet `min-h-[44px]` touch sizing.
2. `Input` applies `rounded-[4px]` (`--radius-xs`) and label association.
3. `HelpHint` and `PageHeader` render the `?` button (`aria-label` accessible), open the explanation popover on click, and never display `—` or `–` in rendered text.
4. `Card` renders optional `HelpHint` only when `helpText` is passed.
5. `ResponsiveDataTable` renders column headers and mobile card representations for each row.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui-components.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement all reusable primitives in `src/components/ui/` and export from `src/components/ui/index.ts`**

Follow `DESIGN.md` strictly: zero heavy drop-shadows, sticker colors restricted to `Badge` dots / `Alert` icons / decorative accents, and clean mobile-first responsive classes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui-components.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ tests/ui-components.test.tsx
git commit -m "feat(ui): create centralized DESIGN.md component library and HelpHint"
```

---

### Task 5: Supabase Clients, Auth Login, Session Sidebar Cache & Responsive `AppShell`

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`
- Create: `src/modules/auth/session-nav.ts`, `src/modules/auth/actions.ts`
- Create: `src/components/layout/sidebar-nav.tsx`, `src/components/layout/mobile-nav.tsx`, `src/components/layout/tenant-switcher.tsx`, `src/components/layout/app-shell.tsx`
- Create: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/(erp)/layout.tsx`
- Test: `tests/session-nav.test.ts`

**Interfaces:**
- Consumes: `@/components/ui` (Task 4), `NavigationNode` & `resolve_user_navigation` (Task 2)
- Produces:
  - `serializeNavigationSession(payload: SessionNavSnapshot): string` & `parseNavigationSession(raw?: string): SessionNavSnapshot | null` in `src/modules/auth/session-nav.ts`
  - `signInAction`, `signOutAction`, `switchSuperAdminTenantAction` in `src/modules/auth/actions.ts`
  - `getCurrentErpContext()` server helper returning `{ user, activeEstablishmentId, isSuperAdmin, navigation, currentModuleHelp }`

- [ ] **Step 1: Write failing unit tests in `tests/session-nav.test.ts`**

Verify:
1. `SessionNavSnapshot` serializes/deserializes cleanly, resolves `findModuleHelpByPath(tree, '/despesas')` returning `{ helpTitle, helpText }` for the module header `?` icon, and checks `isRouteAllowed(snapshot, pathname)` (always `true` for `isSuperAdmin`, matched by prefix for regular users).
2. Modifying permissions in DB does not mutate an existing serialized session snapshot until `signOutAction` + `signInAction` (or `switchSuperAdminTenantAction` for Super-Admin).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/session-nav.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Supabase SSR clients, middleware, login screen, session snapshot cache, and responsive `AppShell`**

Build `/login` using `Card` (`ex-auth-form-card`), `Input`, `Button`, and `Alert` on `#f6f5f4` canvas (closed onboarding: no public sign-up link). Build `AppShell` with desktop sidebar (`ex-app-shell-row` active indicator `#0075de`, dynamic Lucide icon mapping, collapsible parent modules via `Accordion`), mobile top bar + drawer/bottom shortcuts (`<= 600px`), and `TenantSwitcher` visible when `isSuperAdmin = true`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/session-nav.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts src/modules/auth/ src/components/layout/ src/app/page.tsx src/app/login/ src/app/\(erp\)/layout.tsx tests/session-nav.test.ts
git commit -m "feat(auth): add closed login, session-cached dynamic sidebar, and Super-Admin switcher"
```

---

### Task 6: Super-Admin & Governance Module (`/admin` & `parametros_web` Manager)

**Files:**
- Create: `src/modules/parametros/types.ts`, `src/modules/parametros/service.ts`
- Create: `src/modules/admin/actions.ts`
- Create: `src/app/(erp)/admin/page.tsx`, `src/app/(erp)/admin/admin-client.tsx`
- Test: `tests/parametros-service.test.ts`

**Interfaces:**
- Consumes: `@/components/ui` (Task 4), `validateUserFacingCopy` (Task 1), `supabase/admin.ts` (Task 5)
- Produces:
  - `resolveParametroValue<T>(rows: ParametroWebRow[], chave: string, establishmentId?: string | null): T | null` in `src/modules/parametros/service.ts`
  - Server actions in `src/modules/admin/actions.ts`: `upsertEstablishmentAction`, `upsertSystemModuleAction` (enforcing `validateUserFacingCopy` on `help_title` and `help_text`), `upsertAccessProfileAction`, `createClosedUserAction` (using `auth.admin.createUser`), and `upsertParametroWebAction`

- [ ] **Step 1: Write failing tests in `tests/parametros-service.test.ts`**

Test:
1. `resolveParametroValue` returns tenant-specific `valor_parametro` JSON when `establishment_id` matches, and falls back to the global row (`establishment_id = null`) otherwise.
2. `validateModulePayload` rejects module `help_title` or `help_text` containing `—` or `–` with a clear Portuguese validation message.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/parametros-service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `parametros` service, `/admin` server actions, and responsive `/admin` UI**

Include `PageHeader` with `?` help icon and four organized sections using `@/components/ui`: Empresas e Módulos Contratados, Árvore de Menus e Textos de Ajuda (`?`), Perfis e Usuários, and Parâmetros Globais (`parametros_web`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/parametros-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/parametros/ src/modules/admin/ src/app/\(erp\)/admin/ tests/parametros-service.test.ts
git commit -m "feat(admin): add Super-Admin panel for tenants, module tree help, profiles, and parametros_web"
```

---

### Task 7: Dual Financial Dashboard (`/dashboard`) & Expenses Module (`/despesas`)

**Files:**
- Create: `src/modules/dashboard/calculations.ts`, `src/modules/dashboard/queries.ts`
- Create: `src/modules/expenses/actions.ts`
- Create: `src/app/(erp)/dashboard/page.tsx`, `src/app/(erp)/despesas/page.tsx`, `src/app/(erp)/despesas/expenses-client.tsx`
- Test: `tests/dashboard-and-cash.test.ts`

**Interfaces:**
- Consumes: `@/components/ui` (Task 4), `get_financial_dashboard` RPC (Task 3)
- Produces:
  - `computeFinancialSummary(sales: SaleSummaryInput[], expenses: ExpenseSummaryInput[]): FinancialSummaryOutput` in `src/modules/dashboard/calculations.ts`
  - `createExpenseAction`, `markExpensePaidAction`, `cancelExpenseAction` in `src/modules/expenses/actions.ts`

- [ ] **Step 1: Write failing tests in `tests/dashboard-and-cash.test.ts` for Dual Financial View**

Assert:
1. `grossRevenue` sums completed sales, `netRevenueAfterFees` subtracts `total_fee_amount`.
2. `realizedNetProfit` subtracts ONLY `paid` expenses where `is_provision = false` (Fixed + Variable).
3. `projectedNetProfit` additionally subtracts `pending` expenses where `is_provision = false`.
4. `accountingProvisionTotal` sums `is_provision = true` rows separately without reducing `realizedNetProfit`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dashboard-and-cash.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `calculations.ts`, `/dashboard`, and `/despesas`**

Render `/dashboard` with period selector, `PageHeader` (`?`), and selective `Card` `HelpHint`s on **Líquido Realizado**, **Líquido Previsto**, and **Reserva Contábil CLT** (leaving simpler KPI cards clean without `?` icons, as requested). Build `/despesas` with filters (Fixas, Variáveis, Provisões, Pendentes, Pagas), modal creation, and option to pay cash expenses directly from an open cash register point.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dashboard-and-cash.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/dashboard/ src/modules/expenses/ src/app/\(erp\)/dashboard/ src/app/\(erp\)/despesas/ tests/dashboard-and-cash.test.ts
git commit -m "feat(finance): implement dual financial dashboard and fixed/variable expenses module"
```

---

### Task 8: Products (`/produtos`), Multi-Point Cash Registers (`/caixa`) & Gateway-Ready PDV (`/pdv`)

**Files:**
- Create: `src/modules/products/actions.ts`
- Create: `src/modules/cash-register/reconciliation.ts`, `src/modules/cash-register/actions.ts`
- Create: `src/modules/pdv/payment-processor.ts`, `src/modules/pdv/actions.ts`
- Create: `src/app/(erp)/produtos/page.tsx`, `src/app/(erp)/produtos/products-client.tsx`
- Create: `src/app/(erp)/caixa/page.tsx`, `src/app/(erp)/caixa/caixa-client.tsx`
- Create: `src/app/(erp)/pdv/page.tsx`, `src/app/(erp)/pdv/pdv-client.tsx`
- Test: `tests/pdv-payments.test.ts`

**Interfaces:**
- Consumes: `@/components/ui` (Task 4), `complete_pdv_sale`, `cancel_pdv_sale`, `close_cash_register` RPCs (Task 3)
- Produces:
  - `calculateDrawerExpectedCash(openingBalance: number, movements: CashMovementInput[]): DrawerReconciliationResult` in `src/modules/cash-register/reconciliation.ts`
  - `PaymentProcessor` interface, `ManualPosProcessor`, and `prepareSplitSalePayload(cartItems, discount, paymentSplits, methodConfigs)` in `src/modules/pdv/payment-processor.ts`

- [ ] **Step 1: Write failing tests in `tests/pdv-payments.test.ts`**

Test:
1. `prepareSplitSalePayload` computes subtotal, discount, per-split gateway/card fees (`fee_percent` + `fixed_fee_amount`), and rejects with an explicit error if split amounts differ from `grossAmount` by even `R$ 0,01`.
2. `ManualPosProcessor` sets `settlement_mode = 'manual_pos'` and `status = 'approved'`, while preserving `PaymentProcessor` contract (`external_transaction_id`, `external_qr_code`, `external_payload`) for future gateway/SmartPOS adapters and `'customer_credit'` hook.
3. `calculateDrawerExpectedCash` ignores `'pix'`, `'debit_card'`, and `'credit_card'` inflows when calculating physical drawer expected cash, placing non-cash totals in `nonCashBreakdown`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pdv-payments.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Products, Multi-Point Cash Registers, and Responsive PDV**

Build `/produtos` (CRUD + stock alert badge), `/caixa` (manage register points like `"Caixa Bar"` and `"Caixa Restaurante"`, open/supply/bleed/close with physical cash drawer `HelpHint` card), and `/pdv` (register selector, category/search filter, stock warning badge without blocking sales when `allow_negative_stock = true`, split payment builder, desktop side cart + mobile fixed bottom bar opening `Modal` bottom sheet, and sale cancellation button for authorized profiles).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pdv-payments.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/products/ src/modules/cash-register/ src/modules/pdv/ src/app/\(erp\)/produtos/ src/app/\(erp\)/caixa/ src/app/\(erp\)/pdv/ tests/pdv-payments.test.ts
git commit -m "feat(operations): add products, multi-point cash registers, and gateway-ready split PDV"
```

---

### Task 9: Employees Module (`/funcionarios`) & Parameterized CLT Accounting Engine

**Files:**
- Create: `src/modules/employees/clt-calculator.ts`, `src/modules/employees/actions.ts`
- Create: `src/app/(erp)/funcionarios/page.tsx`, `src/app/(erp)/funcionarios/employees-client.tsx`
- Test: `tests/clt-calculator.test.ts`

**Interfaces:**
- Consumes: `resolveParametroValue` (Task 6), `@/components/ui` (Task 4), `generate_clt_monthly_obligations` RPC (Task 3)
- Produces:
  - `CltTaxParameters` type (parsed exclusively from `parametros_web` key `'clt_tributos_vigentes'`)
  - `calculateCltAccountingBreakdown(employee: CltEmployeeInput, taxRegime: string, params: CltTaxParameters): CltBreakdownResult` in `src/modules/employees/clt-calculator.ts`

- [ ] **Step 1: Write failing tests in `tests/clt-calculator.test.ts`**

Test:
1. Progressive employee INSS deduction calculates slice-by-slice across brackets supplied in `params` (never hardcoded constants), and changing `params.fgtsRate` or `params.vtEmployeeCapPercent` dynamically changes the output.
2. Under `simples_nacional`, employer INSS defaults to the parameterized Simples rate (`0%`), whereas under `lucro_presumido` it applies the parameterized employer INSS + RAT rates.
3. Outputs separate monthly cash obligations (`netSalary`, `fgtsMonthly`, `inssGuideTotal`, `employerBenefitsCost`) from monthly accounting reserves (`provision13thTotal`, `provisionVacationTotal` with 1/3 constitutional bonus + proportional charges).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/clt-calculator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `clt-calculator.ts`, employee actions, and `/funcionarios` UI**

In `/funcionarios`, when creating/viewing a `CLT` employee, render the live **Guia Contábil CLT** `Card` + `Accordion` (with a helpful dash-free `HelpHint` explaining difference between monthly guides and 13th/Vacation reserves) powered by `parametros_web` (`clt_tributos_vigentes`), plus the button to generate the separated monthly Fixed Expenses and Accounting Reserves for competence `YYYY-MM`. For `Não-CLT` (diaristas/freelancers), provide a quick action to launch worked days as a Variable Expense (optionally paid from an open cash register).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/clt-calculator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/employees/ src/app/\(erp\)/funcionarios/ tests/clt-calculator.test.ts
git commit -m "feat(hr): implement parameterized CLT accounting calculator and CLT/Non-CLT employees module"
```

---

### Task 10: Architectural Guard Tests, Local Docker Guide & Production Build Verification

**Files:**
- Create: `tests/architecture-guard.test.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: All modules and migrations from Tasks 1-9
- Produces: Automated architectural compliance suite + local Docker setup guide

- [ ] **Step 1: Write `tests/architecture-guard.test.ts` verifying global project rules**

Assert across all files in `src/app/` and `src/modules/`:
1. Zero raw `<button` or `<input` HTML tags exist outside `src/components/ui/` (enforcing global component reuse).
2. Every ERP route page (`dashboard`, `pdv`, `caixa`, `despesas`, `funcionarios`, `produtos`, `admin`) renders `PageHeader` (guaranteeing the module `?` help icon on every screen).
3. Zero user-facing strings in `supabase/seed.sql` or `helpText`/`helpTitle` props contain `—` or `–`.
4. `src/modules/employees/clt-calculator.ts` contains no hardcoded INSS bracket thresholds, reading everything from the `params` argument.

- [ ] **Step 2: Run full Vitest suite and fix any violations**

Run: `npx vitest run`
Expected: All test files PASS

- [ ] **Step 3: Write `README.md` with step-by-step Local Supabase Docker + Next.js instructions and run `npm run build`**

Document `npx supabase start`, `npx supabase db reset` (applying `migrations/` + `seed.sql`), test credentials (`superadmin@palhetasoft.com`, `admin@aguasclaras.com`, `caixa@aguasclaras.com`), and `npm run dev`. Run `npm run build` to prove full TypeScript and Next.js App Router compilation.

- [ ] **Step 4: Verify clean build output**

Run: `npm run build`
Expected: Exit code 0 with all routes compiled cleanly.

- [ ] **Step 5: Commit**

```bash
git add tests/architecture-guard.test.ts README.md
git commit -m "test: add architectural guardrails and local Docker documentation"
```
