import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createOrder, getMyOrders, getOrderById, updateOrderStatus, getAllOrders, updateTrackingNumber, trackOrder } from '../controllers/orderController'
import { authenticate, requireAdmin } from '../middleware/auth'

const router = Router()

// Public order lookup — a stricter cap than the global limiter because the
// endpoint takes an order number + email pair that could be guessed at.
const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_TRACK_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many tracking attempts, please try again in 15 minutes.' },
})

router.post('/track', trackLimiter, trackOrder)

router.use(authenticate)
router.post('/', createOrder)
router.get('/my', getMyOrders)
router.get('/:id', getOrderById)
router.get('/', requireAdmin, getAllOrders)
router.patch('/:id/status', requireAdmin, updateOrderStatus)
router.patch('/:id/tracking', requireAdmin, updateTrackingNumber)

export default router
