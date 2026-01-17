import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Page } from '../components/layout/Page'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { CompareResults } from '../components/cars/CompareResults'
import { carService } from '../services/carService'
import { useCompare } from '../hooks/useCompare'

function parseIds(text: string): number[] {
  return text
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
}

export function ComparePage() {
  const [params] = useSearchParams()
  const { carIds, remove, clear } = useCompare()

  const initial = useMemo(() => {
    const fromQuery = params.get('ids')
    return fromQuery ? parseIds(fromQuery) : carIds
  }, [carIds, params])

  const [idsText, setIdsText] = useState(() => initial.join(','))

  const ids = useMemo(() => parseIds(idsText), [idsText])

  const compare = useMutation({
    mutationFn: () => carService.compare(ids)
  })

  return (
    <Page title="Compare" subtitle="Provide at least 2 car IDs (comma-separated).">
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Input value={idsText} onChange={(e) => setIdsText(e.target.value)} placeholder="e.g. 1,2,3" />
          <Button onClick={() => compare.mutate()} disabled={ids.length < 2 || compare.isPending}>
            Compare
          </Button>
          <Button variant="secondary" onClick={clear}>
            Clear list
          </Button>
        </div>

        {carIds.length ? (
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>
            Saved compare list: {carIds.map((id) => (
              <button key={id} onClick={() => remove(id)} style={{ marginRight: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', borderRadius: 10, padding: '6px 8px', cursor: 'pointer' }}>
                {id} ×
              </button>
            ))}
          </div>
        ) : null}

        {compare.isError ? <Alert tone="danger">{(compare.error as any)?.message ?? 'Compare failed'}</Alert> : null}

        {compare.data ? <CompareResults data={compare.data} /> : null}
      </div>
    </Page>
  )
}
