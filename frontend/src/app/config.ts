export const APP_CONFIG = {
  apiBaseUrl:
    (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() || 'http://127.0.0.1:5000/api/v1'
}
