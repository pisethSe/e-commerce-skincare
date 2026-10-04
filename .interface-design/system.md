# Calesta Admin — Design System

## Direction and feel
"Quiet Ledger" — flat, clean, dense. The admin matches the storefront's palette
exactly (near-white sage canvas, white cards, deep-green ink) but drops all
decoration: no glass/backdrop-blur, no gradients, no floating color blobs.
The owner chose white background to match the Calesta storefront.

## Depth strategy
- Cards: flat white + 1px hairline border (#e7eae9). No shadows at rest.
- Overlays only get shadow: drawer `0 0 60px rgba(16,45,38,0.14)`, toasts `0 8px 24px`.
- Inset panels (nested content): `#f8f9f8` fill, no shadow.
- Inputs: white fill, 1px `#dfe4e1` border, focus = ink border + 3px `rgba(16,45,38,0.08)` ring.

## Surfaces (one hue, lightness shifts only)
canvas `#f1f3f3` → card `#ffffff` → inset `#f8f9f8` → dark sidebar `#102d26`.
Sidebar is the dark green panel (storefront's button color) — flat, full-height,
with plain text links (no pills, no icon chips).

## Hierarchy decisions
- Type scale ratio ~1.2 on a 13.5px body: 11 micro · 13.5 body · 15.5 h4 · 18 h3 · 22 h2.
- Hierarchy through weight + color, not size: 600/primary `#102d26`, 500/secondary `#3f5650`, 400/muted `#6e7f7b`, faint `#9ca8a5`.
- Micro-labels (`.admin-kicker`): 11px/600 uppercase, tracking 0.08em (NOT the old 0.28em).
- ALL dynamic numbers get `tabular-nums`.
- Headings: tracking -0.01em, normal case.

## Spacing
4px base grid. Cards p-5/p-6, table rows py-3, section gaps gap-5. Tight and even.

## Radius scale
8px buttons/inputs · 10px rows/inset panels · 12px cards/toasts · 14px drawer/dialog.
Avatars and status dots stay round (deliberate friendly accent).

## Key component patterns
- `.btn-admin` — 8px radius, `#102d26` bg, 13.5px/600, px-3.5 py-2, hover `#1a3d33`, press scale 0.98.
- `.btn-admin-outline` — 8px radius, hairline border, hover border → ink.
- `.badge` — 6px radius, 11.5px/600, soft tint + colored dot for statuses.
- Status tints: Pending `#f1f3f3` · Processing `#f7f1de` · Shipped `#ddf0e9` · Delivered `#eaf1e3` · Cancelled `#fdeeee` · Refunded `#fbe9e0` (all with deep, readable text + dot).
- Tables: 11px/600 uppercase th (0.06em) in `#8a9a95`, rows divided by `#f1f3f3`, hover `#f8f9f8`.
- Motion: 150–250ms, ease-out `cubic-bezier(0.23,1,0.32,1)`, only transform/opacity, never from scale(0).

## Data wiring
All admin pages hit the live API via the Vite proxy (no demo data):
`/api/admin/stats`, `/api/products?all=1`, `/api/orders`, `/api/users`, `/api/reviews`,
`/api/blog?all=1`, `/api/coupons`, `/api/users/me`. Auth gate + JWT refresh rotation.
