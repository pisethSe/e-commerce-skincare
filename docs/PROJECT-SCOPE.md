# Calesta / Lumière — Project Scope, Scope-Creep Control & WBS

| Field | Value |
| --- | --- |
| Document owner | Piseth |
| Version | 1.0 |
| Date | 2026-11-05 |
| Baseline commit | `d25dad6` — Harden auth refresh and complete storefront content flows |
| Status | Living document — update at the end of every work slice |
| Source of truth | This file for scope and sequencing; `README.md` for setup; CI for the quality gate |
| Detailed requirements | [`REQUIREMENTS.md`](./REQUIREMENTS.md) — functional and non-functional breakdown |
| Workflow reference | [`WORKFLOW-PARITY.md`](./WORKFLOW-PARITY.md) — weYOUNG comparison and conflict decisions |

---

## 1. Purpose and success definition

Calesta (formerly Lumière) is a Cambodia-focused skincare commerce platform made of three deployable parts:

1. **Storefront** — customer browsing, search, cart, checkout, payment, tracking, account, reviews, wishlist, journal.
2. **Admin** — catalog, inventory, orders, customers, analytics, reviews, journal, coupons, settings.
3. **API + database** — Express/TypeScript API, Prisma, PostgreSQL, auth, payments, email, uploads.

### 1.1 Product goal

Let a shopper in Cambodia discover a product, pay for it with a local payment method or cash on delivery, and track the order — without needing to contact support — while giving the store owner a calm, accurate operations console.

### 1.2 Launch success criteria

- A first-time shopper can complete: home → shop/search → product → cart → checkout → confirmation → tracking.
- Checkout accepts **Cambodia-only** addresses, exactly one shipping method, and **COD, ABA PayWay, Bakong, or card**.
- An admin can manage products, stock, orders, customers, reviews, journal posts, and coupons without touching the database.
- Backend tests, frontend tests, TypeScript, production builds, and dependency audits pass.
- Production is deployed with real credentials, backups, monitoring, and a rollback path.
- No customer is forced to log in again because of a token-refresh race.

### 1.3 Non-goals for v1

This is a **single-brand, single-vendor, Cambodia-only** store. It is not a marketplace, a multi-country retailer, or a native mobile app.

---

## 2. Scope structure

Scope is split into four layers so a request can be classified before it becomes work.

```text
Calesta v1
├── Storefront
│   ├── Discovery: home, shop, search, product, journal
│   ├── Commerce: cart, checkout, address, shipping, payment, tracking
│   └── Account: orders, reviews, wishlist, preferences
├── Admin
│   ├── Catalog: products, inventory, uploads
│   ├── Operations: orders, customers, analytics, exports
│   └── Growth: reviews, journal, coupons, settings
├── API + data
│   ├── Auth, catalog, orders, payments, email, uploads
│   └── PostgreSQL schema, seed, migrations, cleanup
└── Operations
    ├── Tests, CI, security, documentation
    └── Deployment, monitoring, backups, post-launch support
```

### 2.1 Product scope — customer-facing

| Capability | Included in v1 | Current state |
| --- | --- | --- |
| Home, brand story, featured products, journal preview | Yes | ✅ Done |
| Shop with category, price, rating filters and sorting | Yes | ✅ Done |
| Typo-tolerant search, facets, typeahead | Yes | ✅ Done |
| Product detail, gallery, ingredients, reviews, related products | Yes | ✅ Done |
| Persistent cart | Yes | ✅ Done |
| Multi-step checkout with Cambodia address validation | Yes | ✅ Done |
| Phnom Penh / province choice, khan/province, house & street, phone | Yes | ✅ Done |
| One standard shipping method; free over $75 | Yes | ✅ Done |
| 10% VAT, USD totals, KHR display conversion | Yes | ✅ Done |
| Cash on delivery (default) | Yes | ✅ Done |
| ABA PayWay, Bakong KHQR, credit/debit card | Yes, credential-gated | 🟡 Demo mode until keys exist |
| Order confirmation and public tracking by order number + email | Yes | ✅ Done |
| Account profile, order history, spending stats, pagination | Yes | ✅ Done |
| Reviews with moderation and verified-purchase badges | Yes | ✅ Done |
| Wishlist persisted per device | Yes | ✅ Done |
| Newsletter subscribe + welcome email | Yes | ✅ Done (email demo without SMTP) |
| Journal listing and article detail | Yes | ✅ Done |
| Password reset, Google OAuth2 | Yes | 🟡 OAuth blocked on credentials |
| English / Khmer UI, USD / KHR display | Yes | ✅ Done |
| Legal pages (privacy, terms, shipping/returns) | Yes, launch-required | ⬜ Planned |

