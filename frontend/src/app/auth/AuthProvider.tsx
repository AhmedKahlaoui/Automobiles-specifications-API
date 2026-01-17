import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { clearToken, loadToken, saveToken } from './storage'
import { isJwtExpired, parseJwtClaims } from './jwt'

export type AuthState = {
  isAuthenticated: boolean
  token: string | null
  username: string | null
  isAdmin: boolean
  role: 'ADMIN' | 'USER' | null
}

type AuthContextValue = {
  auth: AuthState
  setToken: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function computeAuthState(token: string | null): AuthState {
  if (!token) {
    return { isAuthenticated: false, token: null, username: null, isAdmin: false, role: null }
  }

  const claims = parseJwtClaims(token)
  if (isJwtExpired(claims)) {
    return { isAuthenticated: false, token: null, username: null, isAdmin: false, role: null }
  }

  const isAdmin = Boolean(claims?.is_admin)

  return {
    isAuthenticated: true,
    token,
    username: (claims?.username as string | undefined) ?? null,
    isAdmin,
    role: isAdmin ? 'ADMIN' : 'USER'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => loadToken())

  const auth = useMemo(() => computeAuthState(token), [token])

  const setToken = useCallback((next: string) => {
    saveToken(next)
    setTokenState(next)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ auth, setToken, logout }), [auth, logout, setToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuthContext must be used within AuthProvider')
  return value
}
