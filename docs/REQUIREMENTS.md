# Calesta / Lumière — Functional & Non-Functional Requirements

| Field | Value |
| --- | --- |
| Document owner | Piseth |
| Version | 1.0 |
| Date | 2026-11-05 |
| Baseline | `d25dad6` — Harden auth refresh and complete storefront content flows |
| Parent document | [`PROJECT-SCOPE.md`](./PROJECT-SCOPE.md) |
| Purpose | Turn the scope/WBS into testable functional and non-functional requirements |

---

## How to read this document

### Requirement IDs

| Prefix | Area |
| --- | --- |
| `FR-AUTH` | Identity, sessions, roles, password reset |
| `FR-CAT` | Catalog, discovery, search, content |
| `FR-CART` | Cart, coupons, totals |
| `FR-CHK` | Checkout, address, shipping, tax |
| `FR-PAY` | Payment methods and settlement |
| `FR-ORD` | Orders, statuses, tracking, fulfillment |
| `FR-REV` | Reviews and moderation |
| `FR-WISH` | Wishlist |
| `FR-NEWS` | Newsletter and stock alerts |
| `FR-ADM` | Admin console and operations |
| `FR-I18N` | Localization and currency display |
| `FR-API` | API contract, uploads, health, configuration |
| `NFR-*` | Non-functional requirement |

### Priority

| Code | Meaning |
| --- | --- |
| **M** | Must have for v1 launch |
| **S** | Should have; can slip one release with a documented workaround |
| **C** | Could have; post-launch candidate |

### Status

| Code | Meaning |
| --- | --- |
| ✅ | Implemented and verified |
| 🟡 | Partial, or implemented with a known gap |
| ⬜ | Planned, not implemented |
| 🔒 | Blocked by credentials, accounts, or an external dependency |
| ⛔ | Explicitly out of scope for v1 |

---

## 1. Functional requirements

### 1.1 Identity, sessions, and access (`FR-AUTH`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-AUTH-01 | A visitor can register with first name, last name, email, and password. Duplicate emails return `409`; passwords shorter than 8 characters are rejected. | M | ✅ | `backend/tests/auth.test.mjs`; bcrypt cost 12 |
| FR-AUTH-02 | A registered user can sign in and receives an access token and a refresh token. Invalid credentials return `401`. | M | ✅ | `auth.test.mjs`; login endpoint |
| FR-AUTH-03 | An expired access token is refreshed silently and the original request is retried. Concurrent 401s share one refresh request. | M | ✅ | `frontend/src/lib/api.test.ts`; `apiFetch` dedupe |
| FR-AUTH-04 | Refresh tokens rotate on use. A refresh token is revoked on logout and on password change/reset. | M | 🟡 | Rotation is implemented, but concurrent refreshes across tabs are not transactionally serialized |
| FR-AUTH-05 | A user can sign in with Google OAuth2. | M | 🔒 | Code exists; `GOOGLE_CLIENT_ID`/`SECRET` missing; no `state` parameter yet |
| FR-AUTH-06 | A user can request a password reset by email. The link is single-use, expires after one hour, and revokes existing sessions when used. | M | ✅ | `auth.test.mjs`; SHA-256 token hash; 1-hour expiry |
| FR-AUTH-07 | A signed-in user can change their password by confirming the current one; all refresh tokens are revoked. | M | ✅ | `auth.test.mjs`; change-password endpoint |
| FR-AUTH-08 | Only `ADMIN` users can access admin endpoints. Anonymous users receive `401`; non-admins receive `403`. | M | ✅ | `requireAdmin`; admin API tests |
| FR-AUTH-09 | A signed-in session survives page reloads; logout clears the session and the refresh token. | M | ✅ | `calesta-auth` persistence; logout endpoint |
| FR-AUTH-10 | A signed-in customer can view and update their profile (name, avatar) and view their account page. | M | ✅ | Account page; `PATCH /api/users/me` |
| FR-AUTH-11 | Auth endpoints are rate-limited separately from the global API limit. | M | ✅ | `RATE_LIMIT_AUTH_MAX`, default 10 per 15 minutes |
| FR-AUTH-12 | Admin accounts support a second factor before production launch. | S | ⬜ | Not implemented |
| FR-AUTH-13 | Refresh tokens are stored hashed at rest, not as usable plaintext. | S | ⬜ | Currently stored as JWTs in `refresh_tokens` |

**Known auth gaps**

- Google OAuth has no `state` parameter and returns tokens in the redirect URL query string.
- Refresh rotation is not atomic; two tabs refreshing the same token can race.
- Password-reset links are always written to the server log, including in production.
- Access tokens live in `localStorage`, so an XSS bug can read them.
- No admin MFA.

---