### 2.2 Platform scope — admin, API, data

| Capability | Included in v1 | Current state |
| --- | --- | --- |
| Admin login gate and role guard | Yes | ✅ Done |
| Dashboard KPIs, revenue chart, top products, recent orders | Yes | ✅ Done |
| Product CRUD, search, pagination, image upload | Yes | ✅ Done |
| Inventory thresholds, restock, low-stock/out-of-stock alerts | Yes | ✅ Done |
| Orders: filters, search, status updates, tracking number, detail drawer, CSV | Yes | ✅ Done |
| Customers list and verification status | Yes | ✅ Done |
| Analytics: ranges, deltas, category/status/product breakdowns | Yes | ✅ Done |
| Reviews moderation and rating recalculation | Yes | ✅ Done |
| Journal create/edit/publish/delete | Yes | ✅ Done |
| Coupons create/activate/deactivate/usage | Yes | ✅ Done |
| Settings: profile, password, store info | Yes | ✅ Done |
| JWT access + refresh token rotation with silent retry | Yes | ✅ Done |
| Rate limiting, CORS, Helmet, validation, upload guards | Yes | ✅ Done |
| Prisma schema, seed, test cleanup script | Yes | ✅ Done |
| Server-side CSV exports | Yes | ✅ Done |
| Payment gateway configuration status endpoint; safe email fallback when SMTP is absent | Yes | ✅ Done |

### 2.3 Release scope

| Release | Contents | Exit criterion | State |
| --- | --- | --- | --- |
| **R0 Foundation** | Repo, stack, schema, seed, auth skeleton | Local API + DB + storefront boot | ✅ Done |
| **R1 Storefront** | Home, shop, product, cart, about, journal, i18n, currency | Browse and cart work | ✅ Done |
| **R2 Commerce** | Checkout, address, shipping, VAT, payments, orders, tracking, account | A COD order can be placed and tracked | ✅ Done |
| **R3 Admin & operations** | Dashboard, catalog, inventory, orders, customers, analytics, content, coupons | Admin can run the store without SQL | ✅ Done |
| **R4 Engagement** | Reviews, wishlist, search, newsletter, stock alerts, journal detail | Features tested and browser-verified | ✅ Done |
| **R5 Launch hardening** | Docs/env truth-up, legal pages, accessibility, performance, CI verification, monitoring | Launch checklist signed off | 🟡 In progress |
| **R6 Production launch** | Real credentials, Neon, API host, Vercel, DNS/SSL, smoke test | Public store takes a real order | ⬜ Blocked on accounts/keys |
| **R7 Stable operations** | Monitoring, backups, content cadence, monthly maintenance | 30 days without Sev-1 | ⬜ Planned |

### 2.4 Operational scope

- Development, test, and production environments.
- CI on every push and pull request.
- Database backup/restore and migration discipline.
- Error/uptime monitoring and log rotation.
- Content operations: products, journal, reviews, coupons.
- Support workflow: order lookup, cancellations, refunds, delivery exceptions.
- Security maintenance: dependency audits, secret rotation, access review.

---

## 3. In scope, out of scope, and scope-creep control

### 3.1 In scope for v1

