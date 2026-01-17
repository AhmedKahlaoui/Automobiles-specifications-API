export type AiSortBy = 'horsepower' | 'combined_mpg' | 'acceleration_0_100' | 'vitesse_max' | 'year' | 'price' | 'torque_nm' | 'id'

export type AiParsed = {
  filters: {
    q?: string
    brand?: string
    model?: string
    min_year?: number
    max_year?: number
    min_price?: number
    max_price?: number
    fuel_type?: string
    transmission?: string
    drive_type?: string
    cylinders?: number
    min_horsepower?: number
    max_horsepower?: number
    min_combined_mpg?: number
    max_combined_mpg?: number
    max_acceleration_0_100?: number
    min_vitesse_max?: number
    max_vitesse_max?: number
    min_torque_nm?: number
    max_torque_nm?: number
  }
  sort: { sort_by: AiSortBy; order: 'asc' | 'desc' }
  interpreted: string[]
  json: Record<string, unknown>
}

function wordBoundaryEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseYearRange(text: string): { min_year?: number; max_year?: number; interpreted: string[] } {
  const t = text.toLowerCase()
  const interpreted: string[] = []

  // around 2018 => +/- 2
  const around = t.match(/\baround\s+(19\d{2}|20\d{2})\b/)
  if (around) {
    const y = Number(around[1])
    if (Number.isFinite(y)) {
      interpreted.push(`Around ${y} (±2 years)`)
      return { min_year: y - 2, max_year: y + 2, interpreted }
    }
  }

  // 2016-2020
  const dash = t.match(/\b(19\d{2}|20\d{2})\s*[-–]\s*(19\d{2}|20\d{2})\b/)
  if (dash) {
    const a = Number(dash[1])
    const b = Number(dash[2])
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const min_year = Math.min(a, b)
      const max_year = Math.max(a, b)
      interpreted.push(`Years ${min_year}–${max_year}`)
      return { min_year, max_year, interpreted }
    }
  }

  // after/since 2018
  const since = t.match(/\b(?:since|after|from)\s+(19\d{2}|20\d{2})\b/)
  if (since) {
    const y = Number(since[1])
    if (Number.isFinite(y)) {
      interpreted.push(`Year ≥ ${y}`)
      return { min_year: y, interpreted }
    }
  }

  // before 2018
  const before = t.match(/\b(?:before|until)\s+(19\d{2}|20\d{2})\b/)
  if (before) {
    const y = Number(before[1])
    if (Number.isFinite(y)) {
      interpreted.push(`Year ≤ ${y}`)
      return { max_year: y, interpreted }
    }
  }

  // single year mention (only if it looks deliberate)
  const single = t.match(/\b(19\d{2}|20\d{2})\b/)
  if (single) {
    const y = Number(single[1])
    if (Number.isFinite(y)) {
      interpreted.push(`Year = ${y}`)
      return { min_year: y, max_year: y, interpreted }
    }
  }

  return { interpreted }
}

function parseFuelType(text: string): string | undefined {
  const t = text.toLowerCase()
  if (t.includes('diesel')) return 'Diesel'
  if (t.includes('electric') || t.includes('ev')) return 'Electric'
  if (t.includes('hybrid')) return 'Hybrid'
  if (t.includes('gasoline') || t.includes('petrol') || /\bgas\b/.test(t)) return 'Gasoline'
  return undefined
}

function parseTransmission(text: string): string | undefined {
  const t = text.toLowerCase()
  if (/\bmanual\b/.test(t)) return 'Manual'
  if (/\bcvt\b/.test(t)) return 'CVT'
  if (/\bautomatic\b|\bauto\b/.test(t)) return 'Automatic'
  return undefined
}

function parseDriveType(text: string): string | undefined {
  const t = text.toLowerCase()
  if (/\bawd\b|\ball\s*wheel\s*drive\b/.test(t)) return 'AWD'
  if (/\b4wd\b|\bfour\s*wheel\s*drive\b/.test(t)) return '4WD'
  if (/\bfwd\b|\bfront\s*wheel\s*drive\b/.test(t)) return 'FWD'
  if (/\brwd\b|\brear\s*wheel\s*drive\b/.test(t)) return 'RWD'
  return undefined
}

function parseIntSafe(v: string): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function parseFloatSafe(v: string): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseMoneyToken(token: string): number | null {
  const t = token.trim().toLowerCase().replace(/[$€,]/g, '')
  const m = t.match(/^(\d+(?:\.\d+)?)(k)?$/)
  if (!m) return null
  const base = m[1] ? parseFloatSafe(m[1]) : null
  if (base === null) return null
  return m[2] ? Math.round(base * 1000) : Math.round(base)
}