### 1.2 Catalog, discovery, and content (`FR-CAT`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-CAT-01 | Shoppers can browse a paginated product list with category, price, rating, and sort controls. | M | ✅ | `products.test.mjs`; Shop page |
| FR-CAT-02 | A product detail page is reachable by slug and shows gallery, price, description, ingredients, benefits, usage, rating, and related products. | M | ✅ | `ProductPage`; product API |
| FR-CAT-03 | Categories are listed and can be used to filter the catalog. | M | ✅ | `GET /api/categories`; Shop category pills |
| FR-CAT-04 | Related products are shown on the product detail page. | S | ✅ | `GET /api/products/:id/related` |
| FR-CAT-05 | Search matches names, taglines, tags, categories, descriptions, and ingredients; tolerates 1–2 character typos; ranks by relevance; returns category/price/rating facets and a “did you mean” suggestion. | M | ✅ | `search.test.mjs`; search controller |
| FR-CAT-06 | The header search provides live typeahead suggestions. | S | ✅ | `GET /api/products/suggest?q=` |
| FR-CAT-07 | Out-of-stock products are hidden from the public catalog by default; sold-out products remain viewable from the wishlist with a disabled add button. | M | ✅ | `ProductCard.test.tsx`; wishlist page |
| FR-CAT-08 | The journal lists published posts and each card opens a full article detail page by slug. | S | ✅ | `JournalPage`, `JournalPostPage`; `GET /api/blog/:slug` |
| FR-CAT-09 | The home page renders hero, featured products, categories, brand story, testimonials, journal preview, community section, and newsletter. | M | ✅ | Home page; browser smoke |
| FR-CAT-10 | The About page renders the brand story and timeline. | S | ✅ | About page |
| FR-CAT-11 | Images have a fallback when the source is missing or broken. | S | ✅ | `ImageWithFallback` |
| FR-CAT-12 | Search remains complete beyond 500 in-stock products. | S | ⬜ | Candidate cap is 500; needs database search or pagination strategy |

**Catalog capacity note**

Search loads up to `SEARCH_CANDIDATE_CAP = 500` in-stock products into memory and scores them per request. This is fast for the current catalog and acceptable for launch, but it is a documented scale limit, not a permanent search architecture.

---

### 1.3 Cart and coupons (`FR-CART`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-CART-01 | A shopper can add an in-stock product to the cart from the product page or product card. | M | ✅ | `ProductCard.test.tsx`; cart store |
| FR-CART-02 | A shopper can change quantity and remove items; quantity is clamped to available stock and the 99-unit order limit. | M | ✅ | Cart page; order validation |
| FR-CART-03 | The cart persists across reloads in `localStorage` (`calesta-cart`). | M | ✅ | `store.test.ts` |
| FR-CART-04 | Authenticated carts synchronize with the server cart; order creation clears both the server cart and the client cart. | M | ✅ | Cart routes; order controller |
| FR-CART-05 | A coupon can be applied and removed; invalid, expired, usage-capped, or below-minimum coupons are rejected with a clear message. | M | ✅ | `coupons.test.mjs`; checkout coupon UI |
| FR-CART-06 | Cart totals show subtotal, discount, shipping, 10% VAT, and total in the selected display currency. | M | ✅ | Cart/checkout totals |
| FR-CART-07 | The header cart badge reflects item count and clears after a successful order. | S | ✅ | Navbar; browser smoke |
| FR-CART-08 | Sold-out products cannot be added from a product card. | M | ✅ | `ProductCard.test.tsx` |
| FR-CART-09 | A shopper can see a stock warning before checkout if quantity exceeds current stock. | S | 🟡 | Server rejects at order time; client warning is not comprehensive |

---

### 1.4 Checkout, address, shipping, and tax (`FR-CHK`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-CHK-01 | Checkout requires an authenticated customer; anonymous shoppers are prompted to sign in. | M | ✅ | Checkout page; `openAuthModal` |
| FR-CHK-02 | The contact step collects first name, last name, email, and a required Cambodian phone number. | M | ✅ | `validateStep`; `isValidKhPhone` |
| FR-CHK-03 | The address step asks only: Phnom Penh or province, khan or province, house number and street, optional postal code, and country (Cambodia). | M | ✅ | `CheckoutPage`; `cambodia.test.ts` |
| FR-CHK-04 | The server validates country, delivery area, postal code format, and phone format. | M | ✅ | `validateCambodianAddress` |
| FR-CHK-05 | The server validates that `city` and `state` describe a consistent Cambodian address. | S | 🟡 | `state` is validated; `city` is not cross-checked |
| FR-CHK-06 | Exactly one shipping method is offered: standard delivery, free over $75 after discount. | M | ✅ | Checkout UI; order controller |
| FR-CHK-07 | VAT is 10% of the discounted subtotal; the server recalculates all totals and never trusts client prices. | M | ✅ | `orders.test.mjs`; order controller |
| FR-CHK-08 | The payment step offers cash on delivery (default), ABA PayWay, Bakong KHQR, and credit/debit card. | M | ✅ | Checkout UI |
| FR-CHK-09 | “Place Order” asks for confirmation before creating the order. | M | ✅ | Confirmation panel; browser smoke |
| FR-CHK-10 | A successful order shows a confirmation page with order number and tracking link; the cart is cleared. | M | ✅ | Confirmation page; browser smoke |
| FR-CHK-11 | Checkout errors are shown without losing the shopper’s progress; an expired session recovers silently. | M | ✅ | `apiFetch`; checkout error state |
| FR-CHK-12 | Guest checkout is not part of v1. | — | ⛔ | Account is required |
| FR-CHK-13 | Address book CRUD is available to signed-in customers. | S | ✅ | Address API; checkout address selection |

---