- Single-brand skincare catalog and content.
- Cambodia-only delivery and address model.
- USD as the settlement currency; KHR as a display conversion.
- COD as a real payment path; online gateways as credential-gated integrations.
- One warehouse / one stock pool.
- Manual fulfillment and manual refunds.
- Admin-managed content in its authored language; UI chrome is bilingual.
- Device-local wishlist; account order history on the server.
- Email notifications through SMTP when configured; safe demo logging otherwise.

### 3.2 Explicitly out of scope for v1

| Out-of-scope item | Why it is excluded | Revisit trigger |
| --- | --- | --- |
| Multi-country shipping and tax | Address/validation and carrier rules are Cambodia-specific | Expansion decision + carrier contract |
| Multi-currency settlement | USD is the ledger currency; KHR is display-only | Finance/accounting requirement |
| Marketplace / multi-vendor | Changes auth, catalog, payouts, and admin model | Business model change |
| Native iOS/Android apps | Responsive web is sufficient for launch | Retention data justifies it |
| Guest checkout | Requires separate cart/address/email verification and fraud rules | Conversion data + fraud review |
| Product variants (size/shade) as a first-class checkout flow | Data type exists, but cart/checkout/stock UX is single-SKU | Catalog expansion |
| Loyalty points, referrals, subscriptions | New ledger, rules, and accounting surface | Post-launch growth experiment |
| AI recommendations / personalization | Needs data volume and a model/ops owner | 6+ months of order data |
| Live chat / chatbot | Support email is the v1 channel | Support volume threshold |
| SMS notifications | Cost and provider integration | Delivery failure data |
| Warehouse/ERP/accounting integrations | Manual operations are sufficient at launch | Order volume threshold |
| Real-time analytics / websockets | Polling/refresh is adequate | Operational need |
| Page-builder CMS | Journal editor covers current content needs | Content team request |
| Multi-language DB content | UI i18n only; content stays in authored language | Dedicated translation workflow |
| Returns self-service portal | Manual support + order statuses cover v1 | Return volume threshold |
| Advanced tax engine | Flat 10% VAT is the current rule | Tax/legal change |
| Coupon stacking / complex promotions | One coupon per order; predictable math | Marketing requirement |
| Review photos / Q&A | Text reviews are enough for launch | Moderation capacity |
| Cross-device wishlist sync | Device-local persistence is intentional | Account-sync requirement |
| Push notifications | Email + tracking page cover v1 | Mobile app |
| Gateway refunds/chargebacks automation | Admin statuses only; refunds handled manually | Payment volume/compliance |

### 3.3 Scope-creep definition

**Scope creep is any request that adds a new user-facing capability, integration, data model, design-system change, or operational process after the release scope is frozen — without an explicit trade-off decision.**

Common forms:

- “While we’re here, can we also add …?”
- A bug fix that quietly becomes a redesign.
- A “small” integration that adds a new vendor, secret, webhook, or compliance obligation.
- A new dependency that changes bundle size, security surface, or build time.
- A data-model change that requires migration, seed, admin UI, and tests.
- A design change that abandons the Quiet Ledger palette or spacing system.

### 3.4 Scope-creep guardrails

1. **Classify first.** Every request is a bug, an in-scope improvement, or new scope. Only bugs and agreed in-scope improvements enter the current slice.
2. **No silent additions.** New scope goes to the Post-launch Backlog with a one-line value statement, estimate, and risk.
3. **Two-day rule.** If a task is estimated above two working days, split it into smaller WBS items before starting.
4. **Dependency rule.** No new package without `npm audit --omit=dev`, a bundle-impact check, and an owner.
5. **Schema rule.** No Prisma model/field change without migration, seed update, API contract update, and tests.
6. **Payment rule.** No gateway change without sandbox credentials, a test transaction, and a fallback path.
7. **Design rule.** No new visual language. Extend the existing tokens; do not introduce a second palette or typography system.
8. **Freeze rule.** During launch hardening, only launch blockers, security fixes, and data-loss bugs are allowed.
9. **Definition-of-Done rule.** A feature is not “done” because it renders; it is done when tested, built, audited, and documented.
10. **One-slice rule.** One active implementation slice at a time; parallel work only when it touches independent files and has a clear owner.

