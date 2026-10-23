# 🌸 Lumière — Premium Skincare & Beauty Platform

A full-stack, production-ready e-commerce platform for premium skincare, built with modern technologies and a luxurious aesthetic.

---

## ✨ Tech Stack

### Frontend (`/frontend`) — Port 3000
- **React 18** + **TypeScript**
- **Vite** (fast build tooling)
- **Tailwind CSS** (utility-first styling)
- **Framer Motion** — page transitions, card animations, parallax
- **GSAP** — hero animations, scroll-triggered effects
- **Lenis** — buttery smooth scrolling
- **AOS** (Animate On Scroll) — section reveal animations
- **Zustand** — lightweight global state (cart, wishlist, UI)
- **React Router v6** — client-side routing
- **Swiper** — product/testimonial carousels
- **Lucide React** — icon system
- **Vitest + Testing Library** — unit and component tests (jsdom)
- **Route-level code splitting** — pages load on demand; vendor chunks
      (React, Motion, GSAP, Recharts) are cached across deploys

### Admin Dashboard (`/admin`, port 3001)
- **JWT-protected admin login gate** (admin role required)
- All pages wired to the live API — no demo data
- KPI stat cards with real month-over-month deltas
- Revenue area chart + revenue sparkline (Recharts, real data)
- Catalog mix donut from live category counts
- Top products table with real sales figures
- Recent orders feed with live statuses
- **Products CRUD** — search, category filter, pagination, add/edit drawer with image previews and **file upload**, delete
- Cart is **persisted across page reloads** (localStorage)
- **Inventory** — stock levels with per-product low-stock thresholds, one-click
  restock, out-of-stock + low-stock KPIs, and the number of customers waiting
  for each product
- **Orders** — server-side status filter tabs, search, inline status update (persists), order detail drawer, CSV export
- **Customers** — live customer list with verification status
- **Analytics** — 7/30/90-day, this-month, last-month and custom date ranges;
  revenue trend, status mix, top products and collection revenue, each compared
  with the previous period
- **CSV exports** — orders, products, customers, and reviews as UTF-8
  attachments (BOM for Excel, proper quoting) straight from the API
- **Reviews** — approve / unpublish / delete, verified purchase badges, rating recalculation
- **Journal** — create, edit, publish/draft, delete posts
- **Coupons** — create percentage/fixed codes, activate/deactivate, usage tracking
- **Settings** — profile editing, password change, store info, sign out

### Backend (`/backend`) — Port 5001
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** — type-safe database queries
- **PostgreSQL** via **Neon** (serverless cloud DB)
- **JWT** auth with refresh token rotation
- **bcryptjs** — password hashing
- **Helmet** + **CORS** + **Rate limiting** — security
- **Zod** — request validation
- **Stripe** — payment processing (ready)
- **Nodemailer** — transactional emails (order confirmation, newsletter welcome; gracefully logs when unconfigured)
- **Multer** — local image uploads at `POST /api/uploads` (admin-only, served at `/uploads`)

---

## 🗂️ Project Structure

```
lumiere-skincare/
├── frontend/          # Customer-facing storefront
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/    # Navbar, Footer, CartSidebar, Layout
│   │   │   ├── sections/  # Hero, Featured, Categories, Testimonials...
│   │   │   └── ui/        # ProductCard, reusable components
│   │   ├── pages/         # Home, Shop, Product, Cart, Checkout, About, Journal
│   │   ├── lib/           # store.ts (Zustand), data.ts, utils.ts
│   │   ├── hooks/         # useLenis (smooth scroll)
│   │   ├── types/         # Full TypeScript type definitions
│   │   └── styles/        # globals.css with Tailwind + custom
│   └── ...
│
├── admin/             # Admin dashboard
│   ├── src/
│   │   ├── components/layout/  # Sidebar, AdminHeader, AdminLayout
│   │   └── pages/             # Dashboard, Products, Orders
│   └── ...
│
└── backend/           # REST API
    ├── prisma/
    │   ├── schema.prisma  # Full DB schema (10+ models)
    │   └── seed.ts        # Sample data seeder
    └── src/
        ├── controllers/   # authController, productController, orderController...
        ├── middleware/     # auth.ts (JWT), errorHandler.ts
        ├── routes/        # auth, products, orders, cart, reviews, blog...
        ├── lib/           # prisma.ts singleton
        └── index.ts       # Express server entry
```

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone <your-repo>
cd lumiere-skincare
npm run install:all
```

### 2. Set Up Database

**Option A — Local PostgreSQL (fastest for development):**

```bash
brew install postgresql@17
brew services start postgresql@17
createdb lumiere
```

Set `DATABASE_URL="postgresql://<you>@localhost:5432/lumiere?schema=public"` in `backend/.env`.

**Option B — Neon (cloud):**

1. Go to [neon.tech](https://neon.tech) → Create free account
2. Create a new project → Copy your **Connection String**
3. Create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

4. Fill in your values in `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/lumiere?sslmode=require"
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
STRIPE_SECRET_KEY=sk_test_...

