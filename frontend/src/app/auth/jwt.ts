export type JwtClaims = {
  username?: string
  is_admin?: boolean
  exp?: number
  [key: string]: unknown
}

export function parseJwtClaims(token: string): JwtClaims | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as JwtClaims
  } catch {
    return null
  }
}

export function isJwtExpired(claims: JwtClaims | null): boolean {
  if (!claims?.exp) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  return nowSeconds >= claims.exp
}
