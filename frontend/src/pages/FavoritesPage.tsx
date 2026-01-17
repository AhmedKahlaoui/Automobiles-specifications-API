import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Page } from '../components/layout/Page'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { CarSpecTable } from '../components/cars/CarSpecTable'
import { carService } from '../services/carService'
import { useAuth } from '../hooks/useAuth'
import { useCompare } from '../hooks/useCompare'
import { listFavorites, removeFavorite } from '../app/storage/favoritesStore'
import type { CarSpec } from '../api/types'

function pick(spec: CarSpec, keys: string[]): string | null {
  for (const k of keys) {
    const v = spec[k]
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v === 'number') return String(v)
  }
  return null
}

function carTitle(id: number, spec: CarSpec): string {
  const brand = pick(spec, ['Company', 'Brand', 'brand'])
  const model = pick(spec, ['Model', 'Serie', 'model'])
  const name = [brand, model].filter(Boolean).join(' ').trim()
  return `${name || 'Car'} (ID: ${id})`
}

export function FavoritesPage() {
  const { auth } = useAuth()
  const { add: addToCompare, carIds: compareIds } = useCompare()

  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set())

  const username = auth.username
  const initialFavoriteIds = useMemo(() => (username ? listFavorites(username) : []), [username])
  const [favoriteIds, setFavoriteIds] = useState<number[]>(initialFavoriteIds)

  useEffect(() => {
    setFavoriteIds(initialFavoriteIds)
  }, [initialFavoriteIds])

  const onRemove = (id: number) => {
    if (!username) return
    removeFavorite(username, id)
    setFavoriteIds((prev) => prev.filter((x) => x !== id))
  }

  const onAddToCompare = (id: number) => {
    addToCompare(id)
  }

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const queries = useQueries({
    queries: favoriteIds.map((id) => ({
      queryKey: ['favorite-car', id],
      queryFn: () => carService.getCar(id),
      enabled: auth.isAuthenticated
    }))
  })

  const anyLoading = queries.some((q) => q.isLoading)
  const anyError = queries.find((q) => q.isError)

  if (!auth.isAuthenticated) {
    return (
      <Page title="Favorites" subtitle="Login to see your favorites.">
        <Alert tone="info">
          Please <Link to="/auth/login">login</Link> to manage favorites.
        </Alert>
      </Page>
    )
  }

  return (
    <Page title="Favorites" subtitle={favoriteIds.length ? `${favoriteIds.length} saved cars for ${auth.username ?? 'user'}` : 'No favorites yet'}>
      {anyLoading ? <Spinner label="Loading favorites…" /> : null}
      {anyError ? <Alert tone="danger">{(anyError.error as any)?.message ?? 'Failed to load one or more favorites'}</Alert> : null}

      {!favoriteIds.length ? (
        <Alert tone="info">
          No favorites yet. Use the “Favorite” button on a car card or car details.
        </Alert>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {queries.map((q, idx) => {
            const id = favoriteIds[idx]
            if (id === undefined) return null
            const isExpanded = expandedIds.has(id)
            const spec = (q.data as any)?.car as CarSpec | undefined
            if (!spec) {
              return (
                <div key={id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                    <strong>Car (ID: {id})</strong>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <Button type="button" variant="secondary" onClick={() => toggleExpanded(id)} aria-expanded={isExpanded}>
                        {isExpanded ? 'Hide details' : 'Expand details'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => onAddToCompare(id)} disabled={compareIds.includes(id)}>
                        {compareIds.includes(id) ? 'In compare' : 'Add to compare'}
                      </Button>
                      <Button type="button" variant="danger" onClick={() => onRemove(id)}>
                        Remove
                      </Button>
                      <Link to={`/cars/${id}`}>Details</Link>
                    </div>
                  </div>
                  {isExpanded ? <div style={{ color: 'var(--muted)', marginTop: 6 }}>Details not available</div> : null}
                </div>
              )
            }

            return (
              <div key={id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 650 }}>{carTitle(id, spec)}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <Button type="button" variant="secondary" onClick={() => toggleExpanded(id)} aria-expanded={isExpanded}>
                      {isExpanded ? 'Hide details' : 'Expand details'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => onAddToCompare(id)} disabled={compareIds.includes(id)}>
                      {compareIds.includes(id) ? 'In compare' : 'Add to compare'}
                    </Button>
                    <Button type="button" variant="danger" onClick={() => onRemove(id)}>
                      Remove
                    </Button>
                    <Link to={`/cars/${id}`}>Open</Link>
                  </div>
                </div>
                {isExpanded ? (
                  <div style={{ marginTop: 10 }}>
                    <CarSpecTable spec={spec} maxRows={40} />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}