### 3.5 Change-control record

Use this table for every request that is not already in the WBS.

| Date | Request | Type | Impact | Decision | Owner |
| --- | --- | --- | --- | --- | --- |
| 2026-11-05 | Baseline scope established | Planning | — | Approved as v1 baseline | Piseth |
|  |  |  |  |  |  |

**Decision values:** `Accept now` · `Accept as bug fix` · `Defer to post-launch` · `Reject` · `Spike first`.

### 3.6 Current scope decisions (examples)

| Request | Decision | Reason |
| --- | --- | --- |
| Add KHR checkout/settlement | Defer | Display conversion only; ledger stays USD |
| Add guest checkout | Defer | Requires separate verification/fraud flow |
| Add product variants to checkout | Defer | Single-SKU cart/stock model is the v1 contract |
| Add a second shipping carrier | Defer | One standard method is intentional |
| Add a page builder | Defer | Journal editor is sufficient |
| Add cross-device wishlist | Defer | Device-local persistence is intentional |
| Add a returns portal | Defer | Manual support workflow |
| Replace the admin design with a new theme | Reject | Quiet Ledger is the approved system |
| Add SMS order updates | Defer | Email + tracking page cover v1 |
| Add real-time dashboard sockets | Defer | Refresh is adequate |
| Fix a literal translation, COD label, or sold-out button | Accept as bug fix | Directly breaks a live flow |

---

## 4. Work Breakdown Structure (WBS)

### 4.1 Notation

- **ID** — stable work-package identifier.
- **Size** — S = ≤ 2 hours, M = 0.5 day, L = 1–2 days. Anything larger is split.
- **Status** — ✅ Done · 🟡 In progress · ⬜ Planned · 🔒 Blocked.
- **Acceptance** — observable exit condition, not an activity.

### Phase 0 — Discovery and foundation

| ID | Work package | Small tasks | Acceptance | Status | Size |
| --- | --- | --- | --- | --- | --- |
| 0.1 | Product and brand definition | Name, catalog, tone, Quiet Ledger direction | Brand and catalog approved | ✅ | S |
| 0.2 | Stack decision | React/Vite, Express/Prisma/Postgres, admin SPA | Local stack documented | ✅ | S |
| 0.3 | Repository and scripts | `frontend/`, `admin/`, `backend/`, root scripts | `npm run install:all` and dev scripts work | ✅ | M |
| 0.4 | Environment contract | `.env` files, CORS, ports, secrets | API + DB + storefront boot locally | ✅ | M |
| 0.5 | Database schema and seed | Users, products, orders, reviews, blog, coupons | `db:push` + `db:seed` produce demo data | ✅ | L |
| 0.6 | Auth foundation | Register, login, JWT, refresh, role guard | Protected routes reject anonymous users | ✅ | L |

### Phase 1 — Storefront foundation

| ID | Work package | Small tasks | Acceptance | Status | Size |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Design system | Tokens, type scale, buttons, cards, section rhythm | Storefront and admin share the palette | ✅ | L |
| 1.2 | Layout shell | Navbar, footer, mobile menu, cart badge | Navigation works at mobile/tablet/desktop | ✅ | L |
| 1.3 | Home page | Hero, featured grid, categories, story, testimonials, community | Home renders live products | ✅ | L |
| 1.4 | Shop page | Grid, category pills, price/rating filters, sort | Filters update results without reload | ✅ | L |
| 1.5 | Product detail | Gallery, price, quantity, add-to-bag, accordions, related | In-stock product can be added | ✅ | L |
| 1.6 | Static/content pages | About, journal listing, 404 | Pages load without console errors | ✅ | M |
| 1.7 | i18n and currency | EN/KM dictionary, USD/KHR switch, persisted prefs | Toggle changes UI and prices | ✅ | L |
| 1.8 | Cart page | Quantity, remove, coupon input, totals | Cart persists after reload | ✅ | M |

### Phase 2 — Commerce core

