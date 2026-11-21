# Calesta — Skincare & Beauty

Calesta is a full-stack e-commerce platform for a premium skincare brand. It includes a localized customer storefront, a live admin console, and a PostgreSQL-backed REST API.

## Applications

| Application | Technology | Local port |
| --- | --- | --- |
| [Storefront](frontend/) | React, TypeScript, Vite, Zustand | `3000` |
| [Admin console](admin/) | React, TypeScript, Vite, Recharts | `3001` |
| [REST API](backend/) | Node.js, Express, TypeScript, Prisma | `5001` |

## Storefront

- Responsive product catalog with search, filters, sorting, categories, and pagination
- English and Khmer interface with persisted language preference
- USD and Khmer Riel pricing
- Product details, related products, reviews, verified-purchase badges, and wishlists
- Persistent cart and server-synchronized cart for signed-in customers
- Cambodia-focused checkout with Phnom Penh and provincial delivery locations
- Cash on delivery, ABA PayWay, KHQR, and card payment flows
- Public order tracking by order number and checkout email
- Account profile, order history, saved addresses, password reset, and Google OAuth
- Back-in-stock notifications, coupons, newsletter, journal, and SEO metadata

## Admin Console

- JWT-protected access for administrator accounts
- Dashboard KPIs, revenue trends, sales mix, inventory alerts, and recent orders
- Product, category, customer, review, coupon, journal, and order management
- Image uploads, stock thresholds, restocking, and low-stock reporting
- Order status updates, tracking numbers, order details, and CSV exports
- Analytics for custom and preset date ranges

## API

The API provides endpoints for authentication, products, search, categories, cart, orders, reviews, wishlists, addresses, payments, journal posts, coupons, newsletter subscriptions, uploads, and admin reporting.

### Authentication

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/google` | Public |
| `POST` | `/api/auth/refresh` | Public |
| `POST` | `/api/auth/logout` | Authenticated |
| `GET` | `/api/auth/me` | Authenticated |

### Products and Catalog

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/products` | Public |
| `GET` | `/api/products/suggest?q=` | Public |
| `GET` | `/api/products/:slug` | Public |
| `GET` | `/api/products/:id/related` | Public |
| `POST` | `/api/products/:id/stock-notification` | Public |
| `POST`, `PUT`, `DELETE` | `/api/products...` | Admin |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/categories...` | Public read, admin write |

### Orders and Payments

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/orders/track` | Public |
| `GET`, `POST` | `/api/orders` | Customer or public creation |
| `GET` | `/api/orders/:id` | Authenticated |
| `PATCH` | `/api/orders/:id/status` | Admin |
| `PATCH` | `/api/orders/:id/tracking` | Admin |
| `GET` | `/api/payments/config` | Public |
| `POST` | `/api/payments/create-intent` | Authenticated |

Health check: `GET /health`

## Tech Stack

- **Frontend:** React 18, React Router, TypeScript, Vite, Zustand, Tailwind CSS
- **Admin:** React 18, Recharts, TypeScript, Vite
- **Backend:** Node.js, Express 5, TypeScript, Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT access/refresh tokens, bcrypt, Google OAuth
- **Payments:** Stripe, ABA PayWay, Bakong/KHQR
- **Media:** Multer uploads and Cloudinary configuration
- **Notifications:** Nodemailer and Telegram
- **Testing:** Vitest, Testing Library, Node test runner

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL 17 or a hosted PostgreSQL database such as Neon

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/pisethSe/e-commerce-skincare.git
cd e-commerce-skincare
npm run install:all
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
```

Set `DATABASE_URL` to a PostgreSQL connection string and use strong values for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lumiere?schema=public"
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-random-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

### 3. Initialize PostgreSQL

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Start the applications

```bash
npm run dev
```

The storefront, admin console, and API start on ports `3000`, `3001`, and `5001` respectively. Individual commands are also available:

```bash
npm run dev:frontend
npm run dev:admin
npm run dev:backend
```

## Demo Accounts

Seeded accounts are for local development only.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@lumiere.com` | `Admin@lumiere123` |
| Customer | `sophie@example.com` | `User@lumiere123` |

