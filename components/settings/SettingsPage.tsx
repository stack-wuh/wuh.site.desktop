'use client'

/**
 * 设置页：页头（返回+标题）+ 左侧粘性锚点导航 + 分区流（关于 / 服务 / Git 身份 / 插件）。
 * 保存反馈为行内 ✓（aria-live）与行内错误；自动保存语义不变（Token 显式保存除外）。
 * `Cmd/Ctrl+,` 切换与 mount 聚焦由壳层约定承载（renderer-shell-routing 卡）。
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppSettings } from '@shared/types'
import styled, { keyframes } from 'styled-components'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { AppIcon } from '../ui/AppIcon'
import { ErrorText, HintText } from '../ui/Text'
import { SettingRow } from '../ui/SettingRow'
import { SettingSection } from './SettingSection'
import { SettingsNav, type SettingsNavItem } from './SettingsNav'
import { PluginManagerSection } from './PluginManagerSection'
import { IconCheck, IconChevronLeft, IconLogo } from '../icons'

// 构建期内联应用版本（next.config.ts env），不走 preload/broker 通道
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

type FieldKey = 'githubToken' | 'siteBaseUrl' | 'gitUserName' | 'gitUserEmail'

const NAV_ITEMS: SettingsNavItem[] = [
  { id: 'about', label: '关于' },
  { id: 'services', label: '服务' },
  { id: 'git-identity', label: 'Git 身份' },
  { id: 'plugins', label: '插件' }
]

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const Page = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 20px 32px 48px;
  background: var(--background-color);
  outline: none;
  animation: ${pageEnter} 200ms ease-out;
  transition: background-color 0.3s ease;

  &:focus {
    outline: none;
  }

  @media (max-width: 768px) {
    padding: 16px 16px 40px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Content = styled.div`
  max-width: 920px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: 8px 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const Topbar = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
`

const PageTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
`

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  max-width: 720px;
`

const AboutBody = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 0 2px;
`

const AboutMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  & > strong {
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }
`

const StatusLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
`

const StatusDot = styled.span<{ $on: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${(props) => (props.$on ? 'var(--success-color)' : 'var(--chrome-border)')};
`

const RowStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--success-color);
`

const RowError = styled.span`
  flex-basis: 100%;
  font-size: 12px;
  color: var(--danger-color);
  text-align: right;

  @media (max-width: 768px) {
    text-align: left;
  }
`

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 行内保存成功指示：节点常驻（aria-live 才能可靠公告），show 控制内容 */
function SavedFlash({ show }: { show: boolean }): React.JSX.Element {
  return (
    <RowStatus role="status" aria-live="polite">
      {show && (
        <>
          <AppIcon icon={IconCheck} size="xs" />
          已保存
        </>
      )}
    </RowStatus>
  )
}