| ID | Work package | Small tasks | Acceptance | Status | Size |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Checkout contact step | Prefill name/email, required phone, validation | Invalid phone blocks progress | ✅ | M |
| 2.2 | Cambodia address | PP/province toggle, khan/province picker, house/street, optional postal code | Only valid Cambodian addresses submit | ✅ | L |
| 2.3 | Shipping and totals | One method, free-over-$75 rule, 10% VAT, USD totals | Totals match server calculation | ✅ | M |
| 2.4 | Payment choice | COD default, ABA, Bakong, card; credential-gated demo labels | COD places a real order | ✅ | L |
| 2.5 | Order creation | Stock decrement, coupon math, address snapshot, order number | Order persists and stock changes | ✅ | L |
| 2.6 | Confirmation step | “Place order?” confirmation, success page, email hook | No order until confirmed | ✅ | M |
| 2.7 | Public tracking | Order number + email lookup, timeline, items, totals, destination | Tracking works without login | ✅ | L |
| 2.8 | Account orders | History, pagination, lifetime totals, status timeline | 19+ orders show correctly | ✅ | L |
| 2.9 | Email notifications | Order confirmation, status, reset, newsletter, stock alerts | Demo log without SMTP; real send with SMTP | 🟡 | L |
| 2.10 | Real payment settlement | Stripe/Bakong/ABA sandbox transactions | Sandbox payment updates order | 🔒 | L |

### Phase 3 — Engagement and retention

| ID | Work package | Small tasks | Acceptance | Status | Size |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Reviews | Rating summary, distribution, approved list, submit, moderation | One review per customer; verified badge | ✅ | L |
| 3.2 | Wishlist | Heart toggle, persistence, wishlist page, sold-out saves | Wishlist survives reload | ✅ | M |
| 3.3 | Search | Relevance ranking, typo tolerance, facets, typeahead | `serum` returns ranked results | ✅ | L |
| 3.4 | Newsletter | Subscribe form, API persistence, welcome email | Subscriber appears in admin | ✅ | M |
| 3.5 | Back-in-stock alerts | Sold-out signup, restock trigger, email | Restock notifies waiting customers | ✅ | M |
| 3.6 | Journal detail | `/journal/:slug`, body render, 404 state | Article cards open full posts | ✅ | M |
| 3.7 | Google OAuth2 | Redirect flow, callback, account linking | Sign-in works with real credentials | 🔒 | L |
| 3.8 | Session resilience | Silent refresh, concurrent 401 dedupe, logout safety | No forced re-login on token expiry | ✅ | M |
| 3.9 | Password reset | Request, single-use token, expiry, new password | Reset link works once | ✅ | M |

### Phase 4 — Admin and operations

| ID | Work package | Small tasks | Acceptance | Status | Size |
| --- | --- | --- | --- | --- | --- |
| 4.1 | Admin auth gate | Login, token storage, role guard, logout | Non-admins cannot enter | ✅ | M |
| 4.2 | Dashboard | KPIs, deltas, revenue chart, top products, recent orders | Live data, no demo rows | ✅ | L |
| 4.3 | Products CRUD | List, search, filter, pagination, drawer, upload, delete | Create/edit/delete persists | ✅ | L |
| 4.4 | Inventory | Thresholds, restock, low/out-of-stock KPIs, waiting count | Restock updates storefront | ✅ | L |
| 4.5 | Orders | Status tabs, search, inline update, tracking, detail, CSV | Status change reflected in tracking | ✅ | L |
| 4.6 | Customers | Live list, joined date, verification status | Customer data matches DB | ✅ | M |
| 4.7 | Analytics | Date ranges, comparisons, status mix, top products, collections | Range totals reconcile | ✅ | L |
| 4.8 | Reviews moderation | Approve, unpublish, delete, rating recalculation | Storefront shows approved only | ✅ | M |
| 4.9 | Journal admin | Create, edit, publish/draft, delete | Published post appears on storefront | ✅ | M |
| 4.10 | Coupons | Create percentage/fixed, activate/deactivate, usage | Coupon applies at checkout | ✅ | M |
| 4.11 | Settings | Profile, password change, store info, sign out | Changes persist | ✅ | M |

