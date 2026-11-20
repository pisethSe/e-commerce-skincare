/**
 * Runtime guards for behaviour that is safe in development but must never be
 * reachable in production. Keeping the decisions pure makes them easy to unit
 * test without booting the API.
 */

type Env = Record<string, string | undefined>

export const isProduction = (env: Env = process.env): boolean =>
  env.NODE_ENV === 'production'

/**
 * Bakong can settle an order without a gateway token so the checkout flow is
 * testable locally. That shortcut must be impossible in production unless the
 * operator explicitly opts in with PAYMENTS_DEMO=true.
 */
export const demoPaymentsAllowed = (env: Env = process.env): boolean =>
  !isProduction(env) || env.PAYMENTS_DEMO === 'true'

/**
 * Password-reset links are printed to the console only when there is no SMTP
 * transport to deliver them. They must never be written to production logs.
 */
export const shouldLogResetLink = (env: Env = process.env): boolean =>
  !isProduction(env)
