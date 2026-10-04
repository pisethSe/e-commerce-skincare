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
  try {
    const cat = await prisma.category.create({ data: req.body })
    res.status(201).json({ success: true, data: cat })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A category with that name already exists' }); return
    }
    throw err
  }
})

categories.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const cat = await prisma.category.update({ where: { id: req.params.id as string }, data: req.body })
    res.json({ success: true, data: cat })
  } catch (err: unknown) {
    const prismaCode = (err as { code?: string })?.code
    if (prismaCode === 'P2025') {
      res.status(404).json({ success: false, message: 'Category not found' }); return
    }
    if (prismaCode === 'P2002') {
      res.status(409).json({ success: false, message: 'A category with that name already exists' }); return
    }
    throw err
  }
})

categories.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  // Products require a category (no cascade) — block with a clean message
  // instead of a foreign-key 500 when the collection is still in use.
  const cat = await prisma.category.findUnique({
    where: { id: req.params.id as string },
    include: { _count: { select: { products: true } } },
  })
  if (!cat) {
    res.status(404).json({ success: false, message: 'Category not found' }); return
  }
  if (cat._count.products > 0) {
    res.status(409).json({
      success: false,
      message: `This collection has ${cat._count.products} product${cat._count.products === 1 ? '' : 's'} — move them to another collection first`,
    }); return
  }
  await prisma.category.delete({ where: { id: req.params.id as string } })
  res.json({ success: true, message: 'Category deleted' })
})

export default categories
