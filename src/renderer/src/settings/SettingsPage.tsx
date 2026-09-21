import { useEffect, useRef, useState } from 'react'
import type { AppSettings } from '@shared/types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { AppIcon } from '../components/ui/AppIcon'
import { IconChevronLeft, IconLogo } from '../components/icons'

// electron-vite renderer define 注入（electron.vite.config.ts），构建期常量
declare const __APP_VERSION__: string

export function SettingsPage(props: { onBack: () => void }): React.JSX.Element {
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
    <div className="settings-page" ref={pageRef} tabIndex={-1}>
      <div className="settings-topbar">
        <Button variant="ghost" onClick={props.onBack} aria-label="返回首页">
          <AppIcon icon={IconChevronLeft} size="sm" />
          返回
        </Button>
        <h2 className="settings-title">设置</h2>
      </div>
      {msg && (
        <div className="ok-text" role="status">
          {msg}
        </div>
      )}
      {error && (
        <div className="error-text" role="alert">
          {error}
        </div>
      )}

      <section className="settings-about" aria-label="关于本应用">
        <IconLogo width={96} height={48} animated />
        <div className="settings-about-meta">
          <strong>wuh-site-desktop</strong>
          <span className="hint-text">v{__APP_VERSION__}</span>
        </div>
      </section>

      <div className="settings-grid">
        <section>
          <h3>GitHub Token</h3>
          <div className="row-actions">
            <span className="hint-text">
              {hasToken ? '✓ 已配置（存于系统钥匙串）' : '未配置 — Issues 发布 / Push 凭证注入不可用'}
            </span>
          </div>
          <div className="row-actions">
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
          </div>
        </section>

        <section>
          <h3>站点服务</h3>
          <div className="row-actions">
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
          </div>
          <p className="hint-text">首页热力图数据来源（GET /api/about/activity）；留空使用默认主域名 wuh.site。</p>
        </section>

        <section>
          <h3>Git 身份（可选，仅当前仓库局部生效）</h3>
          <div className="row-actions">
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
          </div>
        </section>
      </div>
    </div>
  )
}
