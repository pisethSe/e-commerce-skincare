# Calesta × weYOUNG — Workflow Parity Review

| Field | Value |
| --- | --- |
| Reference site | <https://weyoungcambodia.com/> |
| Reference stack | Next.js storefront on Riverbase 4.2.2 |
| Review date | 2026-11-05 |
| Calesta baseline | `b6beb44` — requirements breakdown |
| Purpose | Decide which weYOUNG workflows Calesta should copy, adapt, or reject before changing code |

---

## 1. Why this document exists

The request is to make Calesta’s workflows “follow or copy” weYOUNG Cambodia. That is not a single change: the reference site has a different checkout, payment, shipping, identity, and order model from the requirements already approved for Calesta.

This document records what the reference site actually does, compares it with Calesta, and separates:

- **Copy** — safe to mirror directly.
- **Adapt** — useful pattern, but Calesta needs its own rules.
- **Keep** — Calesta already does this better or is explicitly required to differ.
- **Conflict** — the reference contradicts an approved Calesta requirement; needs a decision.
- **Reject** — a reference bug or pattern Calesta should not copy.

No production code is changed by this document.

---

## 2. Reference site profile

Observed from the live storefront and its public GraphQL API:

| Area | weYOUNG behavior |
| --- | --- |
| Platform | Riverbase 4.2.2, Next.js App Router, shadcn/ui |
| Locales | `/en` and `/km` |
| Currency | USD (observed) |
| Products | 19 products, categories, variants/options, combo sets |
| Cart mode | `BOTH` — product detail cart and quick cart |
| Fulfillment | `BOTH` — delivery and in-store pickup |
| Shipping model | `DISTANCE`, max 600 km, fixed $1.50 rule; VET and J&T options at $1.50 |
| Free delivery | Automatic “$40+ Free Delivery” shipping discount, force-applied |
| Discount policy | `ALLOW_COMBINING`; coupons and offers |
| Online COD | Disabled (`codPayment: false`) |
| Payment | Card via connected payment gateway |
| Guest checkout | Supported (`orderCreateGuest`) |
| Identity | “Continue with KID” (Riverbase identity) |
| Unpaid order TTL | 10 minutes for guest and registered orders |
| Order statuses | `PENDING`, `PROCESSING`, `CANCELLED`, `COMPLETED` |
| Delivery statuses | `PENDING`, `PROCESSING`, `CANCELLED`, `COMPLETED`, `PARTIAL` |
| Payment statuses | `PENDING`, `DEPOSIT_PAID`, `PARTIALLY_PAID`, `FULLY_PAID`, `PAID`, `OVERDUE` |
| Order activity | Full activity log, cancellation reasons, restore-cancelled-order |
| Stock | Stock debit per fulfillment/payment type, order stock ledger |
| Notifications | In-app notification center |
| Reviews / wishlist / journal / newsletter | Not present on the storefront |
| Public order tracking | Not present; “My Orders” is the tracking surface |

---

## 3. Observed customer workflows

### 3.1 Browse and product

1. Home page: announcement bar, hero, new products, categories, brand story, footer.
2. Bottom navigation on mobile: Home, Products, Search, My Cart, You.
3. Products page: category pills, “All Products”, product grid, “All 18 items loaded” (no pagination).
4. Product card: image carousel, stock/out-of-stock badge, name, price.
5. Product detail: image carousel, “Only X left” urgency, quantity stepper, **Add to Cart**, **Buy Now**, product details, variant/options where applicable.
6. Search: dedicated search page with “All” and “Hot Deals”, category shortcuts, promotions link.

### 3.2 Cart

1. “My Cart” opens a **drawer**, not a page.
2. Drawer shows “Your Items (N)”, each item with quantity controls and remove, and a total.
3. Actions: **Cancel**, **Checkout**, **Close**.
4. Empty cart still shows a **Checkout** button (reference bug; do not copy).
5. Cart badge updates immediately.

### 3.3 Checkout

Observed page at `/en/checkout`:

1. **Pickup / Delivery** selector.
2. Delivery mode: Province, District, Address, Phone Number.
3. Pickup mode: store pickup address + “View Map”, Phone Number.
4. **Payment Method**: Card (Recommended), only one method observed.
5. **Summary**: line items, subtotal, delivery fee (“Calculating…” until address is complete), total.
6. **Notes** for the shop.
7. **Use offers and more** / **Offers**.
8. Primary action: **Pay Now**.
9. Validation gate text: “Add a delivery address to continue” or “Enter your phone number to continue”.
10. Guest checkout is supported by the API; no account wall was observed before checkout.

