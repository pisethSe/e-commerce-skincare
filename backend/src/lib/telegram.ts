type TelegramReceiptOrder = {
  orderNumber: string
  total: unknown
  subtotal: unknown
  shipping: unknown
  tax: unknown
  discount: unknown
  paymentMethod?: string | null
  paymentStatus: string
  trackingNumber?: string | null
  address?: {
    firstName: string
    lastName: string
    street: string
    city: string
    state: string
    country: string
  } | null
  items: Array<{
    name: string
    quantity: number
    price: unknown
  }>
}

const money = (value: unknown) => `$${Number(value).toFixed(2)}`

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const sendTelegramPaymentReceipt = async (order: TelegramReceiptOrder): Promise<void> => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !chatId) return

  const storeUrl = process.env.FRONTEND_URL || 'http://localhost:3003'
  const trackUrl = `${storeUrl}/track?order=${encodeURIComponent(order.orderNumber)}`
  const items = order.items
    .map((item) => `• ${escapeHtml(item.name)} × ${item.quantity} — ${money(item.price)}`)
    .join('\n')
  const address = order.address
    ? `${escapeHtml(order.address.firstName)} ${escapeHtml(order.address.lastName)}\n${escapeHtml(order.address.street)}, ${escapeHtml(order.address.city)}, ${escapeHtml(order.address.state)}, ${escapeHtml(order.address.country)}`
    : 'Not provided'
  const message = [
    '<b>✅ Payment received — Calesta</b>',
    '',
    `<b>Receipt:</b> ${escapeHtml(order.orderNumber)}`,
    `<b>Status:</b> ${escapeHtml(order.paymentStatus)}`,
    `<b>Payment:</b> ${escapeHtml(order.paymentMethod || 'ABA PayWay')}`,
    '',
    `<b>Items</b>`,
    items,
    '',
    `<b>Subtotal:</b> ${money(order.subtotal)}`,
    `<b>Shipping:</b> ${money(order.shipping)}`,
    `<b>VAT:</b> ${money(order.tax)}`,
    `<b>Discount:</b> ${money(order.discount)}`,
    `<b>Total:</b> ${money(order.total)}`,
    '',
    `<b>Ship to:</b>\n${address}`,
    '',
    `<b>Tracking:</b> ${trackUrl}`,
  ].join('\n')

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    })
  } catch (err) {
    console.error('Telegram receipt notification failed:', err instanceof Error ? err.message : err)
  }
}

const botApi = (token: string, method: string) =>
  `https://api.telegram.org/bot${token}/${method}`

const sendBotMessage = async (
  token: string,
  chatId: number,
  text: string,
  keyboard?: { inline_keyboard: Array<Array<{ text: string; url: string }>> },
) => {
  await fetch(botApi(token, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(keyboard ? { reply_markup: keyboard } : {}),
    }),
  })
}

export const startTelegramBotPolling = (): void => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  let offset = 0
  let polling = false
  let timer: NodeJS.Timeout

  const poll = async () => {
    if (polling) return
    polling = true
    try {
      const response = await fetch(botApi(token, 'getUpdates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offset,
          timeout: 20,
          allowed_updates: ['message'],
        }),
      })
      const result = await response.json() as {
        ok?: boolean
        result?: Array<{
          update_id: number
          message?: { chat: { id: number }; text?: string }
        }>
      }
      if (result.ok && result.result) {
        for (const update of result.result) {
          offset = Math.max(offset, update.update_id + 1)
          const message = update.message
          const text = message?.text?.trim()
          if (!message || !text) continue

          if (text.startsWith('/start')) {
            const payload = text.replace(/^\/start(?:@\w+)?\s*/, '').trim()
            const storeUrl = process.env.FRONTEND_URL || 'http://localhost:3003'

            if (payload) {
              const { prisma } = await import('../lib/prisma')
              const order = await prisma.order.findUnique({
                where: { orderNumber: payload },
                include: { items: true, address: true },
              })
              if (order) {
                const itemLines = order.items
                  .map((item) => `• ${escapeHtml(item.name)} × ${item.quantity} — ${money(item.price)}`)
                  .join('\n')
                const receipt = [
                  '<b>🧾 Calesta payment receipt</b>',
                  '',
                  `<b>Receipt:</b> ${escapeHtml(order.orderNumber)}`,
                  `<b>Payment status:</b> ${escapeHtml(order.paymentStatus)}`,
                  `<b>Payment method:</b> ${escapeHtml(order.paymentMethod || 'ABA PayWay')}`,
                  '',
                  itemLines,
                  '',
                  `<b>Subtotal:</b> ${money(order.subtotal)}`,
                  `<b>Shipping:</b> ${money(order.shipping)}`,
                  `<b>VAT:</b> ${money(order.tax)}`,
                  `<b>Discount:</b> ${money(order.discount)}`,
                  `<b>Total:</b> ${money(order.total)}`,
                ].join('\n')
                await sendBotMessage(
                  token,
                  message.chat.id,
                  receipt,
                  {
                    inline_keyboard: [[
                      {
                        text: 'Track this order',
                        url: `${storeUrl}/track?order=${encodeURIComponent(order.orderNumber)}`,
                      },
                    ]],
                  },
                )
              } else {
                await sendBotMessage(
                  token,
                  message.chat.id,
                  `I could not find receipt <b>${escapeHtml(payload)}</b>. Open the paid order again or contact Calesta support.`,
                )
              }
            } else {
              await sendBotMessage(
                token,
                message.chat.id,
                '<b>Welcome to Calesta Skincare</b>\n\nUse your receipt link from the website to view payment details and track an order.',
                {
                  inline_keyboard: [[
                    { text: 'Open Calesta', url: process.env.FRONTEND_URL || 'http://localhost:3003' },
                  ]],
                },
              )
            }
          }
        }
      }
    } catch (err) {
      console.error('Telegram bot polling failed:', err instanceof Error ? err.message : err)
    } finally {
      polling = false
      timer = setTimeout(poll, 1000)
    }
  }

  void poll()
  process.once('SIGTERM', () => clearTimeout(timer))
  process.once('SIGINT', () => clearTimeout(timer))
}
