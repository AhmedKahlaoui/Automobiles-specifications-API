import { httpJson } from './http'
import type { AuthLoginRequest, AuthLoginResponse, AuthRegisterRequest } from './types'

export const authApi = {
  register: (req: AuthRegisterRequest) => httpJson<{ message: string } | { message: string; user: any }>('/auth/register', { method: 'POST', body: req }),
  login: (req: AuthLoginRequest) => httpJson<AuthLoginResponse>('/auth/login', { method: 'POST', body: req })
}