> Reference bug: the Pickup/Delivery labels and the rendered address panel were inverted during the review. Calesta should copy the intent, not the bug.

### 3.4 Payment and shipping rules

- Card is the only storefront payment method observed.
- Online COD is disabled in the reference shop configuration.
- Shipping is distance-based with a fixed $1.50 rule inside 600 km; VET and J&T are the configured delivery options.
- Orders over $40 get free delivery through an automatic shipping discount.
- There is no separate VAT line in the observed checkout summary.
- Unpaid orders expire after 10 minutes.
- Payment is processed through a connected gateway; the API exposes `processPayment` and `processGuestPayment`.

### 3.5 Orders and account

1. “You” tab → Profile.
2. Profile sections: **My Orders** (“Track your orders”), **My account**, **My Addresses**.
3. My Orders: empty state with “Browse Products”; no public tracking-by-order-number flow.
4. Account requires “Continue with KID”; profile and saved addresses are behind that identity.
5. Order model supports:
   - order status, delivery status, payment status;
   - cancellation reasons and cancelled-by actor;
   - restore cancelled order;
   - order activity log;
   - order stock ledger;
   - credit/COD payment recording.
6. Customers can cancel their own unpaid orders (`cancelMyUnpaidOrder`).

### 3.6 Promotions, notifications, and search

- Promotions page (`/en/promotions`) with “Hot Deals”.
- Automatic and coupon-based discounts; combining is allowed.
- In-app notifications (`/en/notifications`).
- Search page with category shortcuts and hot deals.
- No product reviews, wishlist, journal, or newsletter on the storefront.

---

## 4. Side-by-side parity matrix

| Workflow | weYOUNG | Calesta today | Decision | Notes |
| --- | --- | --- | --- | --- |
| Product grid | Category pills, simple grid | Rich shop filters, sort, search facets | **Keep + adapt** | Calesta is stronger; add reference-style quick actions |
| Product detail | Quantity, Add to Cart, Buy Now, stock urgency, variants | Quantity, Add to Bag, reviews, related products | **Adapt** | Add Buy Now, stock urgency, variant selector |
| Cart surface | Drawer | Dedicated cart page | **Adapt** | Add a drawer while keeping the cart page |
| Cart coupon | Offers/coupons | Coupon field | **Keep** | Calesta’s coupon UX is already explicit |
| Cart empty state | Checkout still enabled | Checkout disabled/empty state | **Keep** | Do not copy the reference bug |
| Checkout identity | Guest allowed | Account required | **Conflict** | v1 scope says no guest checkout |
| Address | Province, District, Address, Phone | PP/province, khan/province, house/street, postal, phone, name, email | **Conflict** | Reference is simpler; Calesta has approved fields |
| Fulfillment | Pickup + delivery | Delivery only | **Conflict** | Pickup is a real workflow gap |
| Shipping fee | Fixed $1.50, free over $40 | $8.95, free over $75 | **Conflict** | Business rule difference |
| VAT | No separate line | 10% VAT line | **Keep Calesta** | Approved requirement |
| Payment | Card only | COD, ABA PayWay, Bakong, card | **Keep Calesta** | Approved requirement; reference disables online COD |
| Payment status | Rich statuses + partial/deposit/overdue | `UNPAID` / `PAID` | **Adapt** | Add pending/partial/overdue only if needed |
| Order statuses | PENDING, PROCESSING, CANCELLED, COMPLETED | PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED | **Conflict** | Calesta’s fulfillment statuses are more explicit |
| Delivery status | Separate field | Folded into order status | **Adapt** | Add separate delivery status if pickup/delivery ships |
| Order activity log | Full audit trail | None | **Copy** | Valuable for support and trust |
| Cancel unpaid order | Customer self-service | Not exposed | **Copy** | Small, high-value workflow |
| Restore cancelled order | Admin restore with preview | Re-activate status restores stock | **Adapt** | Calesta already restocks; add preview/activity |
| Order notes | Checkout notes | Schema field, no checkout capture | **Copy** | Add notes to checkout and admin |
| Saved addresses | My Addresses | Address book in checkout | **Keep + adapt** | Calesta has the model; add account surface |
| Notifications | In-app center | None | **Copy** | Good post-order engagement |
| Promotions page | Hot Deals + offers | Coupons only | **Adapt** | Add offers surface if discounts expand |
| Search | Search page + categories + hot deals | Ranking search, facets, suggestions | **Keep Calesta** | Calesta search is more capable |
| Auth | KID identity | Email/password + Google | **Keep Calesta** | Approved requirement |
| Reviews | None | Moderated reviews | **Keep Calesta** | Differentiator |
| Wishlist | None | Device-local wishlist | **Keep Calesta** | Differentiator |
| Journal | None | Journal list/detail | **Keep Calesta** | Differentiator |
| Newsletter | None | Home subscribe + admin | **Keep Calesta** | Differentiator |
| Public tracking | None | Order number + email | **Keep Calesta** | Better customer support |
| Currency | USD only | USD ledger + KHR display | **Keep Calesta** | Approved requirement |
| Language | EN/KM | EN/KM | **Copy** | Already aligned |
| Visual identity | Black/white, Comfortaa, bottom nav | Quiet Ledger, dark green, hairline borders | **Keep Calesta** | Copy interaction patterns, not brand identity |
| Product variants | Variants/options | Schema only, no selector | **Copy** | Real gap |
| Stock urgency | “Only X left” | Stock hidden except sold-out | **Copy** | Small conversion improvement |
| Buy Now | Direct checkout | Add to bag only | **Copy** | Small conversion improvement |
| Unpaid order expiry | 10 minutes | No expiry | **Consider** | Prevents stale stock holds |
| Delivery options | VET / J&T | One standard method | **Conflict** | Calesta requirement says exactly one method |

