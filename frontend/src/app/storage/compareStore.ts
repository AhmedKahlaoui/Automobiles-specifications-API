const KEY = 'automobile_specs_compare'

type Stored = { carIds: number[] }

export function loadCompareIds(): number[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as Stored
    return Array.isArray(data.carIds) ? data.carIds.filter((n) => Number.isFinite(n)) : []
  } catch {
    return []
  }
}

export function saveCompareIds(carIds: number[]) {
  localStorage.setItem(KEY, JSON.stringify({ carIds } satisfies Stored))
}
