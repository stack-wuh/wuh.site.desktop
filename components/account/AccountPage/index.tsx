'use client'

/**
 * 用户中心页：GitHub 授权（Device Flow）+ 身份/仓库 + Git 提交身份归拢。
 * 授权三态：未授权（开始授权）→ pending（user_code 展示 + 2s 轮询状态）→ 已授权
 * （身份卡 + 仓库列表 + 默认站点仓库）。token 401 → stale 横幅引导重新授权；
 * PAT 手动粘贴保留为「高级」折叠回退。样式 token + 稳定属性（styled 类名是哈希）。
 * 状态与 handler 全部集中于本组件，「GitHub 账户」区 UI 见 ./AuthFlow、
 * 「仓库 + Git」区 UI 见 ./IdentityRepos（20260926-refactor-mega-component-split 拆分）。
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppSettings, GitIdentityDefault, GithubIdentity, RepoSummary, TokenKind } from '@shared/types'
import { PageTopbar } from '../../ui/PageTopbar'
import { uiConfirm } from '../../ui/Dialog'
import { useLocale } from '../../../lib/i18n/context'
import { syncIdentity } from '../../../lib/identity'
import { Content, Page, ScrollArea, Sections } from './styles'
import { AuthFlow, type AuthView } from './AuthFlow'
import { IdentityRepos, type GitFieldKey } from './IdentityRepos'

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function AccountPage(): React.JSX.Element {
  const router = useRouter()
  const { t } = useLocale()
  const pageRef = useRef<HTMLDivElement>(null)

  // ---- 授权流 ----
  const [auth, setAuth] = useState<AuthView>({ state: 'idle' })
  const [authError, setAuthError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)

  // ---- 身份与设置 ----
  const [identity, setIdentity] = useState<GithubIdentity | null>(null)
  const [identityLoading, setIdentityLoading] = useState(true)
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [tokenKind, setTokenKind] = useState<TokenKind | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)

  // ---- PAT 回退 ----
  const [patInput, setPatInput] = useState('')
  const [patError, setPatError] = useState<string | null>(null)
  const [patSaved, setPatSaved] = useState(false)

  // ---- 仓库 ----
  const [repos, setRepos] = useState<RepoSummary[] | null>(null)
  const [reposError, setReposError] = useState<string | null>(null)
  const [repoQuery, setRepoQuery] = useState('')
  const [repoReloadTick, setRepoReloadTick] = useState(0)

  // ---- Git 提交身份 ----
  const [savedField, setSavedField] = useState<GitFieldKey | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<GitFieldKey, string>>>({})
  const savedTimer = useRef<number | null>(null)
  // 本机 git 全局身份，仅作默认值展示（placeholder），不写入 settings
  const [gitDefault, setGitDefault] = useState<GitIdentityDefault | null>(null)

  useEffect(() => {
    let alive = true
    // 方法访问也进 promise 链：dev 下渲染层先于 preload 更新时，契约偏差降级为 null 而非崩页
    Promise.resolve()
      .then(() => window.api.getGitIdentityDefault())
      .then((v) => {
        if (alive) setGitDefault(v)
      })
      .catch(() => undefined) // 读取失败保持 null，placeholder 显示「本机未配置」
    return () => {
      alive = false
    }
  }, [])

  /** 有 token 时拉取身份（401 → stale 身份，不抛错） */
  const reloadIdentity = async (): Promise<void> => {
    setIdentityLoading(true)
    setIdentityError(null)
    try {
      const status = await window.api.getSettings()
      setSettings(status.settings)
      setTokenKind(status.tokenKind)
      const next = status.hasToken ? await window.api.getGithubIdentity() : null
      setIdentity(next)
      // 写穿全局身份 store：授权/断开即时反映到侧栏用户入口与首页问候
      syncIdentity(next)
    } catch (err) {
      setIdentityError(errText(err))
    } finally {
      setIdentityLoading(false)
    }
  }

  useEffect(() => {
    pageRef.current?.focus()
    void reloadIdentity()
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current)
    }
  }, [])

  // pending 期间 2s 轮询授权状态，直到离开 polling
  useEffect(() => {
    if (auth.state !== 'pending') return
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const st = await window.api.getGithubDeviceFlowStatus()
          if (st.phase === 'polling') return
          window.clearInterval(timer)
          setAuth({ state: 'idle' })
          if (st.phase === 'success') {
            await reloadIdentity()
          } else if (st.phase !== 'idle' && st.phase !== 'cancelled') {
            setAuthError(st.message ?? t('account.authFailed'))
          }
        } catch {
          // 状态不可得（异常场景）：结束等待避免死轮询
          window.clearInterval(timer)
          setAuth({ state: 'idle' })
        }
      })()
    }, 2000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.state])

  const startAuth = (): void => {
    setAuthError(null)
    void (async () => {
      try {
        const start = await window.api.startGithubDeviceFlow()
        setAuth({ state: 'pending', start })
      } catch (err) {
        setAuthError(errText(err))
      }
    })()
  }

  const cancelAuth = (): void => {
    void window.api.cancelGithubDeviceFlow().catch(() => {})
    setAuth({ state: 'idle' })
  }

  const copyCode = (): void => {
    if (auth.state !== 'pending') return
    void navigator.clipboard
      .writeText(auth.start.userCode)
      .then(() => {
        setCopied(true)
        if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
        copiedTimer.current = window.setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => {})
  }

  const disconnect = (): void => {
    void (async () => {
      const ok = await uiConfirm({
        title: t('account.disconnectConfirmTitle'),
        message: t('account.disconnectConfirmMsg')
      })
      if (!ok) return
      try {
        await window.api.clearGithubToken()
        setIdentity(null)
        setTokenKind(null)
        setRepos(null)
        setReposError(null)
      } catch (err) {
        setIdentityError(errText(err))
      }
    })()
  }

  const savePat = (): void => {
    if (!patInput.trim()) return
    void (async () => {
      try {
        await window.api.setGithubToken(patInput)
        setPatInput('')
        setPatError(null)
        setPatSaved(true)
        window.setTimeout(() => setPatSaved(false), 1800)
        await reloadIdentity()
      } catch (err) {
        setPatError(errText(err))
      }
    })()
  }

  const markSaved = (field: GitFieldKey): void => {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev
      const { [field]: _dropped, ...rest } = prev
      return rest
    })
    setSavedField(field)
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSavedField(null), 1800)
  }

  const saveGit = (field: GitFieldKey, value: string | null): void => {
    void (async () => {
      try {
        const s = await window.api.setSettings({ [field]: value })
        setSettings(s.settings)
        markSaved(field)
      } catch (err) {
        setFieldErrors((prev) => ({ ...prev, [field]: errText(err) }))
      }
    })()
  }

  // 仓库列表随有效身份拉取；换账号（login 变化）或手动重试时重拉
  const authed = identity !== null && !identity.stale
  const authedLogin = authed ? identity.login : null
  useEffect(() => {
    if (authedLogin === null) return
    let alive = true
    setRepos(null)
    setReposError(null)
    void window.api
      .listUserRepos()
      .then((list) => {
        if (alive) setRepos(list)
      })
      .catch((err) => {
        if (alive) setReposError(errText(err))
      })
    return () => {
      alive = false
    }
  }, [authedLogin, repoReloadTick])

  const setDefaultRepo = (fullName: string | null): void => {
    void (async () => {
      try {
        const s = await window.api.setSettings({ siteRepo: fullName })
        setSettings(s.settings)
      } catch (err) {
        setReposError(errText(err))
      }
    })()
  }

  // 受控输入的本地编辑：与原实现相同的函数式更新（分支展开以保类型收窄）
  const onGitChange = (field: GitFieldKey, value: string): void => {
    setSettings((s) => {
      if (!s) return s
      if (field === 'gitUserName') return { ...s, gitUserName: value }
      return { ...s, gitUserEmail: value }
    })
  }

  return (
    <Page ref={pageRef} tabIndex={-1}>
      <PageTopbar
        title={t('account.title')}
        backLabel={t('account.back')}
        backAria={t('account.backAria')}
        onBack={() => router.push('/')}
      />
      <ScrollArea>
      <Content>

        <Sections>
          <AuthFlow
            auth={auth}
            authError={authError}
            identity={identity}
            identityLoading={identityLoading}
            identityError={identityError}
            tokenKind={tokenKind}
            copied={copied}
            patInput={patInput}
            patError={patError}
            patSaved={patSaved}
            onCopyCode={copyCode}
            onStartAuth={startAuth}
            onCancelAuth={cancelAuth}
            onDisconnect={disconnect}
            onPatInput={setPatInput}
            onPatSave={savePat}
          />
          <IdentityRepos
            authed={authed}
            repos={repos}
            reposError={reposError}
            repoQuery={repoQuery}
            defaultRepo={settings?.siteRepo ?? null}
            settings={settings}
            gitDefault={gitDefault}
            savedField={savedField}
            fieldErrors={fieldErrors}
            onRepoQuery={setRepoQuery}
            onRepoReload={() => setRepoReloadTick((n) => n + 1)}
            onSetDefaultRepo={setDefaultRepo}
            onGitChange={onGitChange}
            onSaveGit={saveGit}
          />
        </Sections>
      </Content>
      </ScrollArea>
    </Page>
  )
}
