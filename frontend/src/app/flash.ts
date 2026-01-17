export type FlashTone = 'success' | 'danger' | 'info'

export type FlashMessage = {
  tone: FlashTone
  text: string
}

const KEY = 'automobile_specs_flash'

export function setFlash(message: FlashMessage) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(message))
  } catch {
    // ignore
  }
}

export function consumeFlash(): FlashMessage | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    return JSON.parse(raw) as FlashMessage
  } catch {
    return null
  }
}
