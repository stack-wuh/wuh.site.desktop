'use client'

/**
 * 设置页插件区块（SettingSection 形态）：列表（图标/名称/版本/来源/权限摘要/
 * 批准状态）+ Switch 启停（首次启用弹权限确认）+ 打开插件目录 + 重载重扫。
 * 数据经 plugin:list，动作经 togglePlugin/rebootstrap，通道与确认框语义不变；
 * manifest 校验失败目录（problems）一并列出。加载态为 skeleton（interaction 规范）。
 */
import { useCallback, useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import type { PluginRecord } from '@shared/plugin'
import { rebootstrapPluginsHost, togglePlugin } from '../plugins/PluginFrameHost'
import { closePluginFloats } from '../../lib/floats'
import { toast } from '../../lib/feedback'
import { uiConfirm } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Empty } from '../ui/Empty'
import { AppIcon } from '../ui/AppIcon'
import { Switch } from '../ui/Switch'
import { ErrorText, HintText } from '../ui/Text'
import { SettingSection } from './SettingSection'
import { pluginIcon } from '../icons'
import { useLocale } from '../../lib/i18n/context'

const List = styled.ul`
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Card = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  background: var(--background-color);
`

const IconTile = styled.div`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-sm);
  background: var(--chrome-hover);
  color: var(--primary-color);
  font-size: 13px;
`

const CardMain = styled.div`
  flex: 1;
  min-width: 0;
`

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  & > strong {
    color: var(--text-primary);
    font-size: 13px;
  }
`

const Pill = styled.span<{ $accent?: boolean }>`
  padding: 1px 8px;
  border-radius: 9px;
  font-size: 11px;
  border: 1px solid var(--chrome-border);
  color: var(--text-muted);
  white-space: nowrap;

  ${(props) =>
    props.$accent &&
    `
    color: var(--primary-color);
    border-color: var(--primary-color);
  `}
`

const PermRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
`

const SourceText = styled.span`
  font-size: 11px;
  color: var(--text-muted);
`

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const shimmer = keyframes`
  from { opacity: 1; }
  to { opacity: 0.55; }
`

const SkeletonWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
`

const SkeletonCard = styled.div`
  height: 56px;
  border-radius: var(--border-radius-sm);
  background: var(--chrome-hover);
  animation: ${shimmer} 1.2s ease-in-out infinite alternate;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
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
  const { t } = useLocale()
  const approvalLabel: Record<PluginRecord['approval'], string> = {
    approved: t('settings.approvalApproved'),
    pending: t('settings.approvalPending'),
    changed: t('settings.approvalChanged')
  }
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
                title: t('settings.enableConfirmTitle', { name: record.manifest.name }),
                message: t('settings.enableConfirmMsg', {
                  perms: record.manifest.permissions.join(t('common.listJoiner')) || t('settings.permsNone')
                }),
                okText: t('settings.approveEnable'),
                cancelText: t('common.cancel')
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
    [load, t]
  )

  const reload = useCallback((): void =>
    void (async () => {
      setBusy('__reload__')
      setError(null)
      try {
        const result = await rebootstrapPluginsHost()
        await load()
        // 示范接入（20260924-feature-ui-feedback-system · Phase 4）：重载成功轻提示
        toast({ text: t('settings.reloadDone', { count: result.records.length }), kind: 'success' })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(null)
      }
    })(),
  [load, t])

  const reveal = useCallback(
    (record: PluginRecord): void =>
      void window.pluginApi.revealDir(record.manifest.id).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      }),
    []
  )

  return (
    <SettingSection
      id="plugins"
      title={t('settings.navPlugins')}
      description={t('settings.pluginsDesc')}
      actions={
        <Button variant="ghost" size="sm" onClick={reload} disabled={busy !== null}>
          {t('settings.reloadPlugins')}
        </Button>
      }
    >
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {records === null ? (
        <SkeletonWrap aria-busy="true">
          <span hidden>{t('settings.pluginsLoading')}</span>
          <SkeletonCard aria-hidden />
          <SkeletonCard aria-hidden />
          <SkeletonCard aria-hidden />
        </SkeletonWrap>
      ) : records.length === 0 ? (
        <Empty title={t('settings.pluginsEmptyTitle')} hint={t('settings.pluginsEmptyHint')} />
      ) : (
        <List>
          {records.map((record) => {
            const firstView = record.manifest.views[0]
            const viewIconComp = firstView ? pluginIcon(firstView.icon) : null
            const permissions = record.manifest.permissions
            return (
              <Card key={record.manifest.id}>
                <IconTile aria-hidden>
                  {viewIconComp ? (
                    <AppIcon icon={viewIconComp} size="md" />
                  ) : (
                    record.manifest.name.slice(0, 1).toUpperCase()
                  )}
                </IconTile>
                <CardMain>
                  <CardTitle>
                    <strong>{record.manifest.name}</strong>
                    <HintText style={{ margin: 0 }}>v{record.manifest.version}</HintText>
                    {record.approval !== 'approved' && (
                      <Pill $accent={record.approval === 'changed'}>{approvalLabel[record.approval]}</Pill>
                    )}
                  </CardTitle>
                  <PermRow>
                    <SourceText title={record.dir}>{dirName(record.dir)}</SourceText>
                    {permissions.length > 0 ? (
                      permissions.map((perm) => <Pill key={perm}>{perm}</Pill>)
                    ) : (
                      <SourceText>{t('settings.permsNone')}</SourceText>
                    )}
                  </PermRow>
                </CardMain>
                <CardActions>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => reveal(record)}
                    aria-label={t('settings.openDirAria', { name: record.manifest.name })}
                  >
                    {t('settings.openDir')}
                  </Button>
                  <Switch
                    checked={record.enabled}
                    disabled={busy !== null}
                    aria-label={t(
                      record.enabled ? 'settings.pluginEnabledAria' : 'settings.pluginDisabledAria',
                      { name: record.manifest.name }
                    )}
                    onChange={() => toggle(record)}
                  />
                </CardActions>
              </Card>
            )
          })}
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
    </SettingSection>
  )
}