Change or remove demo credentials before deploying to production.

## Environment Variables

### Backend

The complete template is in [backend/.env.example](backend/.env.example).

Important variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `FRONTEND_URL` | Storefront origin for CORS and redirects |
| `ADMIN_URL` | Admin origin for CORS |
| `ALLOWED_ORIGINS` | Optional comma-separated additional origins |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google OAuth |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe payments |
| `ABA_PAYWAY_PROFILE_ID`, `ABA_PAYWAY_SECRET_KEY`, `ABA_PAYWAY_API_BASE` | ABA PayWay |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | Telegram notifications |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | Transactional email |

### Storefront

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend API origin |
| `VITE_SITE_URL` | Public storefront URL for SEO metadata |
| `VITE_USD_TO_KHR` | USD-to-KHR display rate; defaults to `4100` |

### Admin

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend API origin |

## Testing

### Backend

Requires a running PostgreSQL instance:

```bash
cd backend
npm run db:push
npm run db:seed
npm run build
npm test
```

The API tests cover authentication, authorization, catalog, checkout, order workflows, reviews, payments, tracking, uploads, and security behavior.

### Storefront

```bash
cd frontend
npm test
npm run build
```

### Admin

```bash
cd admin
npm test
npm run build
```

GitHub Actions runs backend integration tests with PostgreSQL 17 and builds and tests the frontend and admin applications.

## Build

Build all applications:

```bash
npm run build
```

Or build one application:

```bash
npm run build:backend
npm run build:frontend
npm run build:admin
```

## Deployment

Deployment definitions are included for [Render](render.yaml) and [Vercel](vercel.json).

- **Backend:** deploy `backend/` as a Node.js web service on Render or another Node host.
- **Storefront:** deploy `frontend/` as a Vite application on Vercel.
- **Admin:** deploy `admin/` as a separate Vite application on Vercel.
- **Database:** use a managed PostgreSQL service and set `DATABASE_URL` at deployment time.
- **Uploads:** configure persistent storage or Cloudinary for production media.

Before production:

1. Replace every seed credential and JWT secret.
2. Set exact frontend and admin origins.
3. Configure payment webhook URLs and callback URLs.
4. Configure SMTP or another mail provider.
5. Run database migrations and seed only when appropriate.
6. Enable HTTPS and review rate limits and CORS origins.

### GitHub Actions deployment

The CI workflow also deploys after every successful push to `main`. It supports manual redeploys from the GitHub **Actions** tab:

1. Open **CI** in Actions.
2. Choose **Run workflow**.
3. Select `all`, `backend`, `storefront`, or `admin`.

Configure these repository secrets before enabling deployment:

| Secret | Provider |
| --- | --- |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook for `calesta-backend` |
| `VERCEL_STOREFRONT_DEPLOY_HOOK_URL` | Vercel deploy hook for the storefront project |
| `VERCEL_ADMIN_DEPLOY_HOOK_URL` | Vercel deploy hook for the admin project |

Create the hooks in each provider's project settings. A Render deploy hook rebuilds and restarts the backend service. Vercel deploy hooks trigger a new storefront or admin deployment. The workflow skips a target when its hook secret is missing.

## Repository Structure

```text
.
├── frontend/              Customer storefront
├── admin/                 Administrator console
├── backend/
│   ├── prisma/            Schema and seed data
│   ├── src/controllers/   HTTP request handlers
│   ├── src/routes/        API route definitions
│   ├── src/middleware/    Authentication and error handling
│   └── tests/             API integration tests
├── docs/                  Product scope and requirements
├── render.yaml            Render backend configuration
└── vercel.json            Storefront Vercel configuration
```

## License

Private project.