---

## 5. Conflicts with approved Calesta requirements

These cannot be “copied” without changing earlier decisions. Each needs an explicit choice.

| # | Conflict | weYOUNG | Calesta approved requirement |
| --- | --- | --- | --- |
| C-01 | Guest checkout | Supported | Guest checkout is out of scope for v1 |
| C-02 | Payment methods | Card only; online COD disabled | COD, ABA PayWay, Bakong, card |
| C-03 | Address fields | Province, district, address, phone | Phnom Penh/province, khan/province, house/street, phone, postal optional |
| C-04 | Fulfillment | Pickup + delivery | Exactly one shipping method; delivery only |
| C-05 | Shipping fee | $1.50 fixed, free over $40 | Standard $8.95, free over $75 |
| C-06 | Tax | No VAT line | 10% VAT line |
| C-07 | Order statuses | PENDING, PROCESSING, CANCELLED, COMPLETED | PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED |
| C-08 | Reviews/wishlist/public tracking | Not present | Required Calesta differentiators |
| C-09 | Auth | KID identity | Email/password + Google OAuth |
| C-10 | Currency | USD only | USD ledger + KHR display |

**The important distinction:** copying weYOUNG’s *interaction patterns* is safe. Copying its *business rules* would overwrite Calesta’s approved requirements.

---

## 6. Recommended strategy

**Recommendation: copy the workflow patterns, keep Calesta’s business rules.**

Copy these now because they are additive and do not contradict the approved scope:

1. **Buy Now** on product detail.
2. **Cart drawer** alongside the cart page.
3. **Stock urgency** (“Only X left”) using `stockCount` / `lowStockThreshold`.
4. **Variant selector** using the existing `ProductVariant` model.
5. **Order notes** at checkout and in admin.
6. **Order activity log** (created, status changed, payment changed, cancelled, restored).
7. **Customer cancel-unpaid-order** with a reason.
8. **In-app notifications** for order status changes.
9. **Saved addresses** surfaced in the account area.
10. **Delivery status** separate from order status.
11. **Cancellation reasons** and admin restore preview.
12. **Offers/promotions surface** if the coupon engine grows.

Do **not** copy:

- The inverted Pickup/Delivery label bug.
- Empty-cart checkout.
- Card-only payments.
- Guest checkout unless the scope changes.
- KID auth.
- USD-only pricing if KHR display is required.
- Removal of reviews, wishlist, journal, newsletter, or public tracking.
- The reference brand identity or assets.

---

## 7. Proposed implementation slices