### 1.5 Payments (`FR-PAY`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-PAY-01 | Cash on delivery is the default and works without any gateway credentials. The order remains `UNPAID` until collected. | M | ✅ | COD checkout; order controller |
| FR-PAY-02 | Credit/debit card uses Stripe Checkout when `STRIPE_SECRET_KEY` is configured; the return URL verifies the session and marks the order paid. | M | 🟡 | Stripe session + verify implemented; no webhook reconciliation |
| FR-PAY-03 | Bakong KHQR generates a QR payload/image when `BAKONG_ACCOUNT_ID` is configured; verification marks the order paid. | M | 🟡 | QR + verify implemented; demo fallback when unconfigured |
| FR-PAY-04 | ABA PayWay is selectable and shows a demo/coming-soon path until merchant credentials and the hosted checkout are implemented. | M | 🔒 | `/api/payments/aba/session` is a placeholder |
| FR-PAY-05 | When a gateway is not configured, the UI clearly labels the payment as demo/simulated. | M | ✅ | `gatewayDemo`; checkout notices |
| FR-PAY-06 | The admin can mark a COD order paid when cash is collected, with an audit trail. | M | ⬜ | Admin only displays payment status |
| FR-PAY-07 | A Stripe/Bakong payment that completes while the shopper closes the tab is reconciled and the order becomes paid. | M | ⬜ | No webhook or background reconciliation |
| FR-PAY-08 | Demo settlement is impossible in production; an order can only become paid through a verified gateway or an authorized admin action. | M | ⬜ | Bakong demo verify marks paid when unconfigured |
| FR-PAY-09 | Refunds/chargebacks update both order status and payment status. | S | ⬜ | Status `REFUNDED` exists; payment status is not changed |
| FR-PAY-10 | Payment amounts are calculated server-side in the configured currency; the client cannot change the charge amount. | M | ✅ | Order total used for gateway session |
| FR-PAY-11 | Payment configuration is exposed to the storefront without leaking secrets. | M | ✅ | `GET /api/payments/config` returns booleans/currency |

**Payment launch blocker**

`POST /api/payments/bakong/verify` settles an order in demo mode when `BAKONG_TOKEN`/`BAKONG_ACCOUNT_ID` are absent. That is useful locally but must be disabled when `NODE_ENV=production`, or guarded by an explicit `PAYMENTS_DEMO=true` flag.

---

### 1.6 Orders, tracking, and fulfillment (`FR-ORD`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-ORD-01 | An authenticated customer can create an order from cart items, an owned address, an optional coupon, a payment method, and the standard shipping method. | M | ✅ | `orders.test.mjs` |
| FR-ORD-02 | The server fetches product prices from the database, validates stock, aggregates duplicate line items, and rejects quantities above 99. | M | ✅ | Order controller |
| FR-ORD-03 | Order creation decrements stock, flips `inStock` off at zero, increments coupon usage, clears the cart, and writes the order in one transaction. | M | ✅ | Order controller; workflow tests |
| FR-ORD-04 | Stock and coupon limits remain correct under concurrent checkouts. | M | 🟡 | Transaction exists, but stock is read before the decrement and not conditionally reserved |
| FR-ORD-05 | Order numbers are readable, unique, and shown consistently (`LUM-…`). | M | ✅ | `orderNumber` unique; order pages |
| FR-ORD-06 | A customer can list their own orders with pagination and see accurate lifetime order/spend totals. | M | ✅ | `GET /api/orders/my` summary; `AccountPage` |
| FR-ORD-07 | Order statuses are `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`. | M | ✅ | Admin order UI; status endpoint |
| FR-ORD-08 | Status changes follow a valid state machine; illegal transitions are rejected. | S | ⬜ | Any status can currently move to any other status |
| FR-ORD-09 | Cancelling or refunding an order restocks items and releases coupon usage exactly once; reactivating re-reserves them. | M | ✅ | Workflow tests; idempotent logic |
| FR-ORD-10 | An admin can attach or clear a tracking number; it appears on the account and public tracking pages. | M | ✅ | Tracking endpoint; tracking page |
| FR-ORD-11 | A shopper can track an order with order number + checkout email, without signing in. The lookup is rate-limited. | M | ✅ | `tracking.test.mjs`; `RATE_LIMIT_TRACK_MAX` |
| FR-ORD-12 | The public tracking payload exposes only customer-safe fields (status, timeline, items, totals, destination, payment state, tracking number). | M | ✅ | Tracking controller |
| FR-ORD-13 | An admin can filter, search, paginate, inspect, and export orders. | M | ✅ | Orders page; CSV export |
| FR-ORD-14 | Order confirmation and status-change emails are sent when SMTP is configured and safely logged otherwise. | M | 🟡 | Email service; no retry/queue |
| FR-ORD-15 | Payment status and order status stay consistent through COD collection, cancellation, and refund. | M | 🟡 | Status and payment status are separate; no admin paid/refund action |

---

### 1.7 Reviews (`FR-REV`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-REV-01 | Shoppers can read approved reviews and a rating summary with 5-star distribution. | M | ✅ | `ProductReviews`; reviews API |
| FR-REV-02 | A signed-in customer can submit one review per product; the form validates rating and text. | M | ✅ | `ProductReviews.test.tsx`; reviews tests |
| FR-REV-03 | A verified purchaser receives a verified-purchase badge automatically. | M | ✅ | Review controller; tests |
| FR-REV-04 | Reviews are moderated; only approved reviews appear on the storefront. | M | ✅ | Admin reviews page; approval flag |
| FR-REV-05 | Approving, unpublishing, or deleting a review recalculates the product rating and review count. | M | ✅ | Reviews tests |
| FR-REV-06 | Review photos and customer Q&A are not part of v1. | — | ⛔ | Post-launch candidate |

---

