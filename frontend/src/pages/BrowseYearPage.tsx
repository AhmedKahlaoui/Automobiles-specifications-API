import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Page } from '../components/layout/Page'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { CarCard } from '../components/cars/CarCard'
import { browseService } from '../services/browseService'
import { useCompare } from '../hooks/useCompare'

function toInt(v: string | null, fallback: number): number {
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

export function BrowseYearPage() {
  const { year: yearParam = '' } = useParams<{ year: string }>()
  const year = toInt(yearParam, NaN)

  const [params, setParams] = useSearchParams()
  const page = toInt(params.get('page'), 1)
  const perPage = toInt(params.get('per_page'), 20)

  const { add, carIds } = useCompare()

  const q = useQuery({
    queryKey: ['browse-year-cars', year, page, perPage],
    queryFn: () => browseService.carsByYear(year, { page, per_page: perPage }),
    enabled: Number.isFinite(year)
  })

  const cars = useMemo(() => q.data?.cars ?? [], [q.data])

  if (!Number.isFinite(year)) {
    return (
      <Page title="Year" subtitle="Invalid year">
        <Alert tone="danger">Invalid year.</Alert>
      </Page>
    )
  }

  return (
    <Page
      title={`Year: ${year}`}
      subtitle={q.data ? `${q.data.total} cars • page ${q.data.page}/${q.data.pages}` : 'Browse cars for this year'}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <Link to="/browse" style={{ color: 'var(--muted)' }}>
            ← Back to Browse
          </Link>
          {carIds.length ? <div style={{ color: 'var(--muted)', fontSize: 14 }}>Compare: {carIds.join(', ')}</div> : null}
        </div>

        {q.isLoading ? <Spinner label="Loading cars…" /> : null}
        {q.isError ? <Alert tone="danger">{(q.error as any)?.message ?? 'Failed to load cars'}</Alert> : null}

        {q.data && q.data.total === 0 ? <Alert tone="info">No cars found for this year.</Alert> : null}

        <div className="grid" style={{ gap: 12 }}>
          {cars.map((c) => (
            <div key={c.id} style={{ display: 'grid', gap: 8 }}>
              <CarCard id={c.id} spec={c.spec} onAddToCompare={add} />
              <div style={{ display: 'flex', gap: 10, color: 'var(--muted)' }}>
                <Link to={`/cars/${c.id}`}>Open specs</Link>
                <span>·</span>
                <Link to={`/compare?ids=${c.id}`}>Compare</Link>
              </div>
            </div>
          ))}
        </div>

        {q.data && q.data.pages > 1 ? (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => {
                params.set('page', String(Math.max(1, page - 1)))
                params.set('per_page', String(perPage))
                setParams(params)
              }}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= q.data.pages}
              onClick={() => {
                params.set('page', String(Math.min(q.data.pages, page + 1)))
                params.set('per_page', String(perPage))
                setParams(params)
              }}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </Page>
  )
}
