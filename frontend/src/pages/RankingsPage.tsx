import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Page } from '../components/layout/Page'
import { Select } from '../components/ui/Select'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import { carService } from '../services/carService'
import { Table } from '../components/ui/Table'

function pick(spec: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = spec[k]
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v === 'number') return String(v)
  }
  return ''
}

export function RankingsPage() {
  const metricsQuery = useQuery({
    queryKey: ['metrics'],
    queryFn: () => carService.availableMetrics()
  })

  const metrics = useMemo(() => {
    const raw = metricsQuery.data?.metrics ?? []
    // Remove production year from performance rankings.
    return Array.isArray(raw) ? raw.filter((m: any) => (m?.name ?? m?.metric) !== 'year') : []
  }, [metricsQuery.data])
  const [metric, setMetric] = useState<string>('horsepower')

  const topQuery = useQuery({
    queryKey: ['top', metric],
    queryFn: () => carService.topCars(metric, 10),
    enabled: Boolean(metric)
  })

  const rows = useMemo(() => {
    const list = (topQuery.data && (topQuery.data.cars ?? topQuery.data.top_cars ?? topQuery.data.results)) || []
    if (!Array.isArray(list)) return []

    return list.map((item: any) => {
      const id = item.id ?? item.car_id ?? item.car?.id ?? ''
      const spec: Record<string, unknown> = item.spec ?? item.car?.spec ?? item.car ?? {}
      const brand = pick(spec, ['brand', 'Brand', 'Company'])
      const model = pick(spec, ['model', 'Model', 'Serie', 'serie'])
      const value = item.metric_value ?? item.value ?? item[metric] ?? ''

      return [String(id), brand, model, String(value)]
    })
  }, [metric, topQuery.data])

  return (
    <Page title="Rankings" subtitle="Top cars by a metric (from /cars/top/:metric).">
      <div style={{ display: 'grid', gap: 12 }}>
        {metricsQuery.isLoading ? <Spinner label="Loading metrics…" /> : null}
        {metricsQuery.isError ? <Alert tone="danger">{(metricsQuery.error as any)?.message ?? 'Failed to load metrics'}</Alert> : null}

        <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
          {metrics.length
            ? metrics.map((m: any) => (
                <option key={m.name} value={m.name}>
                  {m.display ?? m.name}
                </option>
              ))
            : ['horsepower', 'acceleration_0_100', 'vitesse_max', 'combined_mpg', 'torque_nm'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
        </Select>

        {topQuery.isLoading ? <Spinner label="Loading top cars…" /> : null}
        {topQuery.isError ? <Alert tone="danger">{(topQuery.error as any)?.message ?? 'Failed to load rankings'}</Alert> : null}

        {rows.length ? <Table columns={['ID', 'Brand', 'Model', 'Value']} rows={rows} /> : null}
      </div>
    </Page>
  )
}