### 1.8 Wishlist (`FR-WISH`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-WISH-01 | A shopper can save/unsave a product from the product page and product card. | M | ✅ | `useWishlistStore`; wishlist page |
| FR-WISH-02 | Saved items persist per device in `calesta-wishlist`. | M | ✅ | `store.test.ts` |
| FR-WISH-03 | The wishlist page shows saved products, remove controls, and sold-out saves. | M | ✅ | Wishlist page; browser smoke |
| FR-WISH-04 | Wishlist sync across devices is not part of v1. | — | ⛔ | Device-local is intentional |

---

### 1.9 Newsletter and stock alerts (`FR-NEWS`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-NEWS-01 | A visitor can subscribe with an email from the home page; the subscriber is persisted and duplicates are reactivated. | M | ✅ | Newsletter API; home form |
| FR-NEWS-02 | A welcome email is sent when SMTP is configured; the response does not block on email delivery. | S | 🟡 | Fire-and-forget email; demo log otherwise |
| FR-NEWS-03 | A visitor can unsubscribe. | S | ✅ | `POST /api/newsletter/unsubscribe` |
| FR-NEWS-04 | Admins can see active subscribers and counts. | S | ✅ | Admin dashboard/newsletter data |
| FR-NEWS-05 | A shopper can request a back-in-stock notification for a sold-out product. | S | ✅ | Stock notification endpoint |
| FR-NEWS-06 | Restocking a product emails everyone waiting for it. | S | ✅ | Inventory restock flow; email template |
| FR-NEWS-07 | Newsletter and stock-alert emails are queued/retried so a transient SMTP failure does not lose the notification. | C | ⬜ | Fire-and-forget only |

---

### 1.10 Admin console and operations (`FR-ADM`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-ADM-01 | Admin routes are protected by a login gate and an admin role check. | M | ✅ | Admin login; `requireAdmin` |
| FR-ADM-02 | The dashboard shows live revenue, orders, customers, low-stock alerts, pending reviews, newsletter subscribers, recent orders, and top products. | M | ✅ | Dashboard; `adminController` |
| FR-ADM-03 | Admins can list, search, filter, paginate, create, edit, and delete products. | M | ✅ | Products page; product tests |
| FR-ADM-04 | Admins can upload product images (admin-only, image types, 5 MB cap). | M | ✅ | Upload route |
| FR-ADM-05 | Admins can view stock levels, per-product thresholds, low/out-of-stock KPIs, and restock products; restocking notifies waiters. | M | ✅ | Inventory page; tests |
| FR-ADM-06 | Admins can filter/search orders, update status, attach tracking, inspect order details, and export CSV. | M | ✅ | Orders page; tests |
| FR-ADM-07 | Admins can list customers with join date and verification status. | S | ✅ | Customers page |
| FR-ADM-08 | Admins can view analytics for 7/30/90 days, this/last month, and custom ranges, with comparisons, status mix, top products, and collection revenue. | M | ✅ | Analytics page; tests |
| FR-ADM-09 | Admins can approve, unpublish, and delete reviews; ratings recalculate. | M | ✅ | Reviews page; tests |
| FR-ADM-10 | Admins can create, edit, publish/draft, and delete journal posts. | S | ✅ | Journal page; blog tests |
| FR-ADM-11 | Admins can create percentage/fixed coupons, activate/deactivate, and track usage. | S | ✅ | Coupons page; tests |
| FR-ADM-12 | Admins can edit their profile, change their password, and view store settings. | S | ✅ | Settings page |
| FR-ADM-13 | Admins can export orders, products, customers, and reviews as UTF-8 CSV. | S | ✅ | Export endpoints; tests |
| FR-ADM-14 | Admin actions are recorded in an audit log (who changed what, when). | S | ⬜ | Not implemented |
| FR-ADM-15 | Admins can open a customer detail view with order history and spend. | C | ⬜ | Customer list only |
| FR-ADM-16 | Admins can perform bulk order/product actions. | C | ⬜ | One-at-a-time only |
| FR-ADM-17 | Admin accounts support MFA before production. | S | ⬜ | Not implemented |

---

### 1.11 Localization and currency (`FR-I18N`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-I18N-01 | Storefront chrome, navigation, checkout, account, tracking, and errors are available in English and Khmer. | M | ✅ | `i18n.ts`; `i18n.test.ts` |
| FR-I18N-02 | The language choice persists per browser. | S | ✅ | `calesta-prefs` |
| FR-I18N-03 | New UI strings are added to the typed dictionary; no hard-coded English in new customer UI. | M | 🟡 | Enforced by review, not lint |
| FR-I18N-04 | DB-authored content (products, journal) stays in its authored language. | M | ✅ | Content model |
| FR-I18N-05 | Prices are stored/settled in USD; KHR is a display conversion using `VITE_USD_TO_KHR` (default 4,100). | M | ✅ | `currency.test.ts` |
| FR-I18N-06 | Dates are formatted per selected locale and parsed as local dates (no off-by-one-day). | S | ✅ | Account/tracking dates |

---

### 1.12 API and platform contract (`FR-API`)

