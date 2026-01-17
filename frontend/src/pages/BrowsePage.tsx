import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Page } from '../components/layout/Page'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import { Select } from '../components/ui/Select'
import { browseService } from '../services/browseService'
import { Table } from '../components/ui/Table'
import { Link } from 'react-router-dom'

export function BrowsePage() {
  const brandsQuery = useQuery({ queryKey: ['browse-brands'], queryFn: () => browseService.brands() })
  const yearsQuery = useQuery({ queryKey: ['browse-years'], queryFn: () => browseService.years() })

  const brands = useMemo(() => brandsQuery.data?.brands ?? [], [brandsQuery.data])
  const years = useMemo(() => yearsQuery.data?.years ?? [], [yearsQuery.data])

  const [brand, setBrand] = useState<string>('')

  const seriesQuery = useQuery({
    queryKey: ['brand-series', brand],
    queryFn: () => browseService.seriesByBrand(brand),
    enabled: Boolean(brand)
  })

  return (
    <Page title="Browse" subtitle="Explore brands, series, and years.">
      <div style={{ display: 'grid', gap: 18 }}>
        {(brandsQuery.isLoading || yearsQuery.isLoading) ? <Spinner label="Loading browse data…" /> : null}
        {(brandsQuery.isError || yearsQuery.isError) ? (
          <Alert tone="danger">{((brandsQuery.error as any)?.message ?? (yearsQuery.error as any)?.message) || 'Failed to load browse data'}</Alert>
        ) : null}

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 650 }}>Brand → Series</div>
          <Select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Select brand…</option>
            {brands.map((b: any) => (
              <option key={b.brand} value={b.brand}>
                {b.brand} ({b.count})
              </option>
            ))}
          </Select>
          {seriesQuery.isLoading ? <Spinner label="Loading series…" /> : null}
          {seriesQuery.isError ? <Alert tone="danger">{(seriesQuery.error as any)?.message ?? 'Failed to load series'}</Alert> : null}
          {seriesQuery.data ? (
            <Table
              columns={['Serie']}
              rows={(seriesQuery.data.series ?? []).map((s: any) => [
                <Link key={s.serie} to={`/browse/series/${encodeURIComponent(String(s.serie))}`} style={{ color: 'var(--brand)' }}>
                  {s.serie}
                </Link>
              ])}
            />
          ) : null}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 650 }}>Years</div>
          {years.length ? (
            <Table
              columns={['Year', 'Count']}
              rows={years.map((y: any) => [
                <Link key={y.year} to={`/browse/years/${encodeURIComponent(String(y.year))}`} style={{ color: 'var(--brand)' }}>
                  {String(y.year)}
                </Link>,
                String(y.count)
              ])}
            />
          ) : null}
        </div>
      </div>
    </Page>
  )
}
