export type FavoriteId = number

type StoreShape = {
  ids: FavoriteId[]
}

function keyForUser(username: string) {
  return `automobile_specs_favorites:${username}`
}

function loadShape(username: string): StoreShape {
  try {
    const raw = localStorage.getItem(keyForUser(username))
    if (!raw) return { ids: [] }
    const parsed = JSON.parse(raw) as Partial<StoreShape>
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)) : []
    return { ids }
  } catch {
    return { ids: [] }
  }
}

function saveShape(username: string, shape: StoreShape) {
  localStorage.setItem(keyForUser(username), JSON.stringify(shape))
}

export function listFavorites(username: string): FavoriteId[] {
  return loadShape(username).ids
}

export function isFavorite(username: string, carId: number): boolean {
  return loadShape(username).ids.includes(carId)
}

export function addFavorite(username: string, carId: number) {
  const shape = loadShape(username)
  if (!shape.ids.includes(carId)) {
    shape.ids = [...shape.ids, carId]
    saveShape(username, shape)
  }
}

export function removeFavorite(username: string, carId: number) {
  const shape = loadShape(username)
  shape.ids = shape.ids.filter((id) => id !== carId)
  saveShape(username, shape)
}

export function toggleFavorite(username: string, carId: number): boolean {
  const shape = loadShape(username)
  const next = !shape.ids.includes(carId)
  if (next) shape.ids = [...shape.ids, carId]
  else shape.ids = shape.ids.filter((id) => id !== carId)
  saveShape(username, shape)
  return next
}