### Phase 5 — Quality, security, and CI

| ID | Work package | Small tasks | Acceptance | Status | Size |
| --- | --- | --- | --- | --- | --- |
| 5.1 | Backend test suite | Auth, catalog, orders, payments, reviews, admin, workflow rules | 176 tests, 0 failures, 1 credential skip | ✅ | L |
| 5.2 | Frontend test suite | Currency, i18n, catalog, stores, reviews, tracking, cards, refresh | 38 tests, 0 failures | ✅ | L |
| 5.3 | Type and build gate | `tsc --noEmit`, production builds for all three apps | All builds green | ✅ | M |
| 5.4 | Dependency security | `npm audit --omit=dev`, remove unused packages, upgrade router | 0 vulnerabilities in all apps | ✅ | M |
| 5.5 | CI pipeline | Postgres service, API tests, storefront tests/build, admin build | Workflow runs on push/PR | ✅ | L |
| 5.6 | Database hygiene | Throwaway test users, `db:clean`, seed integrity | Demo account not polluted | ✅ | M |
| 5.7 | Browser smoke suite | Home, search, product, cart, checkout, tracking, account, admin | Main flows pass without console errors | ✅ | L |
| 5.8 | Documentation truth-up | Ports, router v7, test counts, removed packages, env keys | README and env examples match code | ⬜ | M |
| 5.9 | Accessibility pass | Keyboard nav, focus trap, labels, contrast, modal | No critical WCAG issues in core flows | ⬜ | L |
| 5.10 | Performance budget | Bundle analysis, lazy routes, image weight, LCP | Budgets documented and met | ⬜ | L |
| 5.11 | CI remote verification | Push, inspect GitHub Actions, add badge | Remote jobs green | ⬜ | S |

### Phase 6 — Production launch

| ID | Work package | Small tasks | Acceptance | Status | Size |
| --- | --- | --- | --- | --- | --- |
| 6.1 | Production accounts | Vercel, API host, Neon, domain, email | Accounts and owners confirmed | 🔒 | M |
| 6.2 | Production env/secrets | JWT, DB, OAuth, payment, SMTP, frontend URLs | Config validated, no dev secrets | 🔒 | M |
| 6.3 | Database migration | `db:push`/migrate, seed admin, backup | Prod schema matches code | 🔒 | M |
| 6.4 | API deploy | Build, start, health check, CORS, uploads | `/health` and key endpoints pass | 🔒 | L |
| 6.5 | Storefront/admin deploy | Vercel projects, env vars, rewrites | Both URLs load over HTTPS | 🔒 | L |
| 6.6 | OAuth production URIs | Google console callback/origins | Google sign-in works in prod | 🔒 | S |
| 6.7 | Payment sandbox/live | Stripe/ABA/Bakong credentials, test transaction | One sandbox payment settles | 🔒 | L |
| 6.8 | Email deliverability | SMTP, SPF, DKIM, test inbox | Confirmation/reset emails arrive | 🔒 | M |
| 6.9 | Legal pages | Privacy, terms, shipping/returns, footer links | Pages published and linked | ⬜ | M |
| 6.10 | Monitoring and backups | Uptime, error tracking, DB backup, log rotation | Alerts and restore drill documented | ⬜ | L |
| 6.11 | Production smoke | Real order, tracking, admin status, email | End-to-end order completes | 🔒 | M |
| 6.12 | Go-live checklist | Rollback plan, support contacts, launch note | Signed off | ⬜ | S |

### Phase 7 — Post-launch operations

