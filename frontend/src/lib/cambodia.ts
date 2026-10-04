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

export type CambodiaProvince = (typeof CAMBODIA_PROVINCES)[number]

export function isValidProvince(value: string): boolean {
  return CAMBODIA_PROVINCES.some((p) => p.toLowerCase() === value.trim().toLowerCase())
}

export function isValidZip(value: string): boolean {
  return /^\d{5}$/.test(value.trim())
}

export function isValidKhPhone(value: string): boolean {
  return /^(\+?855|0)\d{8,9}$/.test(value.replace(/[\s-]/g, '').trim())
}