function stripMatched(text: string, re: RegExp): string {
  return text.replace(re, ' ')
}

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function parseNumericFilters(text: string): { filters: Partial<AiParsed['filters']>; interpreted: string[]; stripped: string } {
  let stripped = text
  const interpreted: string[] = []
  const filters: Partial<AiParsed['filters']> = {}

  // Price
  // between 20k and 35k
  const priceBetween = stripped.match(/\b(?:price\s*)?(?:between|from)\s*([$€]?\s*\d+(?:[\d,]*)(?:\.\d+)?k?)\s*(?:and|to)\s*([$€]?\s*\d+(?:[\d,]*)(?:\.\d+)?k?)\b/i)
  if (priceBetween) {
    const a = priceBetween[1] ? parseMoneyToken(priceBetween[1]) : null
    const b = priceBetween[2] ? parseMoneyToken(priceBetween[2]) : null
    if (a !== null && b !== null) {
      filters.min_price = Math.min(a, b)
      filters.max_price = Math.max(a, b)
      interpreted.push(`Price: ${filters.min_price}–${filters.max_price}`)
      stripped = stripMatched(stripped, /\b(?:price\s*)?(?:between|from)\s*([$€]?\s*\d+(?:[\d,]*)(?:\.\d+)?k?)\s*(?:and|to)\s*([$€]?\s*\d+(?:[\d,]*)(?:\.\d+)?k?)\b/i)
    }
  }

  const priceMax = stripped.match(/\b(?:price\s*)?(?:under|below|less\s+than|max)\s*([$€]?\s*\d+(?:[\d,]*)(?:\.\d+)?k?)\b/i)
  if (priceMax) {
    const v = priceMax[1] ? parseMoneyToken(priceMax[1]) : null
    if (v !== null) {
      filters.max_price = v
      interpreted.push(`Price ≤ ${v}`)
      stripped = stripMatched(stripped, /\b(?:price\s*)?(?:under|below|less\s+than|max)\s*([$€]?\s*\d+(?:[\d,]*)(?:\.\d+)?k?)\b/i)
    }
  }
  const priceMin = stripped.match(/\b(?:price\s*)?(?:over|above|more\s+than|min)\s*([$€]?\s*\d+(?:[\d,]*)(?:\.\d+)?k?)\b/i)
  if (priceMin) {
    const v = priceMin[1] ? parseMoneyToken(priceMin[1]) : null
    if (v !== null) {
      filters.min_price = v
      interpreted.push(`Price ≥ ${v}`)
      stripped = stripMatched(stripped, /\b(?:price\s*)?(?:over|above|more\s+than|min)\s*([$€]?\s*\d+(?:[\d,]*)(?:\.\d+)?k?)\b/i)
    }
  }

  // Horsepower
  const hpBetween = stripped.match(/\b(?:between|from)\s*(\d{2,4})\s*(?:and|to)\s*(\d{2,4})\s*(?:hp|horsepower)\b/i)
  if (hpBetween) {
    const a = hpBetween[1] ? parseIntSafe(hpBetween[1]) : null
    const b = hpBetween[2] ? parseIntSafe(hpBetween[2]) : null
    if (a !== null && b !== null) {
      filters.min_horsepower = Math.min(a, b)
      filters.max_horsepower = Math.max(a, b)
      interpreted.push(`Horsepower: ${filters.min_horsepower}–${filters.max_horsepower} hp`)
      stripped = stripMatched(stripped, /\b(?:between|from)\s*(\d{2,4})\s*(?:and|to)\s*(\d{2,4})\s*(?:hp|horsepower)\b/i)
    }
  }

  const hpMin = stripped.match(/\b(?:at\s*least|min|over|above|more\s+than)\s*(\d{2,4})\s*(?:hp|horsepower)\b/i)
  if (hpMin) {
    const v = hpMin[1] ? parseIntSafe(hpMin[1]) : null
    if (v !== null) {
      filters.min_horsepower = v
      interpreted.push(`Horsepower ≥ ${v} hp`)
      stripped = stripMatched(stripped, /\b(?:at\s*least|min|over|above|more\s+than)\s*(\d{2,4})\s*(?:hp|horsepower)\b/i)
    }
  }

  const hpMax = stripped.match(/\b(?:at\s*most|max|under|below|less\s+than)\s*(\d{2,4})\s*(?:hp|horsepower)\b/i)
  if (hpMax) {
    const v = hpMax[1] ? parseIntSafe(hpMax[1]) : null
    if (v !== null) {
      filters.max_horsepower = v
      interpreted.push(`Horsepower ≤ ${v} hp`)
      stripped = stripMatched(stripped, /\b(?:at\s*most|max|under|below|less\s+than)\s*(\d{2,4})\s*(?:hp|horsepower)\b/i)
    }
  }

  // MPG (combined)
  const mpgMin = stripped.match(/\b(?:at\s*least|min|over|above|more\s+than)\s*(\d{2,3}(?:\.\d+)?)\s*mpg\b/i)
  if (mpgMin) {
    const v = mpgMin[1] ? parseFloatSafe(mpgMin[1]) : null
    if (v !== null) {
      filters.min_combined_mpg = v
      interpreted.push(`Combined MPG ≥ ${v}`)
      stripped = stripMatched(stripped, /\b(?:at\s*least|min|over|above|more\s+than)\s*(\d{2,3}(?:\.\d+)?)\s*mpg\b/i)
    }
  }

  // 0-100 time under X seconds
  const accelMax = stripped.match(/\b(?:0\s*[-–]?\s*100|0\s*to\s*100)\s*(?:under|below|less\s+than|max)\s*(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds)\b/i)
  if (accelMax) {
    const v = accelMax[1] ? parseFloatSafe(accelMax[1]) : null
    if (v !== null) {
      filters.max_acceleration_0_100 = v
      interpreted.push(`0–100 ≤ ${v}s`)
      stripped = stripMatched(stripped, /\b(?:0\s*[-–]?\s*100|0\s*to\s*100)\s*(?:under|below|less\s+than|max)\s*(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds)\b/i)
    }
  }

  // Top speed
  const topMin = stripped.match(/\b(?:top\s*speed|vitesse|max\s*speed)\s*(?:over|above|more\s+than|min|at\s*least)\s*(\d{2,3})\b/i)
  if (topMin) {
    const v = topMin[1] ? parseIntSafe(topMin[1]) : null
    if (v !== null) {
      filters.min_vitesse_max = v
      interpreted.push(`Top speed ≥ ${v}`)
      stripped = stripMatched(stripped, /\b(?:top\s*speed|vitesse|max\s*speed)\s*(?:over|above|more\s+than|min|at\s*least)\s*(\d{2,3})\b/i)
    }
  }

  // Torque
  const tqMin = stripped.match(/\b(?:torque)\s*(?:over|above|more\s+than|min|at\s*least)\s*(\d{2,4})\s*(?:nm)?\b/i)
  if (tqMin) {
    const v = tqMin[1] ? parseIntSafe(tqMin[1]) : null
    if (v !== null) {
      filters.min_torque_nm = v
      interpreted.push(`Torque ≥ ${v} Nm`)
      stripped = stripMatched(stripped, /\b(?:torque)\s*(?:over|above|more\s+than|min|at\s*least)\s*(\d{2,4})\s*(?:nm)?\b/i)
    }
  }

  // Cylinders
  const cyl = stripped.match(/\b(\d{1,2})\s*(?:cyl|cylinders?)\b/i)
  if (cyl) {
    const v = cyl[1] ? parseIntSafe(cyl[1]) : null
    if (v !== null) {
      filters.cylinders = v
      interpreted.push(`Cylinders = ${v}`)
      stripped = stripMatched(stripped, /\b(\d{1,2})\s*(?:cyl|cylinders?)\b/i)
    }
  }

  return { filters, interpreted, stripped: normalizeSpaces(stripped) }
}