| ID | Requirement | Priority | Status | Acceptance / evidence |
| --- | --- | --- | --- | --- |
| FR-API-01 | The API exposes REST endpoints under `/api` for auth, catalog, cart, orders, reviews, wishlist, blog, newsletter, coupons, admin, uploads, and payments. | M | ✅ | Route modules |
| FR-API-02 | Responses use `{ success, data, message?, pagination?, summary? }` consistently. | M | 🟡 | Mostly consistent; a few admin routes return custom shapes |
| FR-API-03 | Errors use appropriate HTTP status codes and a human-readable message without leaking stack traces. | M | ✅ | `errorHandler` |
| FR-API-04 | List endpoints paginate and clamp page size. | M | 🟡 | Products clamp to 100; some admin/order endpoints rely on caller limits |
| FR-API-05 | Inputs are validated server-side; prices, totals, stock, and permissions are never trusted from the client. | M | ✅ | Order controller; validation helpers |
| FR-API-06 | `GET /health` reports API availability. | M | ✅ | Health endpoint |
| FR-API-07 | CORS allows only the configured storefront/admin origins. | M | ✅ | `FRONTEND_URL`, `ADMIN_URL` |
| FR-API-08 | Global, auth, and public-tracking rate limits are configurable. | M | ✅ | `RATE_LIMIT_*` env vars |
| FR-API-09 | Payment configuration is exposed without secrets. | M | ✅ | `/api/payments/config` |
| FR-API-10 | Email falls back to safe logging when SMTP is unconfigured. | M | ✅ | `email.ts` |
| FR-API-11 | Seed and test-cleanup scripts keep the demo database usable. | M | ✅ | `db:seed`, `db:clean` |
| FR-API-12 | The API has an OpenAPI/schema contract and a versioning policy. | C | ⬜ | README endpoint list only |
| FR-API-13 | Uploads are stored in durable object storage with cleanup, not local disk. | S | ⬜ | Local `backend/uploads`; ephemeral on many hosts |

---

## 2. Non-functional requirements

### 2.1 Performance and capacity (`NFR-PERF`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-PERF-01 | Storefront LCP ≤ 2.5 s at p75 on a mid-tier mobile device over 4G. | M | ⬜ | Lighthouse/WebPageTest; not measured |
| NFR-PERF-02 | API read endpoints p95 ≤ 300 ms; order creation p95 ≤ 800 ms under normal load. | M | ⬜ | Load test; not measured |
| NFR-PERF-03 | Initial route JS ≤ 200 KB gzip; route-level code splitting keeps secondary pages lazy. | S | 🟡 | Vite build shows React ~45 KB, GSAP ~46 KB gzip; no formal budget |
| NFR-PERF-04 | Search returns in ≤ 150 ms for a 500-product catalog. | S | 🟡 | In-memory scoring; cap 500 |
| NFR-PERF-05 | Product images are optimized (WebP/AVIF, responsive sizes, lazy loading) and ≤ 200 KB each. | S | 🟡 | Lazy loading/fallbacks; no optimization pipeline |
| NFR-PERF-06 | Admin dashboard and analytics render in ≤ 2 s on a desktop with 10k orders. | S | ⬜ | Not measured |
| NFR-PERF-07 | The API supports 100 concurrent shoppers without errors or >1% request failure. | M | ⬜ | Load test; not measured |
| NFR-PERF-08 | The catalog can grow to 1,000 SKUs without changing the search UX. | C | 🟡 | Current in-memory cap 500 |

### 2.2 Availability and reliability (`NFR-REL`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-REL-01 | Production target availability is 99.5% per month, excluding planned maintenance. | M | ⬜ | Uptime monitor; not deployed |
| NFR-REL-02 | Order creation, stock decrement, coupon usage, and cart clear are atomic. | M | ✅ | Prisma transaction |
| NFR-REL-03 | Stock and coupon limits remain correct under concurrent checkouts. | M | 🟡 | Conditional update/locking needed |
| NFR-REL-04 | Payment settlement is reconciled even if the shopper closes the browser. | M | ⬜ | Webhook/background reconciliation needed |
| NFR-REL-05 | Cancellation/refund restocking is idempotent and never double-restocks. | M | ✅ | Workflow tests |
| NFR-REL-06 | Email failures never block an order response. | M | ✅ | Fire-and-forget email |
| NFR-REL-07 | A failed external gateway returns a clear error and leaves the order retryable. | M | 🟡 | Error messages exist; retry UX partial |
| NFR-REL-08 | The API recovers from a database restart without manual intervention. | S | ⬜ | No resilience test |

### 2.3 Security (`NFR-SEC`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-SEC-01 | Apply OWASP basics: Helmet headers, restrictive CORS, rate limiting, bcrypt (cost 12), JWT auth, server-side authorization, and input validation. | M | ✅ | Middleware; tests |
| NFR-SEC-02 | Secrets live only in environment/secret storage, never in the repo; production startup fails fast when required secrets are missing. | M | 🟡 | Env files; no startup validation |
| NFR-SEC-03 | Demo payment settlement is disabled in production. | M | ⬜ | Bakong demo path currently settles |
| NFR-SEC-04 | Uploads are admin-only, type/size restricted, and stored safely. | M | 🟡 | 5 MB cap, extension allowlist; SVG allowed; local disk |
| NFR-SEC-05 | OAuth uses a `state` parameter and never puts tokens in a URL query string. | M | ⬜ | Current callback puts tokens in query |
| NFR-SEC-06 | Refresh tokens are hashed at rest and rotated atomically. | S | ⬜ | Plaintext JWTs; rotation race |
| NFR-SEC-07 | Password reset tokens are hashed, single-use, time-limited, and never logged in production. | M | 🟡 | Hashed/single-use; link logged unconditionally |
| NFR-SEC-08 | Admin accounts support MFA. | S | ⬜ | Not implemented |
| NFR-SEC-09 | Dependencies have 0 known high/critical vulnerabilities at release. | M | ✅ | `npm audit --omit=dev` = 0 in all apps |
| NFR-SEC-10 | Security headers and HTTPS are enforced in production. | M | 🟡 | Helmet; TLS depends on host |
| NFR-SEC-11 | Admin actions are auditable. | S | ⬜ | No audit log |
| NFR-SEC-12 | A Content Security Policy appropriate to the storefront is deployed. | S | ⬜ | API Helmet only; storefront CSP not defined |

