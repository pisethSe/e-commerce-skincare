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
import { demoPaymentsAllowed } from '../lib/guards'
import { isInactiveStatus } from '../lib/orderStatus'
import { sendTelegramPaymentReceipt } from '../lib/telegram'

const router = Router()

const stripeConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY) && !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_...')
const bakongConfigured = () => Boolean(process.env.BAKONG_ACCOUNT_ID)
const abaPaywayConfigured = () =>
  Boolean(process.env.ABA_PAYWAY_PROFILE_ID) &&
  Boolean(process.env.ABA_PAYWAY_SECRET_KEY)
const paymentCurrency = (): 'USD' | 'KHR' => (process.env.PAYMENT_CURRENCY || 'USD').toUpperCase() === 'KHR' ? 'KHR' : 'USD'

/** Marks an order paid and returns it with relations for the email. */
const markPaid = async (orderId: string, paymentId: string) => {
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'PAID', paymentId },
  })
  const receiptOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, address: true },
  })
  if (receiptOrder) {
    void sendTelegramPaymentReceipt(receiptOrder)
  }
  return updated
}

const orderAmountMinor = (total: number): number =>
  paymentCurrency() === 'KHR' ? Math.round(total) : Math.round(total * 100)

// GET /api/payments/config — which gateways are live
router.get('/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      stripe: stripeConfigured(),
      bakong: bakongConfigured(),
      abaPayway: abaPaywayConfigured(),
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
  if (isInactiveStatus(order.status)) {
    res.status(409).json({ success: false, message: 'Inactive orders cannot be paid' }); return
  }
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
  if (isInactiveStatus(order.status)) {
    res.status(409).json({ success: false, message: 'Inactive orders cannot be paid' }); return
  }
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
  if (isInactiveStatus(order.status)) {
    res.status(409).json({ success: false, message: 'Inactive orders cannot be paid' }); return
  }
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
  if (isInactiveStatus(order.status)) {
    res.status(409).json({ success: false, message: 'Inactive orders cannot be paid' }); return
  }
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
  // locally. Production must use a verified gateway or an authorised admin
  // action, so the shortcut is refused unless explicitly enabled.
  if (!demoPaymentsAllowed()) {
    res.status(403).json({
      success: false,
      message: 'Bakong verification is unavailable — configure BAKONG_TOKEN and BAKONG_ACCOUNT_ID, or mark the order paid from the admin console',
    })
    return
  }
  await markPaid(order.id, `demo-bakong-${order.orderNumber}`)
  res.json({ success: true, data: { paymentStatus: 'PAID', verified: false, demo: true, orderNumber: order.orderNumber } })
})

// POST /api/payments/aba/qr { orderId } — create a direct Anajak/KHQRcc QR
router.post('/aba/qr', authenticate, async (req: any, res) => {
  if (!abaPaywayConfigured()) {
    res.status(501).json({
      success: false,
      message: 'ABA PayWay is not configured — add ABA_PAYWAY_PROFILE_ID and ABA_PAYWAY_SECRET_KEY',
    })
    return
  }

  const order = await prisma.order.findFirst({ where: { id: req.body.orderId, userId: req.user.id } })
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return }
  if (isInactiveStatus(order.status)) {
    res.status(409).json({ success: false, message: 'Inactive orders cannot be paid' })
    return
  }
  if (order.paymentStatus === 'PAID') {
    res.json({ success: true, data: { paymentStatus: 'PAID', orderNumber: order.orderNumber } })
    return
  }

  const profileId = process.env.ABA_PAYWAY_PROFILE_ID as string
  const secret = process.env.ABA_PAYWAY_SECRET_KEY as string
  const apiBase = process.env.ABA_PAYWAY_API_BASE || 'https://anajakpay.com/api'
  const amount = Number(order.total).toFixed(2)
  const transactionId = order.orderNumber
  const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3003'}/payment/success?orderId=${encodeURIComponent(order.id)}`
  const remark = `Calesta order ${order.orderNumber}`
  const hash = crypto.createHash('sha1')
    .update(secret + transactionId + amount + successUrl + remark)
    .digest('hex')

  const body = new URLSearchParams({
    transaction_id: transactionId,
    amount,
    success_url: successUrl,
    remark,
    hash,
  })

  try {
    const response = await fetch(`${apiBase}/${profileId}/payment-gateway/v1/payments/qr-api-khqrcc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const result = await response.json() as {
      responseCode?: number
      responseMessage?: string
      data?: { qr?: string; qr_url?: string }
      status?: { code?: string; message?: string }
      qrString?: string
      qrImage?: string
      abapay_deeplink?: string
    }
    const qr = result.data?.qr || result.qrString
    const qrImage = result.data?.qr_url || result.qrImage
    const success = result.responseCode === 0 || result.status?.code === '0'
    if (!response.ok || !success || !qrImage) {
      res.status(502).json({
        success: false,
        message: result.responseMessage || result.status?.message || 'ABA PayWay could not create the payment QR',
      })
      return
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentId: transactionId, qrCode: qr ?? null },
    })
    res.json({
      success: true,
      data: {
        qr,
        qrImage,
        transactionId,
        orderNumber: order.orderNumber,
        amount,
        currency: 'USD',
      },
    })
  } catch (err) {
    console.error('ABA PayWay QR failed:', err instanceof Error ? err.message : err)
    res.status(502).json({ success: false, message: 'ABA PayWay is unavailable right now' })
  }
})

// POST /api/payments/aba/verify { orderId } — verify with Anajak KHQRcc V2
router.post('/aba/verify', authenticate, async (req: any, res) => {
  if (!abaPaywayConfigured()) {
    res.status(501).json({ success: false, message: 'ABA PayWay is not configured' })
    return
  }

  const order = await prisma.order.findFirst({ where: { id: req.body.orderId, userId: req.user.id } })
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return }
  if (isInactiveStatus(order.status)) {
    res.status(409).json({ success: false, message: 'Inactive orders cannot be paid' })
    return
  }
  if (order.paymentStatus === 'PAID') {
    res.json({ success: true, data: { paymentStatus: 'PAID', orderNumber: order.orderNumber } })
    return
  }

  const profileId = process.env.ABA_PAYWAY_PROFILE_ID as string
  const secret = process.env.ABA_PAYWAY_SECRET_KEY as string
  const apiBase = process.env.ABA_PAYWAY_API_BASE || 'https://anajakpay.com/api'
  const transactionId = order.orderNumber
  const hash = crypto.createHash('sha1').update(secret + transactionId).digest('hex')

  try {
    const response = await fetch(`${apiBase}/${profileId}/payment-gateway/v1/payments/check-transv2-khqrcc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ transaction_id: transactionId, hash }),
    })
    const result = await response.json() as {
      responseCode?: number
      responseMessage?: string
      data?: { status?: string; amount?: string }
    }
    if (result.responseCode === 0 && result.data?.status === 'success') {
      await markPaid(order.id, transactionId)
      res.json({
        success: true,
        data: {
          paymentStatus: 'PAID',
          verified: true,
          orderNumber: order.orderNumber,
          amount: result.data.amount,
        },
      })
      return
    }
    res.status(402).json({
      success: false,
      message: result.responseCode === 0 ? 'Payment is pending — scan the QR and try again' : (result.responseMessage || 'Payment verification failed'),
    })
  } catch (err) {
    console.error('ABA PayWay verify failed:', err instanceof Error ? err.message : err)
    res.status(502).json({ success: false, message: 'ABA PayWay verification is unavailable right now' })
  }
})

