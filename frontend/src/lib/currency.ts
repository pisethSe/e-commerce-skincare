import { usePrefsStore, type Currency } from './store'

/**
 * Currency display.
 * All catalog + order amounts are stored in USD; the storefront can display
 * either USD or KHR (riels). The rate is fixed at build time via
 * VITE_USD_TO_KHR and defaults to 4,100 — update it when the riel moves.
 */
export const USD_TO_KHR = Number(import.meta.env.VITE_USD_TO_KHR) || 4100

export function convertUsdToKhr(amountUsd: number): number {
  return Math.round(amountUsd * USD_TO_KHR)
}

export function formatMoney(amountUsd: number, currency: Currency = 'USD'): string {
  if (currency === 'KHR') {
    return `៛${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(convertUsdToKhr(amountUsd))}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amountUsd) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountUsd)
}

/** Current display currency + formatters. Re-renders when the shopper switches. */
export function useMoney() {
  const currency = usePrefsStore((s) => s.currency)
  const altCurrency: Currency = currency === 'USD' ? 'KHR' : 'USD'

  return {
    currency,
    altCurrency,
    rate: USD_TO_KHR,
    money: (amountUsd: number) => formatMoney(amountUsd, currency),
    alt: (amountUsd: number) => formatMoney(amountUsd, altCurrency),
  }
}
