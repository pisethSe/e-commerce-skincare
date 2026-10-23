import { describe, expect, it } from 'vitest'
import { translate } from './i18n'

describe('translate', () => {
  it('returns English copy', () => {
    expect(translate('en', 'nav.hi', { name: 'Sopheak' })).toBe('HI, Sopheak')
  })

  it('returns Khmer copy with the same interpolation', () => {
    const khmer = translate('km', 'nav.hi', { name: 'Sopheak' })
    expect(khmer).toContain('Sopheak')
    expect(khmer).not.toBe(translate('en', 'nav.hi', { name: 'Sopheak' }))
  })

  it('interpolates numeric placeholders', () => {
    expect(translate('en', 'common.productsCount', { count: 3 })).toBe('3 products')
    expect(translate('en', 'shop.priceBetween', { min: '$40', max: '$70' })).toBe('$40 – $70')
  })

  it('falls back to the key when a dictionary entry is missing', () => {
    // Guards the rendering path if a page ever passes a stale key.
    expect(translate('en', 'not.a.real.key' as never)).toBe('not.a.real.key')
  })
})
