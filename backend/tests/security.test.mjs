/**
 * Pure security/lifecycle guards. These run without the API server so they can
 * pin production-only behaviour that would otherwise depend on deployment env.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { demoPaymentsAllowed, shouldLogResetLink, isProduction } from '../dist/lib/guards.js'
import { canTransition, isInactiveStatus, isOrderStatus } from '../dist/lib/orderStatus.js'

test('production detection only treats NODE_ENV=production as production', () => {
  assert.equal(isProduction({ NODE_ENV: 'production' }), true)
  assert.equal(isProduction({ NODE_ENV: 'development' }), false)
  assert.equal(isProduction({}), false)
})

test('demo payment settlement is allowed locally but blocked in production', () => {
  assert.equal(demoPaymentsAllowed({ NODE_ENV: 'development' }), true)
  assert.equal(demoPaymentsAllowed({ NODE_ENV: 'test' }), true)
  assert.equal(demoPaymentsAllowed({ NODE_ENV: 'production' }), false)
  assert.equal(demoPaymentsAllowed({ NODE_ENV: 'production', PAYMENTS_DEMO: 'true' }), true)
  assert.equal(demoPaymentsAllowed({ NODE_ENV: 'production', PAYMENTS_DEMO: 'false' }), false)
})

test('password-reset links are never logged in production', () => {
  assert.equal(shouldLogResetLink({ NODE_ENV: 'development' }), true)
  assert.equal(shouldLogResetLink({ NODE_ENV: 'production' }), false)
})

test('order statuses follow the fulfillment state machine', () => {
  assert.equal(isOrderStatus('PENDING'), true)
  assert.equal(isOrderStatus('TELEPORTED'), false)

  assert.equal(canTransition('PENDING', 'PROCESSING'), true)
  assert.equal(canTransition('PENDING', 'CANCELLED'), true)
  assert.equal(canTransition('PENDING', 'SHIPPED'), false)
  assert.equal(canTransition('PROCESSING', 'SHIPPED'), true)
  assert.equal(canTransition('SHIPPED', 'DELIVERED'), true)
  assert.equal(canTransition('DELIVERED', 'REFUNDED'), true)
  assert.equal(canTransition('REFUNDED', 'PENDING'), false)
  assert.equal(canTransition('CANCELLED', 'PENDING'), true)
  // Idempotent updates are legal and must not restock twice.
  assert.equal(canTransition('CANCELLED', 'CANCELLED'), true)
})

test('inactive statuses are the ones that release stock reservations', () => {
  assert.equal(isInactiveStatus('CANCELLED'), true)
  assert.equal(isInactiveStatus('REFUNDED'), true)
  assert.equal(isInactiveStatus('PENDING'), false)
  assert.equal(isInactiveStatus('DELIVERED'), false)
})