# Google sign-in (optional)
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
FRONTEND_URL=http://localhost:3003
```

> **Google sign-in:** in your Google Cloud console (Credentials → OAuth client),
> add the backend callback to **Authorized redirect URIs**:
> `http://localhost:5001/api/auth/google/callback` (adjust the port to wherever
> the backend runs). The *JavaScript origins* entry is only needed for Google's
> popup sign-in mode — this app uses the server-side redirect flow.

### 3. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Neon
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Run Development Servers

```bash
# All three servers simultaneously
npm run dev

# Or individually:
npm run dev:backend    # API on :5001
npm run dev:frontend   # Store on :3000
npm run dev:admin      # Admin on :3001 (console at /admin)
```

---

## 🔑 Default Credentials (after seed)

| Role     | Email                  | Password          |
|----------|------------------------|-------------------|
| Admin    | admin@lumiere.com      | Admin@lumiere123  |
| Customer | sophie@example.com     | User@lumiere123   |

---

## 🧪 Testing

### Backend — 170 end-to-end tests
```bash
# Start the API and seed the database first (see Getting Started)
cd backend
npm test
```

The suite exercises every feature against a real PostgreSQL database and running
API: auth & token rotation, password reset, products/categories/blog CRUD, search
ranking and typo tolerance, orders with coupon math, shipping and stock handling,
cart, reviews with moderation, wishlist, addresses, newsletter, coupons, uploads,
role guards, payments config, and the business-workflow rules (order cancellation
restocks, coupon usage limits, slug/category guards).

One test is skipped when Google OAuth credentials are absent; everything else
runs offline. Test runs create throwaway fixtures — clean them afterwards:

```bash
cd backend
npm run db:clean
```

### Storefront — 23 unit & component tests
```bash
cd frontend
npm test          # single run (CI)
npm run test:watch
```
Vitest + Testing Library run in jsdom and cover currency conversion, the Khmer/
English dictionary, catalog normalisation, cart/wishlist state & persistence, and
the review section (summary, verified badges, validation, moderation state).

### Continuous integration
`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

| Job | What it does |
| --- | --- |
| **Backend** | Postgres 17 service → `prisma db push` → seed → `tsc` → boots the API → full test suite |
| **Storefront** | `npm ci` → Vitest → `tsc` + production build |
| **Admin** | `npm ci` → `tsc` + production build |

The backend job uploads the API log as an artifact when tests fail. The same
steps can be reproduced locally with a scratch database, e.g.
`createdb lumiere_ci` + `DATABASE_URL=… npm run db:push && npm run db:seed`.

---

## 🛒 Features

### Customer Storefront
- ✅ Hero section with parallax mouse tracking
- ✅ Animated marquee ticker (Framer Motion)
- ✅ Featured products grid with hover effects
- ✅ Category grid with asymmetric layout
- ✅ Brand story section with scroll parallax
- ✅ Testimonials with horizontal scroll animation
- ✅ Journal/blog preview section
- ✅ Instagram-style image grid
- ✅ Newsletter signup with discount offer
- ✅ Smooth Lenis scrolling
- ✅ AOS reveal animations on scroll
- ✅ Cart sidebar with slide animation (Framer Motion)
- ✅ Mobile menu with clip-path reveal animation
- ✅ Shop page with filters, sort, category pills
- ✅ Product detail with image gallery, accordion, related products
- ✅ Cart page with coupon input
- ✅ Multi-step checkout: Cambodia-only shipping with province picker and
      validation, one standard delivery method (free over $75), payment via
      Credit/Debit Card, ABA PayWay, or Bakong (KHQR), order confirmation step
- ✅ Sign in with Google (OAuth2) + password strength meter on signup
- ✅ English / ខ្មែរ toggle — storefront chrome, dates, and category labels
      localized; the choice is persisted per browser
- ✅ USD / KHR dual pricing — switch currencies in the header; product cards
      show the secondary amount. Rate configurable via `VITE_USD_TO_KHR`
      (default 4,100 riel per dollar)
- ✅ Account page (/account): profile, order history, spending stats
- ✅ Order tracking timeline with tracking number once an order ships
- ✅ Product reviews — rating summary with 5-star distribution, approved review
      list with verified-purchase badges, and a moderated write form (one review
      per customer; verified buyers are marked automatically)
- ✅ Wishlist — heart products from any product page; saved items persist on the
      device and live on their own /wishlist page, including sold-out saves
- ✅ Catalog search — typo-tolerant matching across names, taglines, tags,
      categories, descriptions and ingredients, with relevance ranking,
      category/price/rating filters, facet counts, and a "did you mean" hint.
      The header search icon opens a live typeahead overlay
- ✅ "Email me when it's back" on sold-out products — the customer is emailed
      automatically the moment stock returns
- ✅ Password reset by emailed link (single-use, 1-hour expiry)
- ✅ Silent token refresh — expired sessions recover without re-login
- ✅ About page with timeline
- ✅ Journal listing page
- ✅ 404 page
- ✅ Wishlist (Zustand, persistent in session)
- ✅ Custom scrollbar + CSS animations

### Admin Dashboard
- ✅ KPI stat cards with trend indicators
- ✅ Revenue area chart (Recharts)
- ✅ Sales by category donut chart
- ✅ Top products table
- ✅ Recent orders feed
- ✅ Products CRUD table with search, filter, pagination
- ✅ Product add/edit slide-out drawer with image upload UI
- ✅ Orders table with status filter tabs, inline status update
- ✅ Sidebar navigation with active states

### Backend API
- ✅ JWT auth (access + refresh token rotation)
- ✅ Register / Login / Logout / Change password
- ✅ Google OAuth2 sign-in (`GET /api/auth/google` → consent → `/api/auth/google/callback`)
- ✅ Products: CRUD, filtering, pagination, related
- ✅ Search: relevance ranking + typo tolerance (Levenshtein), facet counts
      (category, price, rating), and `GET /api/products/suggest?q=` typeahead
- ✅ Categories: CRUD
- ✅ Orders: create, list, detail, status update (cancel restocks stock)
- ✅ Cart: server-side sync for authenticated users
- ✅ Reviews: create, list, verified purchase badge
- ✅ Wishlist: add/remove per user
- ✅ Addresses: manage shipping addresses (Cambodia-only validation)
- ✅ Blog: CRUD, published/draft
- ✅ Coupons: validate, percentage/fixed discount
- ✅ Newsletter: subscribe/unsubscribe
- ✅ Admin dashboard stats endpoint
- ✅ Rate limiting, CORS, Helmet security

---

## 🎨 Design System

### Colors
| Token           | Value     | Usage                    |
|-----------------|-----------|--------------------------|
| Cream primary   | `#faf0e4` | Page background          |
| Gold accent     | `#c9a96e` | CTAs, highlights, links  |
| Sage            | `#6f8a4a` | Success, nature, badges  |
| Charcoal        | `#1a1a1a` | Text, buttons, dark areas|
| Blush           | `#e85050` | Sale badges, wishlist    |