### 2.4 Privacy and compliance (`NFR-PRIV`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-PRIV-01 | Customer PII (email, phone, address) is accessible only to the owner and admins. | M | ✅ | Auth/role guards; tracking requires order + email |
| NFR-PRIV-02 | Privacy policy, terms of service, shipping policy, and returns policy are published and linked. | M | ⬜ | Pages missing |
| NFR-PRIV-03 | A data retention and deletion policy exists for accounts, orders, and newsletter subscribers. | S | ⬜ | Not documented |
| NFR-PRIV-04 | Marketing email includes an unsubscribe path and respects the subscriber flag. | S | 🟡 | Unsubscribe API exists; email footer needs verification |
| NFR-PRIV-05 | Payment data is never stored by the platform; gateways handle card data. | M | ✅ | Stripe Checkout/hosted flow |
| NFR-PRIV-06 | Logs do not contain passwords, tokens, or full PII in production. | M | 🟡 | Reset links logged; request bodies not logged |

### 2.5 Accessibility and usability (`NFR-A11Y`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-A11Y-01 | Core flows meet WCAG 2.1 AA: labels, contrast, focus visibility, keyboard operation, error identification. | M | ⬜ | Not audited |
| NFR-A11Y-02 | Modals and mobile menus trap focus, close with Escape, and restore focus. | M | 🟡 | Some dialogs; needs audit |
| NFR-A11Y-03 | Every form control has an accessible name; errors are announced. | M | 🟡 | Mixed labels/placeholders |
| NFR-A11Y-04 | Color is not the only indicator of status or errors. | S | 🟡 | Badges/text mostly; verify charts |
| NFR-A11Y-05 | Touch targets are at least 44×44 px on mobile. | S | 🟡 | Not audited |

### 2.6 Compatibility and responsiveness (`NFR-COMPAT`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-COMPAT-01 | Support current Chrome, Safari, Firefox, and Edge; iOS Safari and Android Chrome. | M | 🟡 | No formal browser matrix |
| NFR-COMPAT-02 | Layout works from 320 px to 1440 px without horizontal scroll. | M | 🟡 | Browser smoke; needs full matrix |
| NFR-COMPAT-03 | The storefront remains usable with JavaScript enabled but slow networks; route fallbacks are visible. | S | ✅ | Suspense fallback; lazy routes |
| NFR-COMPAT-04 | Admin supports desktop and tablet widths. | S | 🟡 | Desktop-first; mobile admin not a goal |

### 2.7 SEO and discoverability (`NFR-SEO`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-SEO-01 | Every page has a unique title and description. | M | 🟡 | Titles set per page; description static |
| NFR-SEO-02 | Product and journal pages expose canonical URLs and Open Graph/Twitter cards. | S | ⬜ | Not implemented |
| NFR-SEO-03 | `robots.txt` and a sitemap are published. | S | ⬜ | Not implemented |
| NFR-SEO-04 | Product pages emit valid JSON-LD (`Product`, `Offer`, `AggregateRating`). | S | ⬜ | Not implemented |
| NFR-SEO-05 | Admin is excluded from indexing. | M | ⬜ | Admin has no `noindex` meta |

### 2.8 Observability and operations (`NFR-OBS`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-OBS-01 | API requests are logged with method, path, status, and latency. | M | ✅ | Morgan |
| NFR-OBS-02 | Errors are captured in an error tracker with alerting. | M | ⬜ | Logs only |
| NFR-OBS-03 | Uptime is monitored from outside the host with alerting. | M | ⬜ | Not implemented |
| NFR-OBS-04 | Logs rotate/retain for a defined period; dev logs do not grow without bound. | M | ⬜ | `.logs/backend.log` has no rotation |
| NFR-OBS-05 | Key business metrics (orders, revenue, failures) have dashboards/alerts. | S | 🟡 | Admin analytics only; no alerts |
| NFR-OBS-06 | A production runbook covers deploy, rollback, incident, and restore. | M | ⬜ | Not written |

### 2.9 Data integrity and backup (`NFR-DATA`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-DATA-01 | PostgreSQL is backed up daily with a tested restore procedure. | M | ⬜ | No backup configured |
| NFR-DATA-02 | Schema changes use migrations, not ad-hoc production edits. | M | 🟡 | Prisma `db push` in dev; production migration plan needed |
| NFR-DATA-03 | Order/address/coupon foreign keys remain valid; orphan cleanup exists for tests. | M | ✅ | Prisma relations; `db:clean` |
| NFR-DATA-04 | Soft-delete or archival policy exists for products/orders. | C | ⬜ | Hard deletes |
| NFR-DATA-05 | Test runs never pollute the seeded demo account. | M | ✅ | Throwaway users; `db:clean` |

