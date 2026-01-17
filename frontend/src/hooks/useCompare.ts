import { useCallback, useMemo, useState } from 'react'
import { loadCompareIds, saveCompareIds } from '../app/storage/compareStore'

export function useCompare() {
  const [carIds, setCarIds] = useState<number[]>(() => loadCompareIds())

  const add = useCallback((id: number) => {
    setCarIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id]
      saveCompareIds(next)
      return next
    })
  }, [])

  const remove = useCallback((id: number) => {
    setCarIds((prev) => {
      const next = prev.filter((x) => x !== id)
      saveCompareIds(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    saveCompareIds([])
    setCarIds([])
  }, [])

  const asCsv = useMemo(() => carIds.join(','), [carIds])

  return { carIds, add, remove, clear, asCsv }
}
