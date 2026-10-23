// Cambodian address validation — mirrors backend/src/lib/validation.ts.
// The store ships within Cambodia only.

export const CAMBODIA_PROVINCES = [
  'Banteay Meanchey',
  'Battambang',
  'Kampong Cham',
  'Kampong Chhnang',
  'Kampong Speu',
  'Kampong Thom',
  'Kampot',
  'Kandal',
  'Kep',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Oddar Meanchey',
  'Pailin',
  'Phnom Penh',
  'Preah Vihear',
  'Prey Veng',
  'Pursat',
  'Ratanakiri',
  'Siem Reap',
  'Preah Sihanouk',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Tbong Khmum',
] as const

/** Phnom Penh's khans (districts). */
export const PHNOM_PENH_KHANS = [
  'Boeung Keng Kang',
  'Chamkarmon',
  'Chbar Ampov',
  'Chroy Changvar',
  'Daun Penh',
  'Dangkao',
  'Kamboul',
  'Mean Chey',
  '7 Makara',
  'Por Sen Chey',
  'Prek Pnov',
  'Russey Keo',
  'Sen Sok',
  'Toul Kork',
] as const

export type CambodiaProvince = (typeof CAMBODIA_PROVINCES)[number]
export type PhnomPenhKhan = (typeof PHNOM_PENH_KHANS)[number]
export type LocationType = 'phnom_penh' | 'province'

export function isValidProvince(value: string): boolean {
  return CAMBODIA_PROVINCES.some((p) => p.toLowerCase() === value.trim().toLowerCase())
}

export function isValidKhan(value: string): boolean {
  return PHNOM_PENH_KHANS.some((k) => k.toLowerCase() === value.trim().toLowerCase())
}

export function isValidZip(value: string): boolean {
  return /^\d{5}$/.test(value.trim())
}

export function isValidKhPhone(value: string): boolean {
  return /^(\+?855|0)\d{8,9}$/.test(value.replace(/[\s-]/g, '').trim())
}

/**
 * Maps the two-field delivery UI (Phnom Penh / province + khan or province)
 * onto the stored address columns. Phnom Penh keeps its khan in `state` so
 * fulfilment and analytics can still tell Chamkarmon from Sen Sok.
 */
export function buildCambodiaAddress(
  location: LocationType,
  area: string,
): { city: string; state: string; zip: string; country: string } {
  const clean = area.trim()
  if (location === 'phnom_penh') {
    return { city: 'Phnom Penh', state: clean, zip: '12000', country: 'Cambodia' }
  }
  return { city: clean, state: clean, zip: '', country: 'Cambodia' }
}
