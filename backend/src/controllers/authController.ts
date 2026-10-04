import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'
import { ApiError } from '../middleware/errorHandler'
import { AuthRequest } from '../middleware/auth'

const generateTokens = (userId: string, email: string, role: string) => {
  const jwtSecret = process.env.JWT_SECRET as Secret
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET as Secret
  const accessTokenExpiresIn: SignOptions['expiresIn'] =
    (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '15m'
  const refreshTokenExpiresIn: SignOptions['expiresIn'] =
    (process.env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']) || '7d'

  // Unique jti per token — identical payloads issued in the same second
  // would otherwise collide on the refresh-token primary key
  const accessToken = jwt.sign(
    { id: userId, email, role, jti: randomUUID() },
    jwtSecret,
    { expiresIn: accessTokenExpiresIn }
  )
  const refreshToken = jwt.sign(
    { id: userId, jti: randomUUID() },
    jwtRefreshSecret,
    { expiresIn: refreshTokenExpiresIn }
  )
  return { accessToken, refreshToken }
}

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName } = req.body

  if (!email || !password || !firstName || !lastName) {
    throw new ApiError('All fields are required', 400)
  }
  if (password.length < 8) {
    throw new ApiError('Password must be at least 8 characters', 400)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new ApiError('Email already registered', 409)

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { email, password: hashed, firstName, lastName },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  })

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role)

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { user, accessToken, refreshToken },
  })
}
// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) throw new ApiError('Email and password required', 400)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new ApiError('Invalid credentials', 401)

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new ApiError('Invalid credentials', 401)

  const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role)

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    },
  })
}

// POST /api/auth/refresh
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body
  if (!refreshToken) throw new ApiError('Refresh token required', 400)

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError('Invalid or expired refresh token', 401)
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string }
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, role: true },
  })
  if (!user) throw new ApiError('User not found', 401)

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.email, user.role)

  // Rotate refresh token
  await prisma.refreshToken.delete({ where: { token: refreshToken } })
  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } })
}

// POST /api/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }
  res.json({ success: true, message: 'Logged out successfully' })
}

// GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      avatar: true, role: true, emailVerified: true, createdAt: true,
    },
  })
  res.json({ success: true, data: user })
}

// PATCH /api/auth/change-password
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) throw new ApiError('Both passwords required', 400)
  if (newPassword.length < 8) throw new ApiError('New password must be at least 8 characters', 400)

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) throw new ApiError('User not found', 404)

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new ApiError('Current password is incorrect', 401)

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } })

  res.json({ success: true, message: 'Password changed successfully' })
}

/* ── Google OAuth2 (authorization-code flow, no extra deps) ── */

// GET /api/auth/google — redirect to Google's consent screen
export const googleAuth = (_req: Request, res: Response): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    res.status(501).json({ success: false, message: 'Google sign-in is not configured' }); return
  }
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback'
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}

// GET /api/auth/google/callback — exchange the code, upsert the user, issue JWTs
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003'
  const code = typeof req.query.code === 'string' ? req.query.code : undefined
  const oauthError = typeof req.query.error === 'string' ? req.query.error : undefined

  const backWithError = (message: string) => {
    res.redirect(`${frontendUrl}/auth/callback?status=error&message=${encodeURIComponent(message)}`)
  }

  if (oauthError) {
    backWithError(oauthError === 'access_denied' ? 'Google sign-in was cancelled' : oauthError); return
  }
  if (!code) {
    backWithError('Missing authorization code'); return
  }

  try {
    // Exchange the authorization code for Google tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) throw new Error('Google token exchange failed')
    const googleTokens = (await tokenRes.json()) as { access_token?: string }
    if (!googleTokens.access_token) throw new Error('No access token from Google')

    // Fetch the Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleTokens.access_token}` },
    })
    if (!profileRes.ok) throw new Error('Google profile fetch failed')
    const profile = (await profileRes.json()) as {
      email?: string
      name?: string
      picture?: string
      email_verified?: boolean
    }
    if (!profile.email) throw new Error('No email in the Google profile')

    // Upsert the user by email — Google accounts are verified by definition
    const nameParts = (profile.name ?? '').trim().split(/\s+/).filter(Boolean)
    const firstName = nameParts[0] || 'Google'
    const lastName = nameParts.slice(1).join(' ') || 'User'

    let user = await prisma.user.findUnique({ where: { email: profile.email } })
    if (!user) {
      // Unusable random password — sign-in is only via Google
      user = await prisma.user.create({
        data: {
          email: profile.email,
          password: await bcrypt.hash(randomUUID(), 10),
          firstName,
          lastName,
          avatar: profile.picture,
          emailVerified: true,
        },
      })
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          avatar: user.avatar ?? profile.picture,
          emailVerified: user.emailVerified || Boolean(profile.email_verified),
        },
      })
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role)
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Tokens ride back to the frontend callback page, which stores the session
    res.redirect(
      `${frontendUrl}/auth/callback?status=success` +
        `&accessToken=${encodeURIComponent(accessToken)}` +
        `&refreshToken=${encodeURIComponent(refreshToken)}`,
    )
  } catch (err) {
    backWithError(err instanceof Error ? err.message : 'Google sign-in failed')
  }
}
