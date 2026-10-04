// Cambodian address validation — the store ships within Cambodia only.

/** Cambodia's 25 provinces and capital. */
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

/** Returns an error message when the address is not a valid Cambodian address. */
export function validateCambodianAddress(body: {
  country?: string
  state?: string
  zip?: string
  phone?: string
}): string | null {
  const country = (body.country ?? 'Cambodia').trim()
  if (country.toLowerCase() !== 'cambodia') {
    return 'We currently ship within Cambodia only'
  }

  const province = (body.state ?? '').trim()
  if (!province) {
    return 'Province is required'
  }
  const knownProvince = CAMBODIA_PROVINCES.some(
    (p) => p.toLowerCase() === province.toLowerCase(),
  )
  if (!knownProvince) {
    return `Unknown province "${province}" — please choose one of Cambodia's 25 provinces`
  }

  const zip = (body.zip ?? '').trim()
  if (!/^\d{5}$/.test(zip)) {
    return 'Postal code must be 5 digits (e.g. 12000 for Phnom Penh)'
  }

  const phone = (body.phone ?? '').trim()
  if (phone && !/^(\+?855|0)\d{8,9}$/.test(phone.replace(/[\s-]/g, ''))) {
    return 'Phone must be a Cambodian number (e.g. 012 345 678 or +855 12 345 678)'
  }

  return null
}
