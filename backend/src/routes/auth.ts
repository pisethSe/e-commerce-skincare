import { Router } from 'express'
import { register, login, refreshAccessToken, logout, getMe, changePassword } from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refreshAccessToken)
router.post('/logout', logout)
router.get('/me', authenticate, getMe)
router.patch('/change-password', authenticate, changePassword)

export default router
