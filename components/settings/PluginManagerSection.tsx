'use client'

/**
 * 设置页插件区块：列表（名称/版本/来源/权限摘要/批准状态）+ 启停（首次启用
 * 弹权限确认）+ 打开插件目录 + 重载重扫。数据经 plugin:list，动作经
 * togglePlugin/rebootstrap；manifest 校验失败目录（problems）一并列出。
 */
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import type { PluginRecord } from '@shared/plugin'
import { rebootstrapPluginsHost, togglePlugin } from '../plugins/PluginFrameHost'
import { closePluginFloats } from '../../lib/floats'
import { uiConfirm } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Empty } from '../ui/Empty'
import { ErrorText, HintText } from '../ui/Text'

const APPROVAL_LABEL: Record<PluginRecord['approval'], string> = {
  approved: '已批准',
  pending: '待批准',
  changed: '权限已变更'
}

const Section = styled.section`
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-base);
  background: var(--background-color);
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  & h3 {
    margin: 0;
  }
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Card = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  background: var(--chrome-panel);
`

const CardMain = styled.div`
  flex: 1;
  min-width: 0;

  & > p {
    margin: 4px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Approval = styled.span<{ $changed: boolean }>`
  padding: 1px 8px;
  border-radius: 9px;
  font-size: 11px;
  border: 1px solid var(--chrome-border);
  color: var(--text-muted);

  ${(props) =>
    props.$changed &&
    `
    color: var(--primary-color);
    border-color: var(--primary-color);
  `}
`

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const Problems = styled.div`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  & p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

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
    <Section aria-label="插件管理">
      <Head>
        <h3>插件</h3>
        <Button variant="ghost" size="sm" onClick={reload} disabled={busy !== null}>
          重载插件
        </Button>
      </Head>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {records === null ? (
        <HintText>插件加载中…</HintText>
      ) : records.length === 0 ? (
        <Empty title="未发现插件" hint="将插件目录放入内置 plugins/ 或 userData/plugins/ 后重载" />
      ) : (
        <List>
          {records.map((record) => (
            <Card key={record.manifest.id}>
              <CardMain>
                <CardTitle>
                  <strong>{record.manifest.name}</strong>
                  <HintText style={{ margin: 0 }}>v{record.manifest.version}</HintText>
                  {record.approval !== 'approved' && (
                    <Approval $changed={record.approval === 'changed'}>{APPROVAL_LABEL[record.approval]}</Approval>
                  )}
                </CardTitle>
                <HintText style={{ margin: 0 }} title={record.dir}>
                  {dirName(record.dir)} · 权限：{record.manifest.permissions.join('、') || '（无）'}
                </HintText>
              </CardMain>
              <CardActions>
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
              </CardActions>
            </Card>
          ))}
        </List>
      )}
      {problems.length > 0 && (
        <Problems>
          {problems.map((p) => (
            <ErrorText key={p.dir} title={p.dir}>
              {dirName(p.dir)}：{p.errors.join('；')}
            </ErrorText>
          ))}
        </Problems>
      )}
    </Section>
  )
}
