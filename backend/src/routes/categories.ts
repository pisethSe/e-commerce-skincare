// categories.ts
import { Router as CatRouter } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin } from '../middleware/auth'

const categories = CatRouter()

categories.get('/', async (_req, res) => {
  const cats = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  })
  res.json({ success: true, data: cats })
})

categories.post('/', authenticate, requireAdmin, async (req, res) => {
  const cat = await prisma.category.create({ data: req.body })
  res.status(201).json({ success: true, data: cat })
})

categories.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const cat = await prisma.category.update({ where: { id: req.params.id }, data: req.body })
  res.json({ success: true, data: cat })
})

categories.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } })
  res.json({ success: true, message: 'Category deleted' })
})

export default categories