### 2.10 Maintainability and code quality (`NFR-MAINT`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-MAINT-01 | TypeScript strict mode is enabled in all apps. | M | 🟡 | Frontend/backend strict; admin `strict: false` |
| NFR-MAINT-02 | Lint and formatting are automated. | S | ⬜ | No ESLint/Prettier |
| NFR-MAINT-03 | README, env examples, and deployment notes match the code. | M | 🟡 | README/env drift; Slice 1 |
| NFR-MAINT-04 | Shared UI follows one design system (Quiet Ledger tokens). | M | ✅ | Storefront/admin palette |
| NFR-MAINT-05 | API contracts are documented and versioned. | C | ⬜ | README list only |
| NFR-MAINT-06 | No unused dependencies or dead feature code remains. | S | 🟡 | Swiper/Zod removed; `NewsletterSection.tsx` unused |

### 2.11 Testability and CI (`NFR-TEST`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-TEST-01 | Backend behavior is covered by an API suite against PostgreSQL. | M | ✅ | 176 tests: 175 pass, 1 credential skip |
| NFR-TEST-02 | Storefront logic/components are covered by Vitest + Testing Library. | M | ✅ | 38 tests across 9 files |
| NFR-TEST-03 | TypeScript and production builds pass for all apps. | M | ✅ | `tsc` + Vite builds |
| NFR-TEST-04 | CI runs backend, storefront, and admin jobs on push/PR. | M | ✅ | `.github/workflows/ci.yml`; remote run unverified |
| NFR-TEST-05 | A browser smoke suite covers the main revenue flows. | M | 🟡 | Manual browser validation done; not automated |
| NFR-TEST-06 | Critical payment/auth flows have failure-path tests. | M | 🟡 | Many tests; no gateway sandbox/contract tests |

### 2.12 Deployment and scalability (`NFR-DEPLOY`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-DEPLOY-01 | The API, storefront, admin, and database deploy to documented hosts with one command/runbook. | M | 🟡 | Vercel config for storefront; API/DB plan documented |
| NFR-DEPLOY-02 | Production environment variables are validated at startup. | M | ⬜ | No fail-fast validation |
| NFR-DEPLOY-03 | Deployments are repeatable and rollback is documented. | M | ⬜ | No rollback runbook |
| NFR-DEPLOY-04 | The API can run more than one instance without local-disk dependencies. | S | 🟡 | Uploads are local disk |
| NFR-DEPLOY-05 | The architecture supports 10k orders/month and 1k SKUs without a rewrite. | S | 🟡 | Single API/DB; search cap 500 |
| NFR-DEPLOY-06 | Static assets are cached and served through a CDN. | S | 🟡 | Vercel static hosting; uploads not CDN |

### 2.13 Cost and vendor (`NFR-COST`)

| ID | Requirement / target | Priority | Status | Verification |
| --- | --- | --- | --- | --- |
| NFR-COST-01 | Launch runs on low/free tiers until revenue justifies upgrades. | S | 🟡 | Neon/Vercel/Render plans; not fixed |
| NFR-COST-02 | Every paid dependency has an owner and a removal path. | C | ⬜ | Not documented |
| NFR-COST-03 | Payment/email vendors have a documented fallback. | S | 🟡 | COD + demo email fallback |

---

## 3. Traceability: WBS → requirements

| WBS phase | Primary functional requirements | Primary non-functional requirements |
| --- | --- | --- |
| Phase 0 — Foundation | FR-AUTH, FR-API | NFR-SEC, NFR-MAINT, NFR-DATA |
| Phase 1 — Storefront | FR-CAT, FR-CART, FR-I18N | NFR-PERF, NFR-A11Y, NFR-COMPAT, NFR-SEO |
| Phase 2 — Commerce | FR-CHK, FR-PAY, FR-ORD | NFR-REL, NFR-SEC, NFR-PRIV |
| Phase 3 — Engagement | FR-REV, FR-WISH, FR-NEWS, FR-CAT-08 | NFR-PERF, NFR-SEO, NFR-PRIV |
| Phase 4 — Admin | FR-ADM | NFR-SEC, NFR-OBS, NFR-DATA |
| Phase 5 — Quality | All FR regression coverage | NFR-TEST, NFR-MAINT, NFR-SEC |
| Phase 6 — Launch | All FR production verification | NFR-REL, NFR-OBS, NFR-DATA, NFR-DEPLOY, NFR-PRIV |
| Phase 7 — Operations | All FR support workflows | NFR-OBS, NFR-MAINT, NFR-COST |

---

## 4. Gap register

Prioritized gaps discovered while turning scope into requirements. **P0 = launch blocker**, **P1 = should fix before launch**, **P2 = post-launch**.

