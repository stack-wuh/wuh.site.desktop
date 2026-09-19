import { useCallback, useEffect, useState } from 'react'
import type { AboutActivityHeatmap } from '@shared/types'

/** 首页热力图数据：loading/error/data + 手动重试；卸载安全（cancelled 标记） */
export function useAboutActivity(): {
  data: AboutActivityHeatmap | null
  loading: boolean
  error: string | null
  retry: () => void
} {
  const [data, setData] = useState<AboutActivityHeatmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    window.api
      .getAboutActivity()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback((): void => setAttempt((a) => a + 1), [])

  return { data, loading, error, retry }
}
