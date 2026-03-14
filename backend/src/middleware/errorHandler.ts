import { Request, Response, NextFunction } from 'express'

// 404 handler
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  })
}

// Global error handler
export const errorHandler = (
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('❌ Error:', err.message)
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack)
  }

  // Prisma errors
  if (err.code === 'P2002') {
    res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
    })
    return
  }
  if (err.code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Record not found',
    })
    return
  }

  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

// Custom API error class
export class ApiError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    this.name = 'ApiError'
  }
}
