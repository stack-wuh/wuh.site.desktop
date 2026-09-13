import { useCallback, useEffect, useState } from 'react'
import type { LabelInfo } from '@shared/types'

export function LabelsPanel(): React.JSX.Element {
  const [labels, setLabels] = useState<LabelInfo[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#5b9bf5')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setLabels(await window.api.githubListLabels())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const upsert = (): void =>
    void (async () => {
      if (!name.trim()) return
      setBusy(true)
      try {
        await window.api.githubUpsertLabel({ name: name.trim(), color, description: null })
        setName('')
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    })()

  const remove = (label: string): void =>
    void (async () => {
      if (!confirm(`删除标签「${label}」？`)) return
      setBusy(true)
      try {
        await window.api.githubDeleteLabel(label)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    })()

  return (
    <div className="labels-panel">
      <div className="label-create">
        <input placeholder="标签名" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="color-input"
        />
        <button disabled={busy || !name.trim()} onClick={upsert}>
          保存
        </button>
      </div>
      {error && <div className="error-text">{error}</div>}
      <ul className="label-list">
        {labels.map((l) => (
          <li key={l.name}>
            <span className="label-chip" style={{ backgroundColor: `#${l.color}` }}>
              {l.name}
            </span>
            <button disabled={busy} onClick={() => remove(l.name)}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
