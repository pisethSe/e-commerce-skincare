import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import path from 'path'

import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import categoryRoutes from './routes/categories'
import orderRoutes from './routes/orders'
import cartRoutes from './routes/cart'
import reviewRoutes from './routes/reviews'
import userRoutes from './routes/users'
import blogRoutes from './routes/blog'
import newsletterRoutes from './routes/newsletter'
import couponRoutes from './routes/coupons'
import adminRoutes from './routes/admin'
import uploadRoutes from './routes/uploads'
import { errorHandler, notFound } from './middleware/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// =============================================
// SECURITY MIDDLEWARE
// =============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.ADMIN_URL || 'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})
app.use('/api', limiter)

// Stricter limit for auth (configurable via RATE_LIMIT_AUTH_MAX)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
})

// =============================================
// BODY PARSING
// =============================================
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// =============================================
// LOGGING
// =============================================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// =============================================
// HEALTH CHECK
// =============================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  })
})

// =============================================
// API ROUTES
// =============================================
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/users', userRoutes)
app.use('/api/blog', blogRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/uploads', uploadRoutes)

// Serve uploaded images statically (index.ts is in src/ → ../uploads = backend/uploads)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

// =============================================
// ERROR HANDLING
// =============================================
app.use(notFound)
app.use(errorHandler)

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║     LUMIÈRE API Server Running       ║
  ║     Port: ${PORT}                       ║
  ║     Env:  ${process.env.NODE_ENV?.padEnd(12) || 'development '}          ║
  ╚══════════════════════════════════════╝
  `)
})

export default app
