import { describe, expect, it } from 'vitest'
import { convertUsdToKhr, formatMoney, USD_TO_KHR } from './currency'

describe('currency', () => {
  it('exposes the configured riel rate (defaults to 4,100)', () => {
    expect(USD_TO_KHR).toBeGreaterThan(0)
    expect(USD_TO_KHR).toBe(4100)
  })

  it('converts USD to whole riels', () => {
    expect(convertUsdToKhr(10)).toBe(41000)
    expect(convertUsdToKhr(0.5)).toBe(2050)
    expect(Number.isInteger(convertUsdToKhr(38.49))).toBe(true)
  })

  it('formats USD with cents only when the amount needs them', () => {
    expect(formatMoney(38, 'USD')).toBe('$38')
    expect(formatMoney(38.5, 'USD')).toBe('$38.50')
    expect(formatMoney(0, 'USD')).toBe('$0')
  })

  it('formats KHR with the riel sign and no decimals', () => {
    expect(formatMoney(38, 'KHR')).toBe('៛155,800')
    expect(formatMoney(0, 'KHR')).toBe('៛0')
  })
})
