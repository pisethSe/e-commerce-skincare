/**
 * Removes test fixtures from the database in FK-safe order, leaving the real
 * seeded/demo data intact:
 *   - throwaway test users (*@test.*)
 *   - test-created products (test-*, test-wf-*, put-diag-*)
 *   - test coupons (TEST*, WFT*)
 * Reviews, carts, wishlists, addresses, and orders owned by test users go with
 * them. Product rating aggregates are recalculated afterwards.
 *
 * Run: npm run db:clean
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const isTestUser = (email) => /@test\./i.test(email)
const isTestProduct = (slug) => /^(test-|test-wf-|put-diag-)/i.test(slug)

async function main() {
  const testUsers = await prisma.user.findMany({ where: { email: { contains: '@test.' } }, select: { id: true } })
  const testProducts = await prisma.product.findMany({
    where: { slug: { startsWith: 'test-' } },
    select: { id: true },
  })
  // put-diag / test-wf slugs too
  const extra = await prisma.product.findMany({
    where: { OR: [{ slug: { startsWith: 'put-diag-' } }, { slug: { startsWith: 'test-wf-' } }] },
    select: { id: true },
  })
  const productIds = [...new Set([...testProducts, ...extra].map((p) => p.id))]
  const userIds = testUsers.map((u) => u.id)

  if (userIds.length === 0 && productIds.length === 0) {
    console.log('✨ Nothing to clean — no test fixtures found.')
    return
  }

  // 1. Reviews by test users or on test products (Review.user has no cascade)
  const reviews = await prisma.review.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { productId: { in: productIds } }] },
  })
  // 2. Carts & wishlists pointing at test products or owned by test users
  const carts = await prisma.cartItem.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { productId: { in: productIds } }] },
  })
  const wishlists = await prisma.wishlistItem.deleteMany({
    where: { OR: [{ userId: { in: userIds } }, { productId: { in: productIds } }] },
  })
  // 3. Test orders (cascades order items) — before addresses, which orders reference
  const orders = await prisma.order.deleteMany({ where: { userId: { in: userIds } } })
  // 4. Addresses, refresh tokens
  const addresses = await prisma.address.deleteMany({ where: { userId: { in: userIds } } })
  const tokens = await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } })
  // 5. Test users, then test products
  const users = await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  const products = await prisma.product.deleteMany({ where: { id: { in: productIds } } })
  // 6. Test coupons
  const coupons = await prisma.coupon.deleteMany({
    where: { OR: [{ code: { startsWith: 'TEST' } }, { code: { startsWith: 'WFT' } }] },
  })

  // 7. Recalculate product rating aggregates from the remaining approved reviews
  const remaining = await prisma.product.findMany({ select: { id: true } })
  for (const p of remaining) {
    const agg = await prisma.review.aggregate({
      where: { productId: p.id, approved: true },
      _avg: { rating: true },
      _count: { id: true },
    })
    await prisma.product.update({
      where: { id: p.id },
      data: {
        rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
        reviewCount: agg._count.id,
      },
    })
  }

  console.log(
    `🧹 Cleaned: ${users.count} users, ${products.count} products, ${orders.count} orders, ` +
      `${reviews.count} reviews, ${carts.count} cart items, ${wishlists.count} wishlist items, ` +
      `${addresses.count} addresses, ${coupons.count} coupons. Ratings recalculated on ${remaining.length} products.`,
  )
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
