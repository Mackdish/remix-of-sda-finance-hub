
This is a large system. I'll build it in phases so you can review progress and give feedback along the way, rather than shipping everything blind in one giant pass.

## Design direction
- SDA-inspired theme: dark green primary, white surfaces, light gray backgrounds, subtle gold accents
- Clean professional dashboard aimed at low-tech users: large touch targets, clear labels, minimal jargon
- Responsive (desktop / tablet / mobile), print-friendly A4 landscape report styles
- Dark mode support

## Tech
- TanStack Start + React + TypeScript + Tailwind v4 (already scaffolded)
- Lovable Cloud (Supabase) for DB, auth, storage, RLS
- Roles table (`admin`, `treasurer`, `auditor`) with security-definer `has_role`
- Recharts for analytics, jsPDF + xlsx for exports

## Phase 1 — Foundation (this turn)
1. Enable Lovable Cloud
2. SDA design system in `src/styles.css` (dark green / gold tokens, print styles)
3. Auth: email/password + Google, `/auth` page, `_authenticated` gate
4. Database schema + RLS:
   - `churches`, `church_profiles`, `districts`, `conferences`
   - `profiles`, `user_roles` (enum: admin, treasurer, auditor), `church_members`
   - `offering_categories` (with fund_type: trust/local, conf_split %)
   - `receipts`, `receipt_lines`
   - `expenses`, `expense_categories`
   - `cash_statements`, `weekly_reports`, `remittances`
   - `financial_years` (with lock flag), `audit_log`
   - Seed default SDA offering categories with correct splits (tithe 100% conf, combined 50/50, camp meeting 100% conf, thanksgiving 50/50, firstfruit 50/50, etc.)
5. App shell: sidebar nav, topbar, dashboard route with KPI cards + charts (live from DB)
6. Landing/index redirects signed-in users to `/dashboard`, signed-out to `/auth`

## Phase 2 — Core transactions
- Receipts module (create, list, search, print) with sequential numbering
- Members module (CRUD + quick search)
- Expenses module
- Offering categories admin

## Phase 3 — Statements & reports
- Cash Statement form (mirrors SDA paper form) with auto-calc
- Weekly Cash Count (Weeks 1–5) auto-summary
- Monthly Cash Statement (opening/closing balances)
- Conference Remittance module
- Church Profile module
- Printable A4-landscape report templates

## Phase 4 — Polish & advanced
- PDF/Excel/CSV export on all reports
- Audit trail viewer, notifications, backups
- PWA/offline, M-Pesa import, QR receipts, bank reconciliation, dark mode toggle

## What ships in Phase 1 (this turn)
Working login, role-gated dashboard with real KPI cards driven by the schema, sidebar navigation to all module routes (module pages beyond dashboard will be "Coming soon" placeholders wired to real data next phase). This gives you a solid, secure foundation to review before I build out the modules.

Approve and I'll start with Phase 1.
