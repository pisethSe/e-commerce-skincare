import { Router } from 'express'
import { createOrder, getMyOrders, getOrderById, updateOrderStatus, getAllOrders } from '../controllers/orderController'
import { authenticate, requireAdmin } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.post('/', createOrder)
router.get('/my', getMyOrders)
router.get('/:id', getOrderById)
router.get('/', requireAdmin, getAllOrders)
router.patch('/:id/status', requireAdmin, updateOrderStatus)

export default router
