import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page } from '../components/layout/Page'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import { CarSpecTable } from '../components/cars/CarSpecTable'
import { carService } from '../services/carService'
import { useAuth } from '../hooks/useAuth'
import { isFavorite, toggleFavorite } from '../app/storage/favoritesStore'
import { CarCard } from '../components/cars/CarCard'
import { Link } from 'react-router-dom'
import { useCompare } from '../hooks/useCompare'

export function CarDetailsPage() {
  const { carId } = useParams()
  const id = Number(carId)
  const navigate = useNavigate()

  const { auth } = useAuth()
  const canFavorite = Boolean(auth.isAuthenticated && auth.username && Number.isFinite(id))
  const [fav, setFav] = useState(() => (canFavorite ? isFavorite(auth.username as string, id) : false))

  const query = useQuery({
    queryKey: ['car', id],
    queryFn: () => carService.getCar(id),
    enabled: Number.isFinite(id)
  })

  const { add, carIds } = useCompare()

  const similarQuery = useQuery({
    queryKey: ['car-similar', id],
    queryFn: () => carService.similarCars(id, 8),
    enabled: Number.isFinite(id)
  })

  const spec = useMemo(() => query.data?.car ?? {}, [query.data])
  const similar = useMemo(() => similarQuery.data?.similar_cars ?? [], [similarQuery.data])

  return (
    <Page
      title="Car Details"
      subtitle={Number.isFinite(id) ? `Car ID: ${id}` : 'Invalid car id'}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/search')
            }}
            style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', height: 38 }}
          >
            ← Back
          </button>
          {canFavorite ? (
            <button
              type="button"
              onClick={() => setFav(toggleFavorite(auth.username as string, id))}
              style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', height: 38 }}
            >
              {fav ? '★ Favorited' : '☆ Add to favorites'}
            </button>
          ) : null}
        </>
      }
    >
      {query.isLoading ? <Spinner label="Loading car…" /> : null}
      {query.isError ? <Alert tone="danger">{(query.error as any)?.message ?? 'Failed to load car'}</Alert> : null}
      {query.data ? <CarSpecTable spec={spec} /> : null}

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 650, marginBottom: 10 }}>Similar cars</div>
        {similarQuery.isLoading ? <Spinner label="Finding similar cars…" /> : null}
        {similarQuery.isError ? <Alert tone="danger">{(similarQuery.error as any)?.message ?? 'Failed to load similar cars'}</Alert> : null}
        {similarQuery.data && similar.length === 0 ? <Alert tone="info">No similar cars found.</Alert> : null}

        <div className="grid" style={{ gap: 12 }}>
          {similar.map((c) => (
            <div key={c.id} style={{ display: 'grid', gap: 8 }}>
              <CarCard id={c.id} spec={c.spec} onAddToCompare={add} />
              <div style={{ display: 'flex', gap: 10, color: 'var(--muted)', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link to={`/cars/${c.id}`}>Open specs</Link>
                <span>·</span>
                <Link to={`/compare?ids=${c.id}`}>Compare</Link>
                {Number.isFinite(c.similarity_score) ? (
                  <>
                    <span>·</span>
                    <span>Similarity: {c.similarity_score}</span>
                  </>
                ) : null}
                {carIds.includes(c.id) ? (
                  <>
                    <span>·</span>
                    <span>In compare list</span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  )
}
