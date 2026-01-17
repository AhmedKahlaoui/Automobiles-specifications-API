import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Page } from '../components/layout/Page'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import { carService } from '../services/carService'
import { CarCard } from '../components/cars/CarCard'
import { useCompare } from '../hooks/useCompare'
import type { SearchCar } from '../api/types'
import { browseService } from '../services/browseService'
import { parseAiSearch } from '../app/ai/aiSearch'

type SearchResult = {
  cars: SearchCar[]
  count: number
  mode: 'text' | 'id'
  id?: number
  notFound?: boolean
}

type AiSnapshot = {
  prompt: string
  parsed: ReturnType<typeof parseAiSearch> | null
  cars: SearchCar[]
  savedAt: number
}

const AI_SNAPSHOT_KEY = 'automobile_specs_ai_search_snapshot'

function loadAiSnapshot(): AiSnapshot | null {
  try {
    const raw = sessionStorage.getItem(AI_SNAPSHOT_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<AiSnapshot>
    const cars = Array.isArray(parsed.cars)
      ? (parsed.cars as any[]).filter((c) => c && typeof c === 'object' && 'id' in c && 'spec' in c)
      : []

    return {
      prompt: typeof parsed.prompt === 'string' ? parsed.prompt : '',
      parsed: (parsed.parsed as any) ?? null,
      cars: cars as SearchCar[],
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0
    }
  } catch {
    return null
  }
}

function saveAiSnapshot(snapshot: AiSnapshot) {
  sessionStorage.setItem(AI_SNAPSHOT_KEY, JSON.stringify(snapshot))
}

function normalizeListCarsCars(input: unknown): { cars: SearchCar[]; isLegacyShape: boolean } {
  if (!Array.isArray(input)) return { cars: [], isLegacyShape: false }
  if (!input.length) return { cars: [], isLegacyShape: false }

  const first = input[0] as any
  const looksNew = first && typeof first === 'object' && 'id' in first && 'spec' in first
  if (looksNew) return { cars: input as SearchCar[], isLegacyShape: false }

  // Legacy shape: /cars returned raw specs without ids.
  const looksLegacy = first && typeof first === 'object' && !('id' in first)
  return { cars: [], isLegacyShape: Boolean(looksLegacy) }
}

function parseIdQuery(text: string): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function SearchPage() {
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const { add, carIds } = useCompare()

  const initialAiSnapshot = useMemo(() => loadAiSnapshot(), [])
  const [aiPrompt, setAiPrompt] = useState(() => initialAiSnapshot?.prompt ?? '')
  const [aiParsed, setAiParsed] = useState<ReturnType<typeof parseAiSearch> | null>(() => initialAiSnapshot?.parsed ?? null)
  const [aiSnapshotCars, setAiSnapshotCars] = useState<SearchCar[]>(() => initialAiSnapshot?.cars ?? [])

  const [activeMode, setActiveMode] = useState<'ai' | 'text'>(() => (initialAiSnapshot?.cars?.length ? 'ai' : 'text'))

  const brandsQuery = useQuery({
    queryKey: ['available-brands-for-ai'],
    queryFn: () => browseService.availableBrands(250),
    staleTime: 1000 * 60 * 60
  })

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQDebounced(q)
    }, 350)
    return () => window.clearTimeout(handle)
  }, [q])

  const idQuery = useMemo(() => parseIdQuery(qDebounced), [qDebounced])
  const trimmed = qDebounced.trim()

  const query = useQuery({
    queryKey: ['search', trimmed, idQuery],
    queryFn: async (): Promise<SearchResult> => {
      if (!trimmed) return { cars: [], count: 0, mode: 'text' }

      if (idQuery !== null) {
        try {
          const res = await carService.getCar(idQuery)
          return { cars: [{ id: idQuery, spec: res.car }], count: 1, mode: 'id', id: idQuery }
        } catch (e: any) {
          if (e?.status === 404) {
            return { cars: [], count: 0, mode: 'id', id: idQuery, notFound: true }
          }
          throw e
        }
      }

      const res = await carService.search(trimmed)
      return { ...res, mode: 'text' }
    },
    enabled: activeMode === 'text' && trimmed.length > 0
  })

  const results = useMemo(() => query.data?.cars ?? [], [query.data])
  const showNotFound = Boolean(query.data?.mode === 'id' && query.data?.notFound)

  const aiSearch = useMutation({
    mutationFn: async () => {
      const knownBrands = (brandsQuery.data?.available_brands ?? []).map((b: any) => String(b.brand))
      const parsed = parseAiSearch(aiPrompt, knownBrands)
      setAiParsed(parsed)
      const res = await carService.listCars({
        ...parsed.filters,
        sort_by: parsed.sort.sort_by,
        order: parsed.sort.order,
        page: 1,
        per_page: 20
      })
      return { parsed, res }
    },
    onSuccess: (data) => {
      const normalized = normalizeListCarsCars((data as any)?.res?.cars)
      if (normalized.isLegacyShape) return
      setAiSnapshotCars(normalized.cars)
      saveAiSnapshot({ prompt: aiPrompt, parsed: (data as any)?.parsed ?? null, cars: normalized.cars, savedAt: Date.now() })
      setActiveMode('ai')
    }
  })

  const aiNormalized = useMemo(() => normalizeListCarsCars((aiSearch.data as any)?.res?.cars), [aiSearch.data])
  const aiResults = aiNormalized.cars
  const aiLegacy = aiNormalized.isLegacyShape
  const aiCarsForRender = aiSearch.data && !aiLegacy ? aiResults : aiSnapshotCars
  const aiParsedForRender = (aiSearch.data as any)?.parsed ?? aiParsed

  const clearAiState = () => {
    aiSearch.reset()
    setAiPrompt('')
    setAiParsed(null)
    setAiSnapshotCars([])
    sessionStorage.removeItem(AI_SNAPSHOT_KEY)
  }

  const clearTextState = () => {
    setQ('')
    setQDebounced('')
  }

  return (
    <Page
      title="Search"
      subtitle={carIds.length ? `Compare list: ${carIds.join(', ')}` : 'Search by brand/model/year terms; results include car IDs.'}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ fontWeight: 650, marginBottom: 8 }}>AI Search (rule-based)</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Input
              placeholder="Try: BMW around 2018, strong horsepower, good MPG"
              value={aiPrompt}
              onChange={(e) => {
                setAiPrompt(e.target.value)
                if (activeMode !== 'ai') {
                  clearTextState()
                  setActiveMode('ai')
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (activeMode !== 'ai') {
                  clearTextState()
                  setActiveMode('ai')
                }
                aiSearch.mutate()
              }}
              disabled={!aiPrompt.trim() || aiSearch.isPending}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 12px',
                background: 'rgba(110, 168, 254, 0.18)',
                color: 'var(--text)',
                cursor: !aiPrompt.trim() || aiSearch.isPending ? 'not-allowed' : 'pointer',
                height: 42,
                whiteSpace: 'nowrap'
              }}
              title="Parse your query into filters and fetch results"
            >
              Ask AI
            </button>
          </div>

          {aiSearch.isPending ? <div style={{ marginTop: 10 }}><Spinner label="AI searching…" /></div> : null}
          {aiSearch.isError ? <div style={{ marginTop: 10 }}><Alert tone="danger">{(aiSearch.error as any)?.message ?? 'AI search failed'}</Alert></div> : null}
          {aiLegacy ? (
            <div style={{ marginTop: 10 }}>
              <Alert tone="danger">
                AI Search needs the updated backend response for <code>/api/v1/cars</code>.
                Please restart the Flask server (stop + run <code>flask run</code>) and try again.
              </Alert>
            </div>
          ) : null}

          {aiParsedForRender ? (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Interpreted filters:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {aiParsedForRender.interpreted.map((t: string, i: number) => (
                  <span key={i} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)' }}>
                    {t}
                  </span>
                ))}
              </div>
              <div>
                <button
                  type="button"
                  onClick={clearAiState}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    height: 38,
                    width: 'fit-content'
                  }}
                >
                  Clear AI Search
                </button>
              </div>
            </div>
          ) : null}

          {(aiSearch.data || aiSnapshotCars.length) && !aiLegacy && aiCarsForRender.length === 0 ? (
            <div style={{ marginTop: 10 }}><Alert tone="info">No results for the interpreted filters.</Alert></div>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Input
            placeholder="Try: 1234 (ID), Golf, Audi, BMW, 2020…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              if (e.target.value.trim()) {
                if (activeMode !== 'text') {
                  clearAiState()
                  setActiveMode('text')
                }
              }
            }}
          />
          <Link to="/compare" style={{ whiteSpace: 'nowrap' }}>
            Open Compare
          </Link>
        </div>

        {activeMode === 'text' && query.isFetching ? <Spinner label="Searching…" /> : null}
        {activeMode === 'text' && query.isError ? <Alert tone="danger">{(query.error as any)?.message ?? 'Search failed'}</Alert> : null}
        {activeMode === 'text' && showNotFound ? <Alert tone="info">No car found with ID {query.data?.id}.</Alert> : null}

        <div className="grid" style={{ gap: 12 }}>
          {activeMode === 'ai' && !aiLegacy ? aiCarsForRender.map((r) => (
            <div key={`ai-${r.id}`} style={{ display: 'grid', gap: 8 }}>
              <CarCard id={r.id} spec={r.spec} onAddToCompare={add} />
              <div style={{ display: 'flex', gap: 10, color: 'var(--muted)' }}>
                <Link to={`/cars/${r.id}`}>Details</Link>
                <span>·</span>
                <Link to={`/compare?ids=${r.id}`}>Compare</Link>
              </div>
            </div>
          )) : null}

          {activeMode === 'text' ? results.map((r) => (
            <div key={r.id} style={{ display: 'grid', gap: 8 }}>
              <CarCard id={r.id} spec={r.spec} onAddToCompare={add} />
              <div style={{ display: 'flex', gap: 10, color: 'var(--muted)' }}>
                <Link to={`/cars/${r.id}`}>Details</Link>
                <span>·</span>
                <Link to={`/compare?ids=${r.id}`}>Compare</Link>
              </div>
            </div>
          )) : null}
        </div>
      </div>
    </Page>
  )
}
