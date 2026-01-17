import { APP_CONFIG } from '../app/config'

export type ApiError = {
  status: number
  message: string
  details?: unknown
}

function buildUrl(path: string): string {
  const base = APP_CONFIG.apiBaseUrl.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

async function readBodySafe(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function httpJson<T>(
  path: string,
  opts: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    token?: string | null
    query?: Record<string, string | number | boolean | undefined | null>
    body?: unknown
  } = {}
): Promise<T> {
  const url = new URL(buildUrl(path))
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null || v === '') continue
      url.searchParams.set(k, String(v))
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json'
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`

  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  })

  const data = await readBodySafe(res)
  if (!res.ok) {
    const message = (data && typeof data === 'object' && 'error' in data ? (data as any).error : undefined) ??
      `Request failed (${res.status})`
    const err: ApiError = { status: res.status, message, details: data }
    throw err
  }

  return data as T
}
