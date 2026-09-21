'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppSettings } from '@shared/types'
import styled, { keyframes } from 'styled-components'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { AppIcon } from '../ui/AppIcon'
import { HintText, ErrorText, OkText, RowActions } from '../ui/Text'
import { PluginManagerSection } from './PluginManagerSection'
import { IconChevronLeft, IconLogo } from '../icons'

// 构建期内联应用版本（next.config.ts env），不走 preload/broker 通道
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const Page = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 20px 32px 40px;
  background: var(--background-color);
  outline: none;
  animation: ${pageEnter} 200ms ease-out;
  transition: background-color 0.3s ease;

  &:focus {
    outline: none;
  }

  & section {
    margin: 0;
    padding: 16px;
    background: var(--chrome-panel);
    border: 1px solid var(--chrome-border);
    border-radius: var(--border-radius-md);
    transition: background-color 0.3s ease;
  }

  & h3 {
    font-size: 13px;
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    padding: 16px 16px 32px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Topbar = styled.div`
  max-width: 860px;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  gap: 12px;
`

const PageTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
`

const About = styled.section`
  max-width: 860px;
  margin: 0 auto 16px;
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--chrome-panel);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-md);
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

const Grid = styled.div`
  max-width: 860px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 16px;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

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
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  // 打开设置页时焦点移入页面容器（interaction.md 焦点管理）
  useEffect(() => {
    pageRef.current?.focus()
  }, [])

  useEffect(() => {
    void window.api
      .getSettings()
      .then((s) => {
        setHasToken(s.hasToken)
        setSettings(s.settings)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  const flash = (text: string): void => {
    setMsg(text)
    setTimeout(() => setMsg(null), 2500)
  }

  const save = (patch: Partial<AppSettings>): void =>
    void (async () => {
      try {
        const s = await window.api.setSettings(patch)
        setSettings(s.settings)
        flash('已保存')
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()

  return (
    <Page ref={pageRef} tabIndex={-1}>
      <Topbar>
        <Button variant="ghost" onClick={() => router.push('/')} aria-label="返回首页">
          <AppIcon icon={IconChevronLeft} size="sm" />
          返回
        </Button>
        <PageTitle>设置</PageTitle>
      </Topbar>
      {msg && (
        <OkText role="status" style={{ maxWidth: 860, margin: '0 auto 8px' }}>
          {msg}
        </OkText>
      )}
      {error && (
        <ErrorText role="alert" style={{ maxWidth: 860, margin: '0 auto 8px' }}>
          {error}
        </ErrorText>
      )}

      <About aria-label="关于本应用">
        <IconLogo width={96} height={48} animated />
        <AboutMeta>
          <strong>wuh-site-desktop</strong>
          <HintText style={{ margin: 0 }}>v{APP_VERSION}</HintText>
        </AboutMeta>
      </About>

      <Grid>
        <section>
          <h3>GitHub Token</h3>
          <RowActions>
            <HintText style={{ margin: 0 }}>
              {hasToken ? '✓ 已配置（存于系统钥匙串）' : '未配置 — Issues 发布 / Push 凭证注入不可用'}
            </HintText>
          </RowActions>
          <RowActions>
            <Input
              type="password"
              placeholder="fine-grained PAT（仅存本地钥匙串）"
              aria-label="GitHub Token"
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
                    flash('Token 已保存')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : String(err))
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
                    await window.api.clearGithubToken()
                    setHasToken(false)
                    flash('Token 已清除')
                  })()
                }
              >
                清除
              </Button>
            )}
          </RowActions>
        </section>

        <section>
          <h3>站点服务</h3>
          <RowActions>
            <Input
              placeholder="默认 https://wuh.site"
              aria-label="站点服务地址"
              value={settings.siteBaseUrl ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, siteBaseUrl: e.target.value }))}
              onBlur={(e) => {
                const raw = e.target.value.trim()
                if (raw && !/^https?:\/\//.test(raw)) {
                  setError('站点地址必须是 http(s) URL')
                  return
                }
                setSettings((s) => ({ ...s, siteBaseUrl: raw || null }))
                void save({ siteBaseUrl: raw || null })
              }}
            />
          </RowActions>
          <HintText>首页热力图数据来源（GET /api/about/activity）；留空使用默认主域名 wuh.site。</HintText>
        </section>

        <section>
          <h3>Git 身份（可选，仅当前仓库局部生效）</h3>
          <RowActions>
            <Input
              placeholder="user.name"
              aria-label="Git user.name"
              value={settings.gitUserName ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, gitUserName: e.target.value }))}
              onBlur={() => void save({ gitUserName: settings.gitUserName })}
            />
            <Input
              placeholder="user.email"
              aria-label="Git user.email"
              value={settings.gitUserEmail ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, gitUserEmail: e.target.value }))}
              onBlur={() => void save({ gitUserEmail: settings.gitUserEmail })}
            />
          </RowActions>
        </section>
      </Grid>
      <PluginManagerSection />
    </Page>
  )
}
