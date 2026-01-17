import { authApi } from '../api/authApi'
import type { AuthLoginRequest, AuthRegisterRequest } from '../api/types'

export const authService = {
  register: (req: AuthRegisterRequest) => authApi.register(req),
  login: (req: AuthLoginRequest) => authApi.login(req)
}