function chooseSort(text: string): { sort_by: AiSortBy; order: 'asc' | 'desc'; interpreted: string[] } {
  const t = text.toLowerCase()
  const interpreted: string[] = []

  const wantsHp = /(horsepower|\bhp\b|power)/.test(t) || /strong horsepower|high horsepower|more power/.test(t)
  const wantsMpg = /(mpg|fuel efficiency|efficient|good mpg|economy)/.test(t)
  const wantsFast = /(fast|quick|0-100|0\s*to\s*100|acceleration)/.test(t)
  const wantsTopSpeed = /(top speed|vitesse|max speed)/.test(t)
  const wantsNew = /(newest|latest|recent)/.test(t)
  const wantsCheap = /(cheap|budget|affordable|low price|lowest price)/.test(t)
  const wantsExpensive = /(expensive|premium|luxury|high price)/.test(t)
  const wantsTorque = /(torque)/.test(t)

  if (wantsHp) {
    interpreted.push('Sort by horsepower (desc)')
    if (wantsMpg) interpreted.push('Note: also mentioned MPG (secondary)')
    return { sort_by: 'horsepower', order: 'desc', interpreted }
  }
  if (wantsMpg) {
    interpreted.push('Sort by combined MPG (desc)')
    return { sort_by: 'combined_mpg', order: 'desc', interpreted }
  }
  if (wantsFast) {
    interpreted.push('Sort by acceleration 0–100 (asc)')
    return { sort_by: 'acceleration_0_100', order: 'asc', interpreted }
  }
  if (wantsTopSpeed) {
    interpreted.push('Sort by top speed (desc)')
    return { sort_by: 'vitesse_max', order: 'desc', interpreted }
  }
  if (wantsNew) {
    interpreted.push('Sort by year (desc)')
    return { sort_by: 'year', order: 'desc', interpreted }
  }

  if (wantsCheap) {
    interpreted.push('Sort by price (asc)')
    return { sort_by: 'price', order: 'asc', interpreted }
  }
  if (wantsExpensive) {
    interpreted.push('Sort by price (desc)')
    return { sort_by: 'price', order: 'desc', interpreted }
  }
  if (wantsTorque) {
    interpreted.push('Sort by torque (desc)')
    return { sort_by: 'torque_nm', order: 'desc', interpreted }
  }

  interpreted.push('Sort by year (desc)')
  return { sort_by: 'year', order: 'desc', interpreted }
}

