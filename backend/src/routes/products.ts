import { Router } from 'express'
import {
  getProducts, getProductBySlug, getRelatedProducts,
  createProduct, updateProduct, deleteProduct,
} from '../controllers/productController'
import { authenticate, requireAdmin } from '../middleware/auth'

const router = Router()

router.get('/', getProducts)
router.get('/:slug', getProductBySlug)
router.get('/:id/related', getRelatedProducts)
router.post('/', authenticate, requireAdmin, createProduct)
router.put('/:id', authenticate, requireAdmin, updateProduct)
router.delete('/:id', authenticate, requireAdmin, deleteProduct)

export default router
