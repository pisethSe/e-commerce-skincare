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

const equalsAny = (value: string, options: readonly string[]): boolean =>
  options.some((option) => option.toLowerCase() === value.toLowerCase())

/**
 * Returns an error message when the address is not a valid Cambodian address.
 *
 * `state` carries the delivery area: the khan for Phnom Penh, or the province
 * elsewhere. `city` is "Phnom Penh" or the province name. Postal codes are
 * optional — most Cambodian addresses do not use one.
 */
export function validateCambodianAddress(body: {
  country?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
}): string | null {
  const country = (body.country ?? 'Cambodia').trim()
  if (country.toLowerCase() !== 'cambodia') {
    return 'We currently ship within Cambodia only'
  }

  const area = (body.state ?? '').trim()
  if (!area) {
    return 'Please choose a province or a Phnom Penh district'
  }
  if (!equalsAny(area, CAMBODIA_PROVINCES) && !equalsAny(area, PHNOM_PENH_KHANS)) {
    return `Unknown province or district "${area}" — please choose from the list`
  }

  const zip = (body.zip ?? '').trim()
  if (zip && !/^\d{5}$/.test(zip)) {
    return 'Postal code must be 5 digits (e.g. 12000 for Phnom Penh)'
  }

  const phone = (body.phone ?? '').trim()
  if (phone && !/^(\+?855|0)\d{8,9}$/.test(phone.replace(/[\s-]/g, ''))) {
    return 'Phone must be a Cambodian number (e.g. 012 345 678 or +855 12 345 678)'
  }

  return null
}