function inferModelFromPrompt(prompt: string, brand: string | undefined, knownBrands: string[]): string | undefined {
  let t = prompt

  // strip years and common year phrases
  t = stripMatched(t, /\b(?:around|since|after|from|before|until)\s+(19\d{2}|20\d{2})\b/gi)
  t = stripMatched(t, /\b(19\d{2}|20\d{2})\s*[-–]\s*(19\d{2}|20\d{2})\b/gi)
  t = stripMatched(t, /\b(19\d{2}|20\d{2})\b/g)

  // strip common preference words
  t = stripMatched(t, /\b(horsepower|hp|mpg|efficient|economy|fast|quick|acceleration|0\s*[-–]?\s*100|top\s*speed|vitesse|newest|latest|recent|cheap|budget|affordable|premium|luxury|price|torque|manual|automatic|auto|cvt|awd|4wd|fwd|rwd|diesel|hybrid|electric|ev|gasoline|petrol|gas)\b/gi)

  // strip common body/class keywords (these should become q, not model)
  t = stripMatched(t, /\b(suv|crossover|sedan|saloon|hatchback|coupe|wagon|estate|convertible|cabriolet|pickup|truck|van|minivan)\b/gi)

  // strip time/unit tokens (e.g. "7s", "6.5 sec")
  t = stripMatched(t, /\b\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds)\b/gi)

  // strip numbers and comparators
  t = stripMatched(t, /\b(?:under|below|less\s+than|over|above|more\s+than|between|from|to|min|max|at\s*least|at\s*most)\b/gi)
  t = stripMatched(t, /\b\d+(?:\.\d+)?\b/g)

  // strip brand names
  const brands = [...knownBrands].filter(Boolean).sort((a, b) => b.length - a.length)
  for (const b of brands) {
    const re = new RegExp(`\\b${wordBoundaryEscape(b)}\\b`, 'gi')
    t = t.replace(re, ' ')
  }
  if (brand) {
    const re = new RegExp(`\\b${wordBoundaryEscape(brand)}\\b`, 'gi')
    t = t.replace(re, ' ')
  }

  // clean punctuation (commas in prompts are very common)
  t = t.replace(/[^a-zA-Z0-9\s-]/g, ' ')

  const cleaned = normalizeSpaces(t)
  if (!cleaned) return undefined

  // Only infer a model from plausible leftover tokens (avoid generic/units-only leftovers)
  const stopTokens = new Set([
    'and',
    'or',
    'with',
    'without',
    'for',
    'a',
    'an',
    'the',
    'in',
    'on',
    'of',
  ])

  const tokens = cleaned
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !stopTokens.has(x.toLowerCase()))
    .filter((x) => /[a-zA-Z]/.test(x))

  if (tokens.length === 0) return undefined

  const phrase = tokens.join(' ')
  if (phrase.length <= 40) return phrase
  return tokens.slice(0, 3).join(' ')
}