export function SettingsPage(): React.JSX.Element {
  const router = useRouter()
  const [hasToken, setHasToken] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [settings, setSettings] = useState<AppSettings>({
    autoCommit: false,
    autoCommitDelayMs: 2000,
    uploadCommand: null,
    gitUserName: null,
    gitUserEmail: null,
    siteBaseUrl: null
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savedField, setSavedField] = useState<FieldKey | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const pageRef = useRef<HTMLDivElement>(null)
  const savedTimer = useRef<number | null>(null)

  // 打开设置页时焦点移入页面容器（interaction.md 焦点管理）
  useEffect(() => {
    pageRef.current?.focus()
    return () => {
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current)
    }
  }, [])

  useEffect(() => {
    void window.api
      .getSettings()
      .then((s) => {
        setHasToken(s.hasToken)
        setSettings(s.settings)
      })
      .catch((err: unknown) => setLoadError(errText(err)))
  }, [])

  const markSaved = (field: FieldKey): void => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const { [field]: _dropped, ...rest } = prev
      return rest
    })
    setSavedField(field)
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSavedField(null), 1800)
  }

  const markError = (field: FieldKey, message: string): void =>
    setFieldErrors((prev) => ({ ...prev, [field]: message }))

  const save = (field: FieldKey, patch: Partial<AppSettings>): void =>
    void (async () => {
      try {
        const s = await window.api.setSettings(patch)
        setSettings(s.settings)
        markSaved(field)
      } catch (err) {
        markError(field, errText(err))
      }
    })()

  return (
    <Page ref={pageRef} tabIndex={-1}>
      <Content>
        <Topbar>
          <Button variant="ghost" onClick={() => router.push('/')} aria-label="返回首页">
            <AppIcon icon={IconChevronLeft} size="sm" />
            返回
          </Button>
          <PageTitle>设置</PageTitle>
        </Topbar>
        {loadError && (
          <ErrorText role="alert" style={{ gridColumn: '1 / -1' }}>
            {loadError}
          </ErrorText>
        )}

        <SettingsNav items={NAV_ITEMS} containerRef={pageRef} />

        <Sections>
          <SettingSection id="about" title="关于" description="应用信息与版本">
            <AboutBody aria-label="关于本应用">
              <IconLogo width={96} height={48} animated />
              <AboutMeta>
                <strong>wuh-site-desktop</strong>
                <HintText style={{ margin: 0 }}>v{APP_VERSION}</HintText>
              </AboutMeta>
            </AboutBody>
          </SettingSection>

          <SettingSection id="services" title="服务" description="GitHub 凭证与站点数据源">
            <SettingRow
              htmlFor="settings-github-token"
              label="GitHub Token"
              description={
                <StatusLine>
                  <StatusDot $on={hasToken} aria-hidden />
                  {hasToken ? '已配置 — 存于系统钥匙串' : '未配置 — Issues 发布 / Push 凭证注入不可用'}
                </StatusLine>
              }
            >
              <Input
                id="settings-github-token"
                type="password"
                placeholder="fine-grained PAT（仅存本地钥匙串）"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <Button
                variant="primary"
                onClick={() =>
                  void (async () => {
                    if (!tokenInput.trim()) return
                    try {
                      await window.api.setGithubToken(tokenInput)
                      setTokenInput('')
                      setHasToken(true)
                      markSaved('githubToken')
                    } catch (err) {
                      markError('githubToken', errText(err))
                    }
                  })()
                }
              >
                保存 Token
              </Button>
              {hasToken && (
                <Button
                  variant="danger"
                  onClick={() =>
                    void (async () => {
                      try {
                        await window.api.clearGithubToken()
                        setHasToken(false)
                        markSaved('githubToken')
                      } catch (err) {
                        markError('githubToken', errText(err))
                      }
                    })()
                  }
                >
                  清除
                </Button>
              )}
              <SavedFlash show={savedField === 'githubToken'} />
              {fieldErrors.githubToken && <RowError role="alert">{fieldErrors.githubToken}</RowError>}
            </SettingRow>

            <SettingRow
              htmlFor="settings-site-base-url"
              label="站点服务地址"
              description="首页热力图数据来源（GET /api/about/activity）；留空使用默认主域名 wuh.site。"
            >
              <Input
                id="settings-site-base-url"
                placeholder="默认 https://wuh.site"
                value={settings.siteBaseUrl ?? ''}
                onChange={(e) => setSettings((s) => ({ ...s, siteBaseUrl: e.target.value }))}
                onBlur={(e) => {
                  const raw = e.target.value.trim()
                  if (raw && !/^https?:\/\//.test(raw)) {
                    markError('siteBaseUrl', '站点地址必须是 http(s) URL')
                    return
                  }
                  setSettings((s) => ({ ...s, siteBaseUrl: raw || null }))
                  void save('siteBaseUrl', { siteBaseUrl: raw || null })
                }}
              />
              <SavedFlash show={savedField === 'siteBaseUrl'} />
              {fieldErrors.siteBaseUrl && <RowError role="alert">{fieldErrors.siteBaseUrl}</RowError>}
            </SettingRow>
          </SettingSection>

          <SettingSection id="git-identity" title="Git 身份" description="可选，仅当前仓库局部生效">
            <SettingRow htmlFor="settings-git-user-name" label="user.name">
              <Input
                id="settings-git-user-name"
                placeholder="user.name"
                value={settings.gitUserName ?? ''}
                onChange={(e) => setSettings((s) => ({ ...s, gitUserName: e.target.value }))}
                onBlur={() => void save('gitUserName', { gitUserName: settings.gitUserName })}
              />
              <SavedFlash show={savedField === 'gitUserName'} />
              {fieldErrors.gitUserName && <RowError role="alert">{fieldErrors.gitUserName}</RowError>}
            </SettingRow>
            <SettingRow htmlFor="settings-git-user-email" label="user.email">
              <Input
                id="settings-git-user-email"
                placeholder="user.email"
                value={settings.gitUserEmail ?? ''}
                onChange={(e) => setSettings((s) => ({ ...s, gitUserEmail: e.target.value }))}
                onBlur={() => void save('gitUserEmail', { gitUserEmail: settings.gitUserEmail })}
              />
              <SavedFlash show={savedField === 'gitUserEmail'} />
              {fieldErrors.gitUserEmail && <RowError role="alert">{fieldErrors.gitUserEmail}</RowError>}
            </SettingRow>
          </SettingSection>

          <PluginManagerSection />
        </Sections>
      </Content>
    </Page>
  )
}
