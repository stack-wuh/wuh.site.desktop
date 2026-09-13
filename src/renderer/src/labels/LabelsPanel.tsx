import { useCallback, useEffect, useState } from 'react'
import type { LabelInfo } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Tag } from '../components/ui/Tag'
import { Empty } from '../components/ui/Empty'
import { uiConfirm } from '../components/ui/Dialog'

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
      const ok = await uiConfirm({
        title: '删除标签',
        message: `删除标签「${label}」？`,
        okText: '删除',
        danger: true
      })
      if (!ok) return
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
        <Input placeholder="标签名" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="color-input"
          aria-label="标签颜色"
        />
        <Button variant="primary" disabled={busy || !name.trim()} onClick={upsert}>
          保存
        </Button>
      </div>
      {error && <div className="error-text">{error}</div>}
      {labels.length === 0 ? (
        <Empty title="仓库还没有标签" hint="输入名称后保存即可创建" />
      ) : (
        <ul className="label-list">
          {labels.map((l) => (
            <li key={l.name}>
              <Tag color={`#${l.color}`}>{l.name}</Tag>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(l.name)}>
                删除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
