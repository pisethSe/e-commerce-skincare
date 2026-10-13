// Bakong KHQR — EMVCo QR payload builder.
// Generating a scannable KHQR needs only the merchant's Bakong account ID
// (e.g. "piseth@aba"). Verifying payments through Bakong's open API needs a
// developer token — that part activates when BAKONG_TOKEN is configured.

/** TLV (tag-length-value) encoding with 2-digit lengths, per EMVCo. */
function tlv(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0')
  return `${tag}${length}${value}`
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — the KHQR checksum. */
export function crc16(input: string): string {
  let crc = 0xffff
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function buildKhqr(params: {
  bakongAccountId: string
  merchantName: string
  merchantCity?: string
  amount: number
  currency: 'USD' | 'KHR'
  billNumber: string
}): string {
  const currencyCode = params.currency === 'KHR' ? '116' : '840'
  // KHR amounts are whole riel; USD carries 2 decimals
  const amount =
    params.currency === 'KHR'
      ? String(Math.round(params.amount))
      : params.amount.toFixed(2)

  // Tag 29 — merchant account information reserved for Bakong:
  //   00 = Bakong's registered application identifier
  //   01 = the merchant's Bakong account ID
  const merchantAccountInfo = tlv('00', 'A000000775') + tlv('01', params.bakongAccountId)
  // Tag 62/05 — bill number ties the QR to one order
  const additionalData = tlv('05', params.billNumber.slice(0, 25))

  let payload =
    tlv('00', '01') + // payload format indicator
    tlv('01', '12') + // point of initiation: dynamic, one-time payment
    tlv('29', merchantAccountInfo) +
    tlv('52', '5999') + // merchant category code: retail
    tlv('53', currencyCode) +
    tlv('54', amount) +
    tlv('58', 'KH') +
    tlv('59', params.merchantName.slice(0, 25).toUpperCase()) +
    tlv('60', (params.merchantCity || 'PHNOM PENH').slice(0, 15).toUpperCase()) +
    tlv('62', additionalData)

  payload += '6304'
  return payload + crc16(payload)
}

/** Validates the structural bits we rely on — used by the tests. */
export function parseKhqr(qr: string): Record<string, string> {
  const out: Record<string, string> = {}
  let i = 0
  while (i + 4 <= qr.length) {
    const tag = qr.slice(i, i + 2)
    const length = parseInt(qr.slice(i + 2, i + 4), 10)
    out[tag] = qr.slice(i + 4, i + 4 + length)
    i += 4 + length
  }
  return out
}
