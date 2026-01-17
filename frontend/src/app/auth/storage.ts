const KEY = 'automobile_specs_auth'

type StoredAuth = { token: string }

export function loadToken(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredAuth
    return data.token
  } catch {
    return null
  }
}

export function saveToken(token: string) {
  localStorage.setItem(KEY, JSON.stringify({ token } satisfies StoredAuth))
}

export function clearToken() {
  localStorage.removeItem(KEY)
}
