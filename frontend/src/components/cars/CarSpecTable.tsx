import type { CarSpec } from '../../api/types'
import { Table } from '../ui/Table'

function isMissingValue(key: string, v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return true
    // Treat 0/negative as placeholder for performance/spec fields.
    if (v <= 0) {
      return /(hp|horse|power|mpg|accel|0\s*[-–]?\s*100|speed|vitesse|torque|cyl|length|width|height)/i.test(key)
    }
    return false
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return true
    if (/^(n\/?a|na|null|none|unknown|undefined|-)$/i.test(s)) return true
    if (s === '0' || s === '0.0') {
      return /(hp|horse|power|mpg|accel|0\s*[-–]?\s*100|speed|vitesse|torque|cyl|length|width|height)/i.test(key)
    }
    return false
  }
  if (typeof v === 'boolean') return false
  if (typeof v === 'object') {
    // If it's an empty object/array, treat as missing.
    try {
      const asAny = v as any
      if (Array.isArray(asAny) && asAny.length === 0) return true
      if (!Array.isArray(asAny) && Object.keys(asAny).length === 0) return true
    } catch {
      // ignore
    }
  }
  return false
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function CarSpecTable({ spec, maxRows = 28 }: { spec: CarSpec; maxRows?: number }) {
  const entries = Object.entries(spec)
    .filter(([k]) => k !== 'id')
    .filter(([k, v]) => !isMissingValue(k, v))

  const rows = entries.slice(0, maxRows).map(([k, v]) => [k, formatValue(v)])

  return <Table columns={['Field', 'Value']} rows={rows.map((r) => [r[0], r[1]])} />
}