| ID | Work package | Small tasks | Acceptance | Status | Size |
| --- | --- | --- | --- | --- | --- |
| 7.1 | Uptime and error review | Daily/weekly check, alert triage | Sev-1 acknowledged within SLA | ⬜ | S |
| 7.2 | Order operations | Fulfillment, cancellations, refunds, delivery exceptions | Orders leave PENDING daily | ⬜ | M |
| 7.3 | Content cadence | Journal posts, product copy, campaign banners | Content calendar maintained | ⬜ | M |
| 7.4 | Review moderation | Approve/unpublish within SLA | No stale pending queue | ⬜ | S |
| 7.5 | Security maintenance | Monthly audit, dependency updates, secret rotation | 0 high/critical vulnerabilities | ⬜ | M |
| 7.6 | Analytics review | Conversion, AOV, top products, drop-off | Monthly decision log | ⬜ | M |
| 7.7 | Backlog grooming | Re-score deferred items, kill stale requests | Backlog reviewed monthly | ⬜ | S |

---

## 5. Small-scope next slices

These are deliberately sized to fit one sitting (S/M) and to avoid opening multiple fronts at once.

| Priority | Slice | Why now | Output | Size | Dependency |
| --- | --- | --- | --- | --- | --- |
| P0 | **Docs truth-up** | README still says Router v6, Swiper, Zod, 33 tests, ports 3000/3001 | README + env examples match the code | M | None |
| P0 | **CI remote verification** | Local green is not proof the workflow runs | GitHub Actions run link + badge | S | Push access |
| P0 | **Launch env contract** | Missing Google/payment/email keys block launch | One checklist of required prod secrets | M | None |
| P0 | **Legal pages** | Launch-required and currently missing | Privacy, terms, shipping/returns + footer links | M | Copy approval |
| P1 | **Accessibility pass** | Checkout/modal/nav are revenue-critical | Keyboard/focus/label fixes + notes | L | None |
| P1 | **Performance budget** | Bundle and image weight affect mobile conversion | Budget + measured report | L | None |
| P1 | **Payment sandbox harness** | Gateways are blocked on credentials | Mock/contract tests for each gateway | L | None |
| P1 | **Email test harness** | Real delivery is unverified | Test SMTP run + template screenshots | M | SMTP creds |
| P2 | **Production deploy rehearsal** | Surfaces config drift early | Staging URL + smoke report | L | Hosting/Neon |
| P2 | **Monitoring/backup runbook** | Launch without it is risky | Uptime, errors, backup, restore steps | M | Hosting |
| P2 | **Post-launch calendar** | Keeps content/support predictable | 4-week ops calendar | S | None |

### Recommended next slice

**Slice 1 — Docs truth-up (P0).** It is unblocked, low-risk, and removes misinformation that would otherwise slow down deployment and onboarding. It also gives us a clean baseline before touching production configuration.

Definition of done for Slice 1:

- README tech stack reflects React Router v7, no Swiper/Zod, current test counts, current ports, and the Quiet Ledger palette.
- `backend/.env.example` lists every key the code actually reads, including Google, ABA PayWay, Bakong, SMTP, and public URLs.
- `frontend/.env.example` documents `VITE_API_URL` and `VITE_USD_TO_KHR`.
- Admin env/deployment notes are explicit (no hidden required variable).
- No source behavior changes; `tsc` and tests still pass.

---

## 6. Milestones and exit criteria

| Milestone | Meaning | Exit criteria | State |
| --- | --- | --- | --- |
| M0 — Foundation | Can run the stack locally | DB, API, storefront, admin boot | ✅ |
| M1 — Storefront | Can browse and cart | Home/shop/product/cart pass smoke | ✅ |
| M2 — Commerce | Can place and track an order | COD order + tracking verified | ✅ |
| M3 — Admin | Can operate the store | Orders, stock, content, coupons verified | ✅ |
| M4 — Quality gate | Regressions are caught | 176 backend + 38 frontend tests, builds, audit | ✅ |
| M5 — Launch ready | Production can be configured | Docs, legal, a11y, monitoring, CI remote green | 🟡 |
| M6 — Live | Real customers can buy | Prod smoke order + payment/email verified | ⬜ |
| M7 — Stable | Operations are boring | 30 days, no Sev-1, backlog reviewed | ⬜ |

