import type { CompareResponse } from '../../api/types'
import { Card } from '../ui/Card'

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

function formatMetricValue(metric: string, v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return ''
    // backend tries to normalize placeholders, but keep UI safe
    if (v <= 0 && metric !== 'year') return ''
    return String(v)
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return ''
    if (/^(n\/?a|na|null|none|unknown|undefined|-)$/i.test(s)) return ''
    if ((s === '0' || s === '0.0') && metric !== 'year') return ''
    return s
  }
  return formatValue(v)
}

function pick(spec: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = spec[k]
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v === 'number') return String(v)
  }
  return null
}

function carLabel(spec: Record<string, unknown>): string {
  const brand = pick(spec, ['brand', 'Brand', 'Company'])
  const model = pick(spec, ['model', 'Model', 'Serie', 'serie'])
  const year = pick(spec, ['year', 'Year', 'Production Years'])
  const name = [brand, model].filter(Boolean).join(' ')
  return [name || null, year ? `(${year})` : null].filter(Boolean).join(' ')
}

export function CompareResults({ data }: { data: CompareResponse }) {
  return (
    <div className="grid" style={{ gap: 14 }}>
      {data.cars.map((c) => (
        <Card key={c.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <div style={{ fontWeight: 650 }}>
              Car #{c.id}
              <span style={{ color: 'var(--muted)', fontWeight: 500, marginLeft: 10 }}>{carLabel(c.spec)}</span>
            </div>
            {c.winning_metrics?.length ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Wins: {c.winning_metrics.map((m) => m.metric_display).join(', ')}</div>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No wins</div>
            )}
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {Object.entries(data.comparison_winners).map(([metric, w]) => {
              const isWinner = w.car_id === c.id
              const carValue = formatMetricValue(metric, c.metrics?.[metric])
              const fallbackValue = isWinner ? formatMetricValue(metric, w.value) : ''
              const value = carValue || fallbackValue
              return (
                <div key={metric} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 12, background: isWinner ? 'rgba(81, 207, 102, 0.10)' : 'rgba(255,255,255,0.03)' }}>
                  <span style={{ color: 'var(--muted)' }}>{w.metric_display}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: isWinner ? 650 : 500 }}>{value}</span>
                    {isWinner ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 650,
                          padding: '2px 8px',
                          borderRadius: 999,
                          border: '1px solid rgba(81, 207, 102, 0.35)',
                          background: 'rgba(81, 207, 102, 0.12)',
                          color: 'rgba(81, 207, 102, 0.95)'
                        }}
                      >
                        Winner
                      </span>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}
