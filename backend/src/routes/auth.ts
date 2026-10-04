import { Router } from 'express'
import { register, login, refreshAccessToken, logout, getMe, changePassword, googleAuth, googleCallback } from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refreshAccessToken)
router.post('/logout', logout)
router.get('/me', authenticate, getMe)
router.patch('/change-password', authenticate, changePassword)

// Google OAuth2 — the consent redirect must bypass the auth rate limiter
router.get('/google', googleAuth)
router.get('/google/callback', googleCallback)

export default router
