import { prisma } from './prisma'
import { sendMail, backInStockEmail } from './email'

const STORE_URL = process.env.FRONTEND_URL || 'http://localhost:3003'

/**
 * Email everyone waiting on a product once it is purchasable again.
 *
 * A notification is only marked as sent when the mail actually went out, so
 * subscribers stay pending while SMTP is unconfigured (demo mode) and can be
 * flushed later by re-saving the stock level.
 */
export async function notifyBackInStock(productId: string): Promise<{ sent: number; pending: number }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true, price: true, stockCount: true, inStock: true },
  })

  if (!product || !product.inStock || product.stockCount <= 0) {
    return { sent: 0, pending: 0 }
  }

  const waiting = await prisma.stockNotification.findMany({
    where: { productId, notifiedAt: null },
    orderBy: { createdAt: 'asc' },
  })

  if (waiting.length === 0) return { sent: 0, pending: 0 }

  const html = backInStockEmail({
    productName: product.name,
    productUrl: `${STORE_URL}/products/${product.slug}`,
    price: `$${Number(product.price).toFixed(2)}`,
  })

  let sent = 0
  // Batches of 10 keep the SMTP provider happy without stalling the request.
  for (let i = 0; i < waiting.length; i += 10) {
    const batch = waiting.slice(i, i + 10)
    const results = await Promise.allSettled(
      batch.map((sub) =>
        sendMail({
          to: sub.email,
          subject: `${product.name} is back in stock`,
          html,
        })
      )
    )
    for (let j = 0; j < batch.length; j++) {
      const result = results[j]
      if (result.status === 'fulfilled' && result.value.sent) {
        await prisma.stockNotification.update({
          where: { id: batch[j].id },
          data: { notifiedAt: new Date() },
        })
        sent++
      }
    }
  }

  return { sent, pending: waiting.length - sent }
}