// ABA PayWay callbacks must use POST. A browser-friendly response for GET
// prevents the endpoint from being mistaken for a successful payment route.
router.get('/aba/callback', (_req, res) => {
  res.status(405).json({
    success: false,
    message: 'ABA PayWay callback requires POST',
  })
})

// POST /api/payments/aba/callback — signed server notification
router.post('/aba/callback', async (req, res) => {
  const secret = process.env.ABA_PAYWAY_SECRET_KEY
  if (!secret) {
    res.status(503).json({ success: false, message: 'ABA PayWay is not configured' })
    return
  }

  const body = req.body as {
    req_time?: string
    transaction_id?: string
    amount?: string
    status?: string
    hash?: string
    tran_id?: string
    return_params?: string
  }
  let returnParams: Record<string, string> = {}
  if (typeof body.return_params === 'string') {
    try {
      const decoded = Buffer.from(body.return_params, 'base64').toString('utf8')
      returnParams = JSON.parse(decoded.startsWith('{') ? decoded : body.return_params)
    } catch {
      try {
        returnParams = JSON.parse(body.return_params)
      } catch {
        returnParams = {}
      }
    }
  }

  const transactionId = body.tran_id || body.transaction_id ||
    returnParams.tran_id || returnParams.transaction_id
  if (!transactionId) {
    res.status(400).json({ success: false, message: 'Invalid callback payload' })
    return
  }

  const isOfficialSuccess = body.status === '0'
  if (isOfficialSuccess) {
    const order = returnParams.order_id
      ? await prisma.order.findUnique({ where: { id: returnParams.order_id } })
      : await prisma.order.findUnique({ where: { orderNumber: transactionId } })
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' })
      return
    }

    const profileId = process.env.ABA_PAYWAY_PROFILE_ID as string
    const apiBase = process.env.ABA_PAYWAY_API_BASE || 'https://anajakpay.com/api'
    const hash = crypto.createHash('sha1')
      .update(secret + order.orderNumber)
      .digest('hex')

    try {
      const verification = await fetch(`${apiBase}/${profileId}/payment-gateway/v1/payments/check-transv2-khqrcc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ transaction_id: order.orderNumber, hash }),
      })
      const result = await verification.json() as {
        responseCode?: number
        data?: { status?: string }
      }
      if (result.responseCode === 0 && result.data?.status === 'success') {
        await markPaid(order.id, transactionId)
        res.json({ success: true })
        return
      }
      res.status(402).json({ success: false, message: 'Payment could not be verified yet' })
    } catch (err) {
      console.error('ABA PayWay callback verification failed:', err instanceof Error ? err.message : err)
      res.status(502).json({ success: false, message: 'Payment verification is unavailable' })
    }
    return
  }

  if (!body.amount || !body.req_time || !body.hash) {
    res.status(400).json({ success: false, message: 'Invalid callback payload' })
    return
  }

  const expected = crypto.createHash('sha256')
    .update(secret + body.req_time + transactionId + body.amount + 'SUCCESS')
    .digest('hex')
  if (body.status !== 'SUCCESS' || body.hash !== expected) {
    res.status(400).json({ success: false, message: 'Invalid callback signature' })
    return
  }

  const order = await prisma.order.findUnique({ where: { orderNumber: transactionId } })
  if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return }
  await markPaid(order.id, transactionId)
  res.json({ success: true })
})

export default router
