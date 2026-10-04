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
