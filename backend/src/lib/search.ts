/**
 * Catalog search scoring — small, dependency-free, and database-agnostic.
 *
 * Matching is token-based with field weighting, prefix handling, and a bounded
 * Levenshtein fallback so "clenser" still finds the cleanser. The catalog is
 * fetched once per search (a skincare catalogue is small); if it ever grows
 * beyond the cap, swap the candidate query for a trigram index.
 */

export const SEARCH_CANDIDATE_CAP = 500
const MAX_TOKENS = 6

/** Lowercase, strip diacritics, and collapse punctuation for comparisons. */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function tokenizeQuery(query: string): string[] {
  const tokens = normalizeSearchText(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
  return [...new Set(tokens)].slice(0, MAX_TOKENS)
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    previous = current
  }
  return previous[b.length]
}

/** How many typos we tolerate for a token of a given length. */
function typoBudget(token: string): number {
  if (token.length >= 8) return 2
  if (token.length >= 4) return 1
  return 0
}

/**
 * Score a token against one searchable field.
 * 3 = exact value, 2.5 = whole word, 2 = word prefix, 1.6 = substring,
 * 1 = within the typo budget.
 */
function fieldScore(field: string, token: string): number {
  if (!field) return 0
  if (field === token) return 3

  const words = field.split(/[^a-z0-9]+/).filter(Boolean)
  if (words.includes(token)) return 2.5
  if (words.some((word) => word.startsWith(token))) return 2
  if (field.includes(token)) return 1.6

  const budget = typoBudget(token)
  if (budget > 0) {
    const close = words.some(
      (word) =>
        word.length >= 3 &&
        Math.abs(word.length - token.length) <= budget + 1 &&
        levenshtein(word, token) <= budget
    )
    if (close) return 1
  }
  return 0
}

type SearchableProduct = {
  name: string
  tagline?: string | null
  description: string
  tags?: string[]
  ingredients?: string[]
  category?: { name: string } | null
}

export type ProductMatch = { score: number; matched: number }

/** Field weights: name > tags/tagline > category > description/ingredients. */
export function scoreProduct(product: SearchableProduct, tokens: string[]): ProductMatch {
  const fields: Array<[string, number]> = [
    [normalizeSearchText(product.name), 5],
    [normalizeSearchText(product.tags?.join(' ') ?? ''), 3],
    [normalizeSearchText(product.tagline ?? ''), 2.5],
    [normalizeSearchText(product.category?.name ?? ''), 2],
    [normalizeSearchText(product.description), 1.2],
    [normalizeSearchText(product.ingredients?.join(' ') ?? ''), 1],
  ]

  let score = 0
  let matched = 0

  for (const token of tokens) {
    let best = 0
    for (const [value, weight] of fields) {
      const fieldValue = fieldScore(value, token) * weight
      if (fieldValue > best) best = fieldValue
    }
    if (best > 0) {
      matched++
      score += best
    }
  }

  // Whole-phrase hit in the name is a strong signal ("clay mask").
  if (tokens.length > 1) {
    const phrase = tokens.join(' ')
    if (normalizeSearchText(product.name).includes(phrase)) score += 6
  }

  return { score, matched }
}

/** Build a "did you mean" correction from the vocabulary the catalogue uses. */
export function buildSuggestion(products: SearchableProduct[], tokens: string[]): string | null {
  const vocabulary = new Set<string>()
  for (const product of products) {
    const text = [product.name, product.tagline ?? '', (product.tags ?? []).join(' ')].join(' ')
    for (const word of normalizeSearchText(text).split(/[^a-z0-9]+/)) {
      if (word.length >= 3) vocabulary.add(word)
    }
  }

  let changed = false
  const corrected = tokens.map((token) => {
    if (vocabulary.has(token)) return token
    const budget = Math.max(typoBudget(token), token.length >= 5 ? 2 : 1)

    let bestWord: string | null = null
    let bestDistance = Infinity
    for (const word of vocabulary) {
      if (Math.abs(word.length - token.length) > budget + 1) continue
      const distance = levenshtein(word, token)
      if (distance < bestDistance) {
        bestDistance = distance
        bestWord = word
      }
    }

    if (bestWord && bestDistance <= budget) {
      changed = true
      return bestWord
    }
    return token
  })

  return changed ? corrected.join(' ') : null
}
