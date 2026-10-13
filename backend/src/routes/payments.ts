// Payment processing routes — Stripe Checkout (cards) and Bakong KHQR.
// Both activate with credentials in .env and degrade to a clearly-labelled
// demo mode without them, so the checkout flow always completes.
import { Router } from 'express'
import crypto from 'crypto'
import Stripe from 'stripe'
import QRCode from 'qrcode'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { buildKhqr } from '../lib/khqr'

const router = Router()

const stripeConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY) && !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_...')
const bakongConfigured = () => Boolean(process.env.BAKONG_ACCOUNT_ID)
const paymentCurrency = (): 'USD' | 'KHR' => (process.env.PAYMENT_CURRENCY || 'USD').toUpperCase() === 'KHR' ? 'KHR' : 'USD'

/** Marks an order paid and returns it with relations for the email. */
const markPaid = (orderId: string, paymentId: string) =>
  prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PAID', paymentId },
  })

const orderAmountMinor = (total: number): number =>
  paymentCurrency() === 'KHR' ? Math.round(total) : Math.round(total * 100)

// GET /api/payments/config — which gateways are live
router.get('/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      stripe: stripeConfigured(),
      bakong: bakongConfigured(),
      currency: paymentCurrency(),
    },
  })
})

/* ── Stripe Checkout (credit / debit card) ─────── */

// POST /api/payments/stripe/session { orderId } → hosted Checkout URL
router.post('/stripe/session', authenticate, async (req: any, res) => {
  if (!stripeConfigured()) {
    res.status(501).json({ success: false, message: 'Stripe is not configured — add STRIPE_SECRET_KEY to enable card payments' }); return
  }
  const order = await prisma.order.findFirst({ where: { id: req.body.orderId, userId: req.user.id } })
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return }
  if (order.paymentStatus === 'PAID') { res.json({ success: true, data: { paymentStatus: 'PAID' } }); return }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: paymentCurrency().toLowerCase(),
            product_data: { name: `Calesta order ${order.orderNumber}` },
            unit_amount: orderAmountMinor(Number(order.total)),
          },
          quantity: 1,
        },
      ],
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
      success_url: `${frontendUrl}/payment/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout?canceled=1`,
    })
    await prisma.order.update({ where: { id: order.id }, data: { paymentId: session.id } })
    res.json({ success: true, data: { url: session.url } })
  } catch (err) {
    console.error('Stripe session failed:', err instanceof Error ? err.message : err)
    res.status(502).json({ success: false, message: 'Stripe is unavailable right now' })
  }
})

// GET /api/payments/stripe/verify?orderId=…&session_id=… → mark paid when settled
router.get('/stripe/verify', authenticate, async (req: any, res) => {
  if (!stripeConfigured()) {
    res.status(501).json({ success: false, message: 'Stripe is not configured' }); return
  }
  const { orderId, session_id: sessionId } = req.query as { orderId?: string; session_id?: string }
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.user.id } })
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return }
  if (order.paymentStatus === 'PAID') {
    res.json({ success: true, data: { paymentStatus: 'PAID', orderNumber: order.orderNumber } }); return
  }
  if (!sessionId) { res.status(400).json({ success: false, message: 'Missing session id' }); return }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === 'paid') {
      const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.id
      await markPaid(order.id, paymentIntent)
      res.json({ success: true, data: { paymentStatus: 'PAID', orderNumber: order.orderNumber } })
      return
    }
    res.status(402).json({ success: false, message: 'Payment not completed yet' })
  } catch (err) {
    console.error('Stripe verify failed:', err instanceof Error ? err.message : err)
    res.status(502).json({ success: false, message: 'Stripe is unavailable right now' })
  }
})

/* ── Bakong KHQR ───────────────────────────────── */

// POST /api/payments/bakong/qr { orderId } → the KHQR payload + a data-URL image
router.post('/bakong/qr', authenticate, async (req: any, res) => {
  if (!bakongConfigured()) {
    res.status(501).json({ success: false, message: 'Bakong is not configured — set BAKONG_ACCOUNT_ID to your Bakong ID' }); return
  }
  const order = await prisma.order.findFirst({ where: { id: req.body.orderId, userId: req.user.id } })
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return }
  if (order.paymentStatus === 'PAID') {
    res.json({ success: true, data: { paymentStatus: 'PAID', orderNumber: order.orderNumber } }); return
  }

  const currency = paymentCurrency()
  const qr = buildKhqr({
    bakongAccountId: process.env.BAKONG_ACCOUNT_ID as string,
    merchantName: process.env.BAKONG_MERCHANT_NAME || 'CALESTA',
    merchantCity: 'PHNOM PENH',
    amount: Number(order.total),
    currency,
    billNumber: order.orderNumber,
  })
  const qrImage = await QRCode.toDataURL(qr, { width: 320, margin: 1 })
  res.json({
    success: true,
    data: { qr, qrImage, paymentStatus: order.paymentStatus, currency, orderNumber: order.orderNumber },
  })
})

// POST /api/payments/bakong/verify { orderId } → settle via Bakong's open API
router.post('/bakong/verify', authenticate, async (req: any, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.body.orderId, userId: req.user.id } })
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return }
  if (order.paymentStatus === 'PAID') {
    res.json({ success: true, data: { paymentStatus: 'PAID', verified: true, orderNumber: order.orderNumber } }); return
  }

  const token = process.env.BAKONG_TOKEN
  if (token && process.env.BAKONG_ACCOUNT_ID) {
    // Real verification — Bakong's open API looks the transaction up by the
    // MD5 hash of the KHQR payload that was shown to the customer
    const currency = paymentCurrency()
    const qr = buildKhqr({
      bakongAccountId: process.env.BAKONG_ACCOUNT_ID as string,
      merchantName: process.env.BAKONG_MERCHANT_NAME || 'CALESTA',
      merchantCity: 'PHNOM PENH',
      amount: Number(order.total),
      currency,
      billNumber: order.orderNumber,
    })
    const md5 = crypto.createHash('md5').update(qr).digest('hex')
    try {
      const check = await fetch('https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ md5 }),
      })
      const result = (await check.json()) as { responseCode?: number; data?: { hash?: string } }
      if (result?.responseCode === 0 && result?.data?.hash) {
        await markPaid(order.id, result.data.hash)
        res.json({ success: true, data: { paymentStatus: 'PAID', verified: true, orderNumber: order.orderNumber } })
        return
      }
      res.status(402).json({ success: false, message: 'Payment not found yet — scan the QR and try again' })
      return
    } catch (err) {
      console.error('Bakong verify failed:', err instanceof Error ? err.message : err)
      res.status(502).json({ success: false, message: 'Bakong verification is unavailable right now' })
      return
    }
  }

  // Demo mode — no verification token configured: settle so the flow completes
  await markPaid(order.id, `demo-bakong-${order.orderNumber}`)
  res.json({ success: true, data: { paymentStatus: 'PAID', verified: false, demo: true, orderNumber: order.orderNumber } })
})

// POST /api/payments/aba/session — placeholder until merchant credentials exist
router.post('/aba/session', authenticate, async (req: any, res) => {
  if (!process.env.ABA_PAYWAY_MERCHANT_ID || !process.env.ABA_PAYWAY_API_KEY) {
    res.status(501).json({
      success: false,
      message: 'ABA PayWay is not configured — set ABA_PAYWAY_MERCHANT_ID and ABA_PAYWAY_API_KEY',
    }); return
  }
  res.status(501).json({ success: false, message: 'ABA PayWay hosted checkout is coming soon' })
})

export default router
