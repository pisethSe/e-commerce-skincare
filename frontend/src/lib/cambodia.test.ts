import { describe, expect, it } from 'vitest'
import {
  PHNOM_PENH_KHANS,
  buildCambodiaAddress,
  isValidKhan,
  isValidKhPhone,
  isValidProvince,
  isValidZip,
} from './cambodia'

describe('Cambodia delivery areas', () => {
  it('recognises Phnom Penh khans, case- and space-insensitively', () => {
    expect(isValidKhan('Chamkarmon')).toBe(true)
    expect(isValidKhan(' sen sok ')).toBe(true)
    expect(isValidKhan('Chbar Ampov')).toBe(true)
    expect(isValidKhan('California')).toBe(false)
  })

  it('keeps khans out of the province list', () => {
    expect(isValidProvince('Siem Reap')).toBe(true)
    expect(isValidProvince('Chbar Ampov')).toBe(false)
  })

  it('maps Phnom Penh to capital + khan + 12000', () => {
    expect(buildCambodiaAddress('phnom_penh', ' Chamkarmon ')).toEqual({
      city: 'Phnom Penh',
      state: 'Chamkarmon',
      zip: '12000',
      country: 'Cambodia',
    })
  })

  it('maps a province without inventing a postal code', () => {
    expect(buildCambodiaAddress('province', 'Siem Reap')).toEqual({
      city: 'Siem Reap',
      state: 'Siem Reap',
      zip: '',
      country: 'Cambodia',
    })
  })

  it('keeps postal code and phone validation strict', () => {
    expect(isValidZip('12000')).toBe(true)
    expect(isValidZip('')).toBe(false)
    expect(isValidKhPhone('012 345 678')).toBe(true)
    expect(isValidKhPhone('+855 12 345 678')).toBe(true)
    expect(isValidKhPhone('555-1234')).toBe(false)
  })

  it('lists every khan exactly once', () => {
    expect(new Set(PHNOM_PENH_KHANS).size).toBe(PHNOM_PENH_KHANS.length)
  })
})
