import type { CarSpec } from '../../api/types'
import { Card } from '../ui/Card'
import { useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { isFavorite, toggleFavorite } from '../../app/storage/favoritesStore'

function pick(spec: CarSpec | null | undefined, keys: string[]): string | null {
  if (!spec) return null
  for (const k of keys) {
    const v = spec[k]
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v === 'number') return String(v)
  }
  return null
}

export function CarCard({ id, spec, onAddToCompare }: { id: number; spec: CarSpec; onAddToCompare?: (id: number) => void }) {
  const brand = pick(spec, ['brand', 'Brand', 'Company'])
  const model = pick(spec, ['model', 'Model', 'Serie', 'serie'])
  const year = pick(spec, ['year', 'Production Years', 'Year'])

  const { auth } = useAuth()
  const canFavorite = Boolean(auth.isAuthenticated && auth.username)
  const initialFav = useMemo(() => (canFavorite ? isFavorite(auth.username as string, id) : false), [canFavorite, auth.username, id])
  const [fav, setFav] = useState(initialFav)

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 650 }}>{[brand, model].filter(Boolean).join(' ') || `Car #${id}`}</div>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>ID: {id}{year ? ` · ${year}` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {canFavorite ? (
            <button
              onClick={() => setFav(toggleFavorite(auth.username as string, id))}
              style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', height: 38 }}
              title={fav ? 'Remove from favorites' : 'Add to favorites'}
              type="button"
            >
              {fav ? '★ Favorite' : '☆ Favorite'}
            </button>
          ) : null}
          {onAddToCompare ? (
            <button
              onClick={() => onAddToCompare(id)}
              style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', height: 38 }}
              type="button"
            >
              + Compare
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
