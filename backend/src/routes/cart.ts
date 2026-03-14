import { Router } from 'express'
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/miscControllers'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)
router.get('/', getCart)
router.post('/', addToCart)
router.patch('/:productId', updateCartItem)
router.delete('/', clearCart)
router.delete('/:productId', removeFromCart)

export default router
