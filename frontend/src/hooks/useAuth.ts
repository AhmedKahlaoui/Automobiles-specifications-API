import { useAuthContext } from '../app/auth/AuthProvider'

export function useAuth() {
  return useAuthContext()
}
