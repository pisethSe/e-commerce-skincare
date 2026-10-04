// Email service — graceful degradation:
// - Configured (EMAIL_USER + EMAIL_PASS set): sends via SMTP/Nodemailer
// - Unconfigured: logs the email and returns { sent: false }
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

interface MailOptions {
  to: string
  subject: string
  html: string
}

const isConfigured = (): boolean =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_HOST)

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!isConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  }
  return transporter
}

export async function sendMail(options: MailOptions): Promise<{ sent: boolean }> {
  const tx = getTransporter()
  if (!tx) {
    console.log(`📧 [email not configured] Would send to ${options.to}: "${options.subject}"`)
    return { sent: false }
  }
  try {
    await tx.sendMail({
      from: process.env.EMAIL_FROM || 'Calesta Beauty <noreply@calesta.com>',
      ...options,
    })
    return { sent: true }
  } catch (err) {
    // Never let email failures break the request
    console.error('📧 Email send failed:', err instanceof Error ? err.message : err)
    return { sent: false }
  }
}

/* ── Templates ────────────────────────────────── */

export function orderConfirmationEmail(params: {
  customerName: string
  orderNumber: string
  total: string
  itemCount: number
  storeUrl: string
}): MailOptions['html'] {
  return `
  <div style="font-family: 'Inter Tight', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; color: #102d26;">
    <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #e7eae9;">
      <span style="font-size: 20px; font-weight: 700; letter-spacing: 0.06em;">CALESTA</span>
    </div>
    <h1 style="font-size: 22px; font-weight: 600; margin: 24px 0 8px;">Thank you, ${params.customerName}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #3f5650;">
      Your order <strong style="font-variant-numeric: tabular-nums;">${params.orderNumber}</strong>
      (${params.itemCount} item${params.itemCount === 1 ? '' : 's'}, ${params.total}) is confirmed
      and will ship soon.
    </p>
    <a href="${params.storeUrl}" style="display: inline-block; margin-top: 20px; background: #102d26; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px;">
      Continue Shopping
    </a>
    <p style="margin-top: 28px; font-size: 12px; color: #9ca8a5; border-top: 1px solid #e7eae9; padding-top: 16px;">
      You're receiving this email because you placed an order at Calesta.
    </p>
  </div>`
}

export function orderStatusEmail(params: {
  customerName: string
  orderNumber: string
  status: string
  storeUrl: string
}): MailOptions['html'] {
  const copy: Record<string, string> = {
    PENDING: 'Your order is received and queued for processing.',
    PROCESSING: 'Your order is being prepared with care.',
    SHIPPED: 'Good news — your order is on its way!',
    DELIVERED: 'Your order has been delivered. Enjoy your ritual!',
    CANCELLED: 'Your order has been cancelled. Any authorized payment will be refunded.',
    REFUNDED: 'Your order has been refunded.',
  }
  return `
  <div style="font-family: 'Inter Tight', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; color: #102d26;">
    <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #e7eae9;">
      <span style="font-size: 20px; font-weight: 700; letter-spacing: 0.06em;">CALESTA</span>
    </div>
    <h1 style="font-size: 22px; font-weight: 600; margin: 24px 0 8px;">Order update, ${params.customerName}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #3f5650;">
      Order <strong style="font-variant-numeric: tabular-nums;">${params.orderNumber}</strong> is now
      <strong>${params.status.charAt(0)}${params.status.slice(1).toLowerCase()}</strong>.
      ${copy[params.status] ?? ''}
    </p>
    <a href="${params.storeUrl}" style="display: inline-block; margin-top: 20px; background: #102d26; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px;">
      View Your Orders
    </a>
    <p style="margin-top: 28px; font-size: 12px; color: #9ca8a5; border-top: 1px solid #e7eae9; padding-top: 16px;">
      You're receiving this because you placed an order at Calesta.
    </p>
  </div>`
}

export function newsletterWelcomeEmail(): MailOptions['html'] {
  return `
  <div style="font-family: 'Inter Tight', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; color: #102d26;">
    <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #e7eae9;">
      <span style="font-size: 20px; font-weight: 700; letter-spacing: 0.06em;">CALESTA</span>
    </div>
    <h1 style="font-size: 22px; font-weight: 600; margin: 24px 0 8px;">Welcome to the journal</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #3f5650;">
      You're subscribed — skincare wisdom, rituals, and ingredient notes,
      plus your welcome discount code: <strong>WELCOME15</strong>.
    </p>
  </div>`
}