Each slice stays inside the two-day rule from `PROJECT-SCOPE.md`.

| Slice | Scope | Outcome | Est. |
| --- | --- | --- | --- |
| W-1 | Product/cart parity: Buy Now, cart drawer, stock urgency, variant selector | Faster add-to-cart and direct checkout | 1–2 days |
| W-2 | Checkout parity: order notes, saved addresses, pickup/delivery decision, province/district decision | Closer checkout flow without breaking Calesta rules | 2 days |
| W-3 | Order lifecycle: delivery status, activity log, cancel-unpaid, cancellation reasons, restore preview | Supportable order operations | 2–3 days |
| W-4 | Notifications and offers surface | Post-order engagement and promotions | 2 days |
| W-5 | Admin parity: activity timeline, stock ledger, payment status actions | Operational visibility | 2 days |
| W-6 | Tests, browser smoke, docs | Regression safety | 1 day |

W-2 and W-3 contain the conflicts above and should not start until those are decided.

---

## 8. Decision log

| Decision | Options | Chosen | Date |
| --- | --- | --- | --- |
| D-01 Source of truth | Copy patterns vs exact clone | Copy interaction patterns; keep Calesta business rules | 2026-11-06 |
| D-02 Guest checkout | Keep account-only vs add guest | Keep account-only (guest checkout out of scope) | 2026-11-06 |
| D-03 Payment methods | Keep four methods vs card-only | Keep COD, ABA PayWay, Bakong, card | 2026-11-06 |
| D-04 Address model | Keep Calesta fields vs province/district/phone | Keep Phnom Penh/province, khan/province, house/street, phone; postal optional | 2026-11-06 |
| D-05 Pickup | Add pickup vs delivery-only | Delivery-only, one standard method | 2026-11-06 |
| D-06 Shipping fee | Keep $8.95/$75 vs $1.50/$40 | Keep $8.95 standard, free over $75 | 2026-11-06 |
| D-07 Order statuses | Keep six vs reference four | Keep PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED | 2026-11-06 |
| D-08 Differentiators | Keep reviews/wishlist/tracking vs remove | Keep reviews, wishlist, journal, newsletter, public tracking | 2026-11-06 |

---

## 8.1 Implementation status (2026-11-06)

The safe interaction-pattern slices are implemented and browser-smoke-tested. Business-rule conflicts remain deliberately unchanged.

| Slice | Status | Notes |
| --- | --- | --- |
| W-1 Product/cart | Done | Buy Now, stock urgency, quantity caps, share/copy link, cart drawer cancel, variant-aware line keys, live cart badge |
| W-2 Checkout | Done (adapted) | Order notes (500 max), coupon/offers block, recommended card badge, Pay Now vs Place Order, saved addresses in account; pickup and single-page checkout rejected |
| W-3 Order lifecycle | Partially done | Customer cancel-unpaid with restock/coupon release, active/past filters, payment-status chips; activity log, cancellation reasons, restore preview, separate delivery status still open |
| W-4 Notifications/offers | Partially done | Offers/coupon surface at checkout; in-app order notifications still open |
| W-5 Admin parity | Partially done | Mark-as-paid action in order drawer; activity timeline, stock ledger, restore preview still open |
| W-6 Tests/docs | Done | Backend order tests, frontend store test, tsc/build/audit, browser smoke, this document |

Still intentionally different from weYOUNG: account-only checkout, four payment methods, Calesta address fields, one delivery method, $8.95/$75 shipping, 10% VAT, six order statuses, USD ledger with KHR display, and retained reviews/wishlist/journal/newsletter/public tracking.

---

## 9. Evidence notes

- Reference pages inspected: `/en`, `/en/products`, product detail, `/en/checkout`, `/en/search`, `/en/profile`, `/en/profile/orders`, `/en/profile/account`.
- Public GraphQL introspection used for workflow names and enums; no orders were created and no customer data was modified.
- Reference shop modules observed: `shopping: true`, `stocking: true`, `cartMode: BOTH`, `codPayment: false`, `showProductFilter: true`, `shippingModel: DISTANCE`, `operationalMode: BOTH`.
- Reference shipping rule observed: fixed $1.50 for 0–600 km; delivery options VET and J&T at $1.50; free-delivery discount at $40.
- Reference order statuses and payment statuses observed from the public schema.