---

## 7. Risks, assumptions, and blockers

| Risk / blocker | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| Google OAuth keys missing | No Google sign-in | Use email/password until keys arrive; keep callback documented | Piseth |
| Stripe/ABA/Bakong keys missing | Online payments stay demo | COD is real; build a sandbox harness; label demo clearly | Piseth |
| SMTP missing | No real transactional email | Demo logging; test with a transactional provider before launch | Piseth |
| Hosting/Neon accounts missing | No production deploy | Prepare env contract and deploy rehearsal; create accounts | Piseth |
| Single maintainer | Bus factor and slow review | Small slices, tests, written runbooks | Piseth |
| Scope creep | Launch slips | Section 3 guardrails and change log | Piseth |
| Test data pollution | Misleading admin metrics | Throwaway users + `db:clean` after suites | Engineering |
| Log growth (`.logs/backend.log`) | Disk and debugging noise | Add rotation/retention in launch hardening | Engineering |
| No monitoring | Outages go unnoticed | Uptime + error tracking before go-live | Engineering |
| Legal pages missing | Compliance/trust gap | Publish privacy, terms, shipping/returns before launch | Piseth |
| Payment/refund compliance | Manual process may not scale | Document manual refunds; revisit automation | Piseth |
| Exchange-rate drift | KHR display differs from expectation | Display-only label + configurable rate | Engineering |
| CI remote unverified | False confidence | Run and inspect Actions after push | Engineering |

### Assumptions

- The store sells only within Cambodia in v1.
- USD is the accounting currency; KHR is a display conversion.
- One warehouse and one stock pool.
- One coupon per order; no stacking.
- Online payments are optional at launch; COD is the guaranteed path.
- Admin content is authored in one language per post; UI chrome is bilingual.
- The seeded demo account is for demos, not for automated tests.

---

## 8. Definition of Done

### 8.1 Feature-level

- Acceptance criteria in the WBS are met.
- Happy path and at least one failure path are tested.
- Backend tests (if API/data touched) and frontend tests (if UI touched) pass.
- `tsc --noEmit` and production build pass for affected apps.
- `npm audit --omit=dev` remains at 0 vulnerabilities.
- No new console errors in the browser smoke.
- Responsive behavior checked at mobile, tablet, desktop.
- Keyboard/focus/labels checked for new controls.
- UI strings added to the EN/KM dictionary; no hard-coded English in new UI.
- Env/README updated if configuration changed.
- No demo/test data left in the seeded database.

### 8.2 Launch-level

- Production env vars set and validated; no dev secrets.
- Database migrated, seeded with admin, backed up, restore tested.
- API health, CORS, uploads, auth, and rate limits verified in production.
- Storefront and admin served over HTTPS with correct API URLs.
- Google OAuth, payment sandbox, and email delivery verified (or explicitly waived).
- Legal pages published and linked.
- Monitoring, alerting, log retention, and backup schedule active.
- Production smoke order placed, tracked, status-updated, and emailed.
- Rollback plan and support contacts written down.

---

## 9. WBS maintenance rules

1. Update status and the change log at the end of every slice.
2. Link the commit/PR next to the WBS item when it ships.
3. Never mark an item ✅ without its acceptance evidence (test name, build, screenshot, or smoke note).
4. Split any item that grows beyond two days.
5. Keep deferred requests in the change log; do not silently delete them.
6. Review this document at each milestone; re-baseline only with an explicit decision.
7. The next slice starts only after the previous slice’s Definition of Done is satisfied.

---

## 10. Immediate next step

**Do not start a new feature yet.** Complete **Slice 1 — Docs truth-up**, then choose the next P0 slice from Section 5.

Proposed order after Slice 1:

1. CI remote verification.
2. Launch env contract and secret checklist.
3. Legal pages.
4. Accessibility pass.
5. Payment/email sandbox harness.
6. Production deploy rehearsal.
7. Monitoring and backups.

This order keeps launch blockers in front of nice-to-haves and respects the two-day rule.
