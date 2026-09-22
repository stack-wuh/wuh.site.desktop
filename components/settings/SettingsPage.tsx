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
import { useLocale } from '../../lib/i18n/context'

// 构建期内联应用版本（next.config.ts env），不走 preload/broker 通道
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

type FieldKey = 'githubToken' | 'siteBaseUrl' | 'gitUserName' | 'gitUserEmail'

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
  const { t } = useLocale()
  return (
    <RowStatus role="status" aria-live="polite">
      {show && (
        <>
          <AppIcon icon={IconCheck} size="xs" />
          {t('common.saved')}
        </>
      )}
    </RowStatus>
  )
}

export function SettingsPage(): React.JSX.Element {
  const router = useRouter()
  const { t } = useLocale()
  const navItems: SettingsNavItem[] = [
    { id: 'about', label: t('settings.navAbout') },
    { id: 'services', label: t('settings.navServices') },
    { id: 'git-identity', label: t('settings.navGit') },
    { id: 'plugins', label: t('settings.navPlugins') }
  ]
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
          <Button variant="ghost" onClick={() => router.push('/')} aria-label={t('settings.backAria')}>
            <AppIcon icon={IconChevronLeft} size="sm" />
            {t('settings.back')}
          </Button>
          <PageTitle>{t('settings.title')}</PageTitle>
        </Topbar>
        {loadError && (
          <ErrorText role="alert" style={{ gridColumn: '1 / -1' }}>
            {loadError}
          </ErrorText>
        )}

        <SettingsNav items={navItems} containerRef={pageRef} />

        <Sections>
          <SettingSection id="about" title={t('settings.navAbout')} description={t('settings.aboutDesc')}>
            <AboutBody aria-label={t('settings.aboutAria')}>
              <IconLogo width={96} height={48} animated />
              <AboutMeta>
                <strong>wuh-site-desktop</strong>
                <HintText style={{ margin: 0 }}>v{APP_VERSION}</HintText>
              </AboutMeta>
            </AboutBody>
          </SettingSection>

          <SettingSection id="services" title={t('settings.navServices')} description={t('settings.servicesDesc')}>
            <SettingRow
              htmlFor="settings-github-token"
              label="GitHub Token"
              description={
                <StatusLine>
                  <StatusDot $on={hasToken} aria-hidden />
                  {hasToken ? t('settings.tokenConfigured') : t('settings.tokenMissing')}
                </StatusLine>
              }
            >
              <Input
                id="settings-github-token"
                type="password"
                placeholder={t('settings.tokenPlaceholder')}
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
                {t('settings.saveToken')}
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
                  {t('settings.clearToken')}
                </Button>
              )}
              <SavedFlash show={savedField === 'githubToken'} />
              {fieldErrors.githubToken && <RowError role="alert">{fieldErrors.githubToken}</RowError>}
            </SettingRow>

            <SettingRow
              htmlFor="settings-site-base-url"
              label={t('settings.siteBaseUrl')}
              description={t('settings.siteBaseUrlDesc')}
            >
              <Input
                id="settings-site-base-url"
                placeholder={t('settings.siteBaseUrlPlaceholder')}
                value={settings.siteBaseUrl ?? ''}
                onChange={(e) => setSettings((s) => ({ ...s, siteBaseUrl: e.target.value }))}
                onBlur={(e) => {
                  const raw = e.target.value.trim()
                  if (raw && !/^https?:\/\//.test(raw)) {
                    markError('siteBaseUrl', t('settings.siteBaseUrlInvalid'))
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

          <SettingSection id="git-identity" title={t('settings.navGit')} description={t('settings.gitDesc')}>
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
