/**
 * 设置页插件区块：列表（名称/版本/来源/权限摘要/批准状态）+ 启停（首次启用
 * 弹权限确认）+ 打开插件目录 + 重载重扫。数据经 plugin:list，动作经
 * togglePlugin/rebootstrap；manifest 校验失败目录（problems）一并列出。
 */
import { useCallback, useEffect, useState } from 'react'
import type { PluginRecord } from '@shared/plugin'
import { rebootstrapPluginsHost, togglePlugin } from '../plugins/PluginFrameHost'
import { closePluginFloats } from '../plugins/floats'
import { uiConfirm } from './ui/Dialog'
import { Button } from './ui/Button'
import { Empty } from './ui/Empty'

const APPROVAL_LABEL: Record<PluginRecord['approval'], string> = {
  approved: '已批准',
  pending: '待批准',
  changed: '权限已变更'
}

function dirName(dir: string): string {
  const parts = dir.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? dir
}

export function PluginManagerSection(): React.JSX.Element {
  const [records, setRecords] = useState<PluginRecord[] | null>(null)
  const [problems, setProblems] = useState<{ dir: string; errors: string[] }[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      const result = await window.pluginApi.list()
      setRecords(result.records)
      setProblems(result.problems)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = useCallback(
    (record: PluginRecord): void =>
      void (async () => {
        const id = record.manifest.id
        setBusy(id)
        setError(null)
        try {
          if (record.enabled) {
            await togglePlugin(id, false)
            closePluginFloats(id)
          } else {
            if (record.approval !== 'approved') {
              const ok = await uiConfirm({
                title: `启用 ${record.manifest.name}`,
                message: `该插件请求以下权限：${record.manifest.permissions.join('、') || '（无）'}`,
                okText: '批准并启用',
                cancelText: '取消'
              })
              if (!ok) return
              await togglePlugin(id, true, record.manifest.permissions)
            } else {
              await togglePlugin(id, true)
            }
          }
          await load()
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
        } finally {
          setBusy(null)
        }
      })(),
    [load]
  )

  const reload = useCallback((): void =>
    void (async () => {
      setBusy('__reload__')
      setError(null)
      try {
        await rebootstrapPluginsHost()
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    })(),
  [load])

  const reveal = useCallback(
    (record: PluginRecord): void =>
      void window.pluginApi.revealDir(record.manifest.id).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      }),
    []
  )

  return (
    <section className="plugin-manage" aria-label="插件管理">
      <div className="plugin-manage-head">
        <h3>插件</h3>
        <Button variant="ghost" size="sm" onClick={reload} disabled={busy !== null}>
          重载插件
        </Button>
      </div>
      {error && (
        <div className="error-text" role="alert">
          {error}
        </div>
      )}
      {records === null ? (
        <p className="hint-text">插件加载中…</p>
      ) : records.length === 0 ? (
        <Empty title="未发现插件" hint="将插件目录放入内置 plugins/ 或 userData/plugins/ 后重载" />
      ) : (
        <ul className="plugin-manage-list">
          {records.map((record) => (
            <li key={record.manifest.id} className="plugin-card">
              <div className="plugin-card-main">
                <div className="plugin-card-title">
                  <strong>{record.manifest.name}</strong>
                  <span className="hint-text">v{record.manifest.version}</span>
                  {record.approval !== 'approved' && (
                    <span className={`plugin-approval ${record.approval}`}>{APPROVAL_LABEL[record.approval]}</span>
                  )}
                </div>
                <p className="hint-text" title={record.dir}>
                  {dirName(record.dir)} · 权限：{record.manifest.permissions.join('、') || '（无）'}
                </p>
              </div>
              <div className="plugin-card-actions">
                <Button variant="ghost" size="sm" onClick={() => reveal(record)} aria-label={`打开 ${record.manifest.name} 目录`}>
                  打开目录
                </Button>
                <Button
                  variant={record.enabled ? 'danger' : 'primary'}
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => toggle(record)}
                >
                  {record.enabled ? '停用' : '启用'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {problems.length > 0 && (
        <div className="plugin-problems">
          {problems.map((p) => (
            <p key={p.dir} className="error-text" title={p.dir}>
              {dirName(p.dir)}：{p.errors.join('；')}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
