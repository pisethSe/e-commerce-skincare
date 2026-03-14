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

### Admin Panel (`/admin`) — Port 3001
- **React 18** + **TypeScript**
- **Recharts** — revenue, category, orders charts
- **Framer Motion** — smooth transitions
- Full CRUD for Products, Orders management
- Real-time dashboard stats

### Backend (`/backend`) — Port 5000
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** — type-safe database queries
- **PostgreSQL** via **Neon** (serverless cloud DB)
- **JWT** auth with refresh token rotation
- **bcryptjs** — password hashing
- **Helmet** + **CORS** + **Rate limiting** — security
- **Zod** — request validation
- **Stripe** — payment processing (ready)
- **Nodemailer** — transactional emails

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

### 2. Set Up Database (Neon)

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
```

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
npm run dev:backend    # API on :5000
npm run dev:frontend   # Store on :3000
npm run dev:admin      # Admin on :3001
```

---

## 🔑 Default Credentials (after seed)

| Role     | Email                  | Password          |
|----------|------------------------|-------------------|
| Admin    | admin@lumiere.com      | Admin@lumiere123  |
| Customer | sophie@example.com     | User@lumiere123   |

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
- ✅ Multi-step checkout flow
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
- ✅ Products: CRUD, filtering, search, pagination, related
- ✅ Categories: CRUD
- ✅ Orders: create, list, detail, status update
- ✅ Cart: server-side sync for authenticated users
- ✅ Reviews: create, list, verified purchase badge
- ✅ Wishlist: add/remove per user
- ✅ Addresses: manage shipping addresses
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

GET    /api/products?page&limit&category&sortBy&search&featured
GET    /api/products/:slug
GET    /api/products/:id/related
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
GET    /api/reviews/product/:productId

GET    /api/blog
GET    /api/blog/:slug
POST   /api/blog              (admin)

POST   /api/newsletter/subscribe
POST   /api/newsletter/unsubscribe

POST   /api/coupons/validate
GET    /api/coupons           (admin)

GET    /api/admin/stats       (admin)

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