export function parseAiSearch(prompt: string, knownBrands: string[] = []): AiParsed {
  const interpreted: string[] = []
  const text = prompt.trim()

  const fuel_type = parseFuelType(text)
  if (fuel_type) interpreted.push(`Fuel: ${fuel_type}`)

  const transmission = parseTransmission(text)
  if (transmission) interpreted.push(`Transmission: ${transmission}`)

  const drive_type = parseDriveType(text)
  if (drive_type) interpreted.push(`Drive: ${drive_type}`)

  const numeric = parseNumericFilters(text)
  interpreted.push(...numeric.interpreted)

  const year = parseYearRange(text)
  interpreted.push(...year.interpreted)

  let brand: string | undefined
  // pick the longest matching brand name first (avoids matching "GM" in longer strings etc)
  const brands = [...knownBrands].filter(Boolean).sort((a, b) => b.length - a.length)
  for (const b of brands) {
    const re = new RegExp(`\\b${wordBoundaryEscape(b)}\\b`, 'i')
    if (re.test(text)) {
      brand = b
      break
    }
  }
  if (brand) interpreted.push(`Brand: ${brand}`)

  const model = inferModelFromPrompt(text, brand, knownBrands)
  if (model) interpreted.push(`Model: ${model}`)

  // Body/class keywords: best-effort via generic q (matches raw_spec, brand/model, etc.)
  let q: string | undefined
  const lower = text.toLowerCase()
  const bodyKeywords = ['suv', 'sedan', 'hatchback', 'coupe', 'wagon', 'convertible', 'cabriolet', 'pickup', 'truck', 'van', 'minivan']
  for (const k of bodyKeywords) {
    if (lower.includes(k)) {
      q = k
      interpreted.push(`Class/body keyword: ${k}`)
      break
    }
  }

  const sort = chooseSort(text)
  interpreted.push(...sort.interpreted)

  const filters: AiParsed['filters'] = {
    q,
    brand,
    model,
    min_year: year.min_year,
    max_year: year.max_year,
    min_price: numeric.filters.min_price,
    max_price: numeric.filters.max_price,
    fuel_type,
    transmission,
    drive_type,
    cylinders: numeric.filters.cylinders,
    min_horsepower: numeric.filters.min_horsepower,
    max_horsepower: numeric.filters.max_horsepower,
    min_combined_mpg: numeric.filters.min_combined_mpg,
    max_combined_mpg: numeric.filters.max_combined_mpg,
    max_acceleration_0_100: numeric.filters.max_acceleration_0_100,
    min_vitesse_max: numeric.filters.min_vitesse_max,
    max_vitesse_max: numeric.filters.max_vitesse_max,
    min_torque_nm: numeric.filters.min_torque_nm,
    max_torque_nm: numeric.filters.max_torque_nm,
  }

  // Build a JSON-like object we can show in the UI.
  const json: Record<string, unknown> = {
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.brand ? { brand: filters.brand } : {}),
    ...(filters.model ? { model: filters.model } : {}),
    ...(filters.min_year !== undefined ? { min_year: filters.min_year } : {}),
    ...(filters.max_year !== undefined ? { max_year: filters.max_year } : {}),
    ...(filters.min_price !== undefined ? { min_price: filters.min_price } : {}),
    ...(filters.max_price !== undefined ? { max_price: filters.max_price } : {}),
    ...(filters.fuel_type ? { fuel_type: filters.fuel_type } : {}),
    ...(filters.transmission ? { transmission: filters.transmission } : {}),
    ...(filters.drive_type ? { drive_type: filters.drive_type } : {}),
    ...(filters.cylinders !== undefined ? { cylinders: filters.cylinders } : {}),
    ...(filters.min_horsepower !== undefined ? { min_horsepower: filters.min_horsepower } : {}),
    ...(filters.max_horsepower !== undefined ? { max_horsepower: filters.max_horsepower } : {}),
    ...(filters.min_combined_mpg !== undefined ? { min_combined_mpg: filters.min_combined_mpg } : {}),
    ...(filters.max_combined_mpg !== undefined ? { max_combined_mpg: filters.max_combined_mpg } : {}),
    ...(filters.max_acceleration_0_100 !== undefined ? { max_acceleration_0_100: filters.max_acceleration_0_100 } : {}),
    ...(filters.min_vitesse_max !== undefined ? { min_vitesse_max: filters.min_vitesse_max } : {}),
    ...(filters.max_vitesse_max !== undefined ? { max_vitesse_max: filters.max_vitesse_max } : {}),
    ...(filters.min_torque_nm !== undefined ? { min_torque_nm: filters.min_torque_nm } : {}),
    ...(filters.max_torque_nm !== undefined ? { max_torque_nm: filters.max_torque_nm } : {}),
    sort_by: sort.sort_by,
    order: sort.order
  }

  return {
    filters,
    sort,
    interpreted,
    json
  }
}