| ID | Gap | Priority | Requirement | Recommended action |
| --- | --- | --- | --- | --- |
| G-01 | Demo payment settlement can mark orders paid in production | P0 | FR-PAY-08 | Block demo settlement when `NODE_ENV=production`; require explicit demo flag |
| G-02 | Admin cannot mark a COD order paid | P0 | FR-PAY-06 | Add admin “mark paid” action + audit note |
| G-03 | Stripe has no webhook/reconciliation | P0 | FR-PAY-07 | Add webhook or scheduled reconciliation by session/payment ID |
| G-04 | ABA PayWay is a placeholder, not a real integration | P0 | FR-PAY-04 | Implement hosted checkout when credentials exist; keep demo label |
| G-05 | Google OAuth lacks `state` and puts tokens in the URL | P0 | NFR-SEC-05 | Add state/nonce, exchange code server-side, use a short-lived handoff code |
| G-06 | Legal pages (privacy/terms/shipping/returns) missing | P0 | NFR-PRIV-02 | Publish pages + footer links |
| G-07 | No monitoring, uptime alerts, or log rotation | P0 | NFR-OBS-02/03/04 | Add uptime/error tracking + rotation |
| G-08 | No backup/restore drill | P0 | NFR-DATA-01 | Enable daily backups; document restore |
| G-09 | Docs/env examples drift from code | P0 | NFR-MAINT-03 | Slice 1 docs truth-up |
| G-10 | CI remote run unverified | P0 | NFR-TEST-04 | Push, inspect Actions, add badge |
| G-11 | Stock/coupon concurrency race | P1 | FR-ORD-04, NFR-REL-03 | Conditional stock update or serializable transaction |
| G-12 | No order status state machine | P1 | FR-ORD-08 | Validate transitions; map payment status |
| G-13 | Accessibility not audited | P1 | NFR-A11Y-01 | WCAG pass on nav, modal, checkout |
| G-14 | SEO metadata incomplete | P1 | NFR-SEO-02/03/04 | Canonical/OG/sitemap/JSON-LD; `noindex` admin |
| G-15 | Admin audit log/MFA missing | P1 | FR-ADM-14/17, NFR-SEC-08/11 | Add audit trail; MFA before launch |
| G-16 | Uploads are local disk; SVG allowed | P1 | FR-API-13, NFR-SEC-04 | Object storage + CDN; remove SVG or sanitize |
| G-17 | Email is fire-and-forget | P1 | FR-NEWS-07, FR-ORD-14 | Queue/retry or provider webhooks |
| G-18 | Password-reset link logged in production | P0 | NFR-SEC-07 | Log only in non-production |
| G-19 | No performance/load test | P1 | NFR-PERF-01/02/07 | Lighthouse + k6/autocannon baseline |
| G-20 | Admin TypeScript not strict; no lint | P2 | NFR-MAINT-01/02 | Enable strict; add ESLint/Prettier |
| G-21 | Search cap 500 | P2 | FR-CAT-12 | DB search or indexed search when catalog grows |
| G-22 | No customer detail/bulk actions | P2 | FR-ADM-15/16 | Post-launch admin improvements |
| G-23 | No OpenAPI/versioning | P2 | FR-API-12, NFR-MAINT-05 | Publish contract when external clients exist |
| G-24 | Guest checkout, cross-device wishlist | P2 | FR-CHK-12, FR-WISH-04 | Deferred; do not add without a business case |

---

## 5. Acceptance test map

| Requirement area | Primary automated evidence | Manual evidence |
| --- | --- | --- |
| FR-AUTH | `backend/tests/auth.test.mjs`, `frontend/src/lib/api.test.ts` | Login, refresh, reset, Google gate |
| FR-CAT | `products.test.mjs`, `search.test.mjs`, `catalog.test.ts` | Shop, product, search, journal |
| FR-CART | `cart.test.mjs`, `store.test.ts`, `ProductCard.test.tsx` | Add/update/remove, persist |
| FR-CHK | `orders.test.mjs`, `cambodia.test.ts` | PP/province, khan, phone, totals |
| FR-PAY | `payments.test.mjs`, `TrackOrderPage.test.tsx` | COD order, gateway demo labels |
| FR-ORD | `orders.test.mjs`, `tracking.test.mjs`, `workflow.test.mjs` | Confirmation, account, tracking, admin status |
| FR-REV | `reviews.test.mjs`, `ProductReviews.test.tsx` | Submit/moderation |
| FR-WISH | `wishlist-addresses.test.mjs`, `store.test.ts` | Save/remove, sold-out save |
| FR-NEWS | `blog-newsletter.test.mjs` | Subscribe, admin count |
| FR-ADM | `inventory-analytics.test.mjs`, `coupons.test.mjs`, admin browser smoke | Dashboard, orders, inventory, CSV |
| FR-I18N | `i18n.test.ts`, `currency.test.ts` | EN/KM toggle, USD/KHR |
| NFR-SEC | `npm audit`, auth/role tests | Headers/CORS/rate-limit spot check |
| NFR-TEST | CI workflow | Local test/build runs |
| NFR-OBS | — | Deployment checklist |

---

## 6. Requirement change rules

1. **New functional requirement** → add to this document with an ID, priority, acceptance criteria, and WBS phase before implementation.
2. **New non-functional target** → state the measurable target and verification method; do not add vague “should be fast/safe” items.
3. **Scope change** → record in `PROJECT-SCOPE.md` §3.5; do not silently expand this document.
4. **Status change** → only mark ✅ with evidence (test, build, screenshot, or smoke note).
5. **Launch blocker** → any P0 gap blocks go-live until fixed or explicitly waived in writing.

---

## 7. Recommended implementation order after this breakdown

1. **G-09 — Docs/env truth-up** (unblocked, low risk).
2. **G-10 — CI remote verification**.
3. **G-18 — Remove production reset-link logging** (small security fix).
4. **G-01 — Disable demo settlement in production**.
5. **G-02 — Admin mark COD paid + audit note**.
6. **G-03 — Stripe webhook/reconciliation**.
7. **G-06 — Legal pages**.
8. **G-11/G-12 — Stock concurrency and order state machine**.
9. **G-13/G-14 — Accessibility and SEO pass**.
10. **G-07/G-08 — Monitoring, backups, log rotation**.
11. **G-04/G-05 — Real ABA and hardened Google OAuth when credentials exist**.
12. **G-19 — Performance/load baseline before launch**.

This order fixes revenue and security risks before polish, and keeps each slice inside the two-day rule from `PROJECT-SCOPE.md`.
