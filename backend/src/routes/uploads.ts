// Image upload — admin-only. Saves to backend/uploads, served at /uploads.
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { Router as UploadRouter } from 'express'
import { authenticate, requireAdmin } from '../middleware/auth'

const uploadDir = path.resolve(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`)
  },
})

// Images only, 5 MB cap
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Only image files are allowed (jpg, png, webp, gif, svg, avif)'))
  },
})

const uploads = UploadRouter()

uploads.post('/', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file provided' })
    return
  }
  // Public URL — relative so it works through proxies and on the deployed origin
  res.status(201).json({
    success: true,
    data: {
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
    },
  })
})

export default uploads