### Typography
- **Display:** Playfair Display (headings, brand, editorial)
- **Body:** DM Sans (UI, paragraphs, labels)
- **Accent:** Cormorant Garamond (italic callouts, taglines)

### Animations
- **Framer Motion:** Page transitions, cart sidebar, mobile menu, card hovers, stat reveals
- **GSAP:** Hero parallax, scroll-driven effects
- **Lenis:** Native-feel smooth scrolling
- **AOS:** Section entrance animations
- **CSS:** Marquee ticker, floating product images, shimmer effects

---

## 🌐 API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/products?page&limit&category&minPrice&maxPrice&rating&sortBy&search
GET    /api/products/suggest?q=          (typeahead + "did you mean")
GET    /api/products/:slug
GET    /api/products/:id/related
POST   /api/products/:id/stock-notification   (notify me when back in stock)
POST   /api/products          (admin)
PUT    /api/products/:id      (admin)
DELETE /api/products/:id      (admin)

GET    /api/categories
POST   /api/categories        (admin)

GET    /api/orders/my
GET    /api/orders/:id
POST   /api/orders
GET    /api/orders            (admin)
PATCH  /api/orders/:id/status (admin)

GET    /api/cart
POST   /api/cart
PATCH  /api/cart/:productId
DELETE /api/cart/:productId
DELETE /api/cart

POST   /api/reviews
GET    /api/reviews/product/:productId        (approved list + rating summary)
GET    /api/reviews/product/:productId/mine   (the signed-in customer's review)

GET    /api/blog
GET    /api/blog/:slug
POST   /api/blog              (admin)

POST   /api/newsletter/subscribe
POST   /api/newsletter/unsubscribe

POST   /api/coupons/validate
GET    /api/coupons           (admin)
PATCH  /api/coupons/:id       (admin)
POST   /api/uploads           (admin, image upload)

GET    /api/admin/stats       (admin)
GET    /api/admin/inventory?lowStock=1        (admin)
PATCH  /api/admin/inventory/:id               (admin — stock, threshold, inStock)
GET    /api/admin/analytics?from&to           (admin)
GET    /api/admin/export/:type?from&to        (admin — orders|products|customers|reviews CSV)

GET    /api/users/me
PATCH  /api/users/me
GET    /api/users/wishlist
POST   /api/users/wishlist/:productId
DELETE /api/users/wishlist/:productId
GET    /api/users/addresses
POST   /api/users/addresses
```

---

## 🚢 Deployment

### Frontend / Admin → Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend && vercel --prod

# Deploy admin
cd admin && vercel --prod
```

### Backend → Railway / Render / Fly.io
```bash
# Build
npm run build:backend

# Set environment variables in your hosting dashboard
# Start: node dist/index.js
```

### Database → Neon (already cloud-hosted!)

---

## 📄 License

MIT © 2025 Lumière Beauty. Built with ❤️ and caffeine.
