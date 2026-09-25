'use client'

/**
 * 用户中心页：GitHub 授权（Device Flow）+ 身份/仓库 + Git 提交身份归拢。
 * 授权三态：未授权（开始授权）→ pending（user_code 展示 + 2s 轮询状态）→ 已授权
 * （身份卡 + 仓库列表 + 默认站点仓库）。token 401 → stale 横幅引导重新授权；
 * PAT 手动粘贴保留为「高级」折叠回退。样式 token + 稳定属性（styled 类名是哈希）。
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppSettings, DeviceFlowStart, GitIdentityDefault, GithubIdentity, RepoSummary, TokenKind } from '@shared/types'
import styled, { keyframes } from 'styled-components'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { AppIcon } from '../ui/AppIcon'
import { PageTopbar } from '../ui/PageTopbar'
import { ErrorText, HintText } from '../ui/Text'
import { SettingRow } from '../ui/SettingRow'
import { SettingSection } from '../settings/SettingSection'
import { uiConfirm } from '../ui/Dialog'
import { GithubIcon } from '../ui/GithubIcon'
import { IconCheck, IconCopy, IconExternalLink, IconSearch } from '../icons'
import { useLocale } from '../../lib/i18n/context'
import { syncIdentity } from '../../lib/identity'

const pageEnter = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const Page = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--background-color);
  outline: none;
  animation: ${pageEnter} 200ms ease-out;
  transition: background-color 0.3s ease;

  &:focus {
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/* 内容滚动容器：页头（PageTopbar）在其之外固定，不随滚动 */
const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 32px 48px;

  @media (max-width: 768px) {
    padding: 0 16px 40px;
  }
`

const Content = styled.div`
  max-width: 760px;
  margin: 0 auto;
`

const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`

const Intro = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0 4px;
`

const IntroMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid var(--chrome-border);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: ${spin} 800ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const CodeBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

/** 设备授权码：等宽大字 + 高对比底色，键盘可选中文本 */
const Code = styled.code`
  font-family: var(--font-mono);
  font-size: 22px;
  letter-spacing: 3px;
  color: var(--text-primary);
  background: var(--chrome-hover);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  padding: 6px 14px;
  user-select: all;
`

const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0 4px;
  flex-wrap: wrap;
`

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--chrome-border);
  background: var(--chrome-hover);
  object-fit: cover;
`

const IdentityMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  & > strong {
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }
`

const ScopeTags = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const ScopeTag = styled.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  background: var(--chrome-hover);
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  padding: 1px 7px;
`

const KindTag = styled(ScopeTag)`
  color: var(--primary-color);
`

const StaleBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid color-mix(in oklab, var(--danger-color) 35%, transparent);
  background: color-mix(in oklab, var(--danger-color) 8%, transparent);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 13px;
`

const RowError = styled.span`
  flex-basis: 100%;
  font-size: 12px;
  color: var(--danger-color);
`

const RowStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--success-color);
`

const RepoList = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow: auto;
`

const RepoRow = styled.li<{ $default: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: 1px solid ${(props) => (props.$default ? 'var(--primary-color)' : 'var(--chrome-border)')};
  border-radius: var(--border-radius-sm);
  background: ${(props) => (props.$default ? 'color-mix(in oklab, var(--primary-color) 7%, transparent)' : 'transparent')};
`

const RepoName = styled.code`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const RepoDesc = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const PrivacyTag = styled(ScopeTag)`
  flex-shrink: 0;
`

/** PAT 回退折叠区：原生 details/summary 保键盘可达与无障碍语义 */
const PatDetails = styled.details`
  margin-top: 12px;
  border-top: 1px dashed var(--chrome-border);
  padding-top: 10px;

  & > summary {
    cursor: pointer;
    font-size: 12px;
    color: var(--text-muted);
    user-select: none;

    &:hover {
      color: var(--text-primary);
    }
  }
`

const PatBody = styled.div`
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SavedFlash = ({ show }: { show: boolean }): React.JSX.Element => {
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

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

type AuthView = { state: 'idle' } | { state: 'pending'; start: DeviceFlowStart }

type GitFieldKey = 'gitUserName' | 'gitUserEmail'

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

  const query = repoQuery.trim().toLowerCase()
  const filtered = repos?.filter((r) => !query || r.fullName.toLowerCase().includes(query)) ?? []
  const defaultRepo = settings?.siteRepo ?? null

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
          <SettingSection
            id="account-github"
            title={t('account.sectionAccount')}
            description={t('account.accountDesc')}
          >
            {auth.state === 'pending' ? (
              <Intro>
                <Spinner aria-hidden />
                <IntroMeta>
                  <span aria-live="polite">{t('account.authPending')}</span>
                  <HintText style={{ margin: 0 }}>{t('account.authPendingHint')}</HintText>
                  <CodeBox>
                    <Code data-device-code aria-label={t('account.userCodeAria')}>
                      {auth.start.userCode}
                    </Code>
                    <Button variant="default" size="sm" onClick={copyCode} aria-label={t('account.copyCode')}>
                      <AppIcon icon={copied ? IconCheck : IconCopy} size="sm" />
                      {copied ? t('account.copied') : t('account.copyCode')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void window.api.openExternal(auth.start.verificationUri)}
                      aria-label={t('account.reopenPage')}
                    >
                      <AppIcon icon={IconExternalLink} size="sm" />
                      {t('account.reopenPage')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelAuth}>
                      {t('account.cancelAuth')}
                    </Button>
                  </CodeBox>
                </IntroMeta>
              </Intro>
            ) : identityLoading ? (
              <Intro>
                <Spinner aria-hidden />
                <HintText style={{ margin: 0 }}>{t('account.authPending')}</HintText>
              </Intro>
            ) : identity?.stale ? (
              <Intro>
                <IntroMeta>
                  <StaleBanner role="alert">{t('account.staleBanner')}</StaleBanner>
                  <div>
                    <Button variant="primary" onClick={startAuth}>
                      {t('account.reauth')}
                    </Button>
                  </div>
                </IntroMeta>
              </Intro>
            ) : identity ? (
              <>
                <IdentityRow>
                  <Avatar src={identity.avatarUrl} alt="" data-identity-avatar />
                  <IdentityMeta>
                    <strong>{identity.name || identity.login}</strong>
                    <HintText style={{ margin: 0 }}>{identity.login}</HintText>
                  </IdentityMeta>
                  <KindTag>{identity.kind === 'oauth' ? t('account.kindOauth') : t('account.kindPat')}</KindTag>
                  <div style={{ flex: 1 }} />
                  <Button variant="danger" size="sm" onClick={disconnect}>
                    {t('account.disconnect')}
                  </Button>
                </IdentityRow>
                <ScopeTags data-identity-scopes aria-label={t('account.scopesLabel')}>
                  <HintText style={{ margin: 0 }}>{t('account.scopesLabel')}:</HintText>
                  {identity.scopes.length === 0 ? (
                    <HintText style={{ margin: 0 }}>{t('account.scopeNone')}</HintText>
                  ) : (
                    identity.scopes.map((s) => <ScopeTag key={s}>{s}</ScopeTag>)
                  )}
                </ScopeTags>
              </>
            ) : (
              <Intro>
                <GithubIcon size={36} aria-hidden />
                <IntroMeta>
                  <Button variant="primary" onClick={startAuth}>
                    {t('account.authStart')}
                  </Button>
                  <HintText style={{ margin: 0 }}>{t('account.accountDesc')}</HintText>
                </IntroMeta>
              </Intro>
            )}

            {authError && (
              <ErrorText role="alert" style={{ marginBottom: 0 }}>
                {authError}
              </ErrorText>
            )}
            {identityError && identity === null && (
              <ErrorText role="alert" style={{ marginBottom: 0 }}>
                {t('account.identityError')}：{identityError}
              </ErrorText>
            )}

            {auth.state !== 'pending' && (
              <PatDetails>
                <summary>{t('account.patToggle')}</summary>
                <PatBody>
                  <HintText style={{ margin: 0 }}>{t('account.patDesc')}</HintText>
                  <SettingRow htmlFor="account-pat" label="GitHub Token">
                    <Input
                      id="account-pat"
                      type="password"
                      placeholder={t('account.patPlaceholder')}
                      value={patInput}
                      onChange={(e) => setPatInput(e.target.value)}
                    />
                    <Button variant="primary" onClick={savePat}>
                      {t('account.patSave')}
                    </Button>
                    {identity !== null && tokenKind !== null && (
                      <Button variant="danger" onClick={disconnect}>
                        {t('account.patClear')}
                      </Button>
                    )}
                    <SavedFlash show={patSaved} />
                    {patError && <RowError role="alert">{patError}</RowError>}
                  </SettingRow>
                </PatBody>
              </PatDetails>
            )}
          </SettingSection>

          <SettingSection id="account-repos" title={t('account.sectionRepos')} description={t('account.reposDesc')}>
            {!authed ? (
              <HintText style={{ margin: 0 }}>{t('account.reposDesc')}</HintText>
            ) : reposError ? (
              <>
                <ErrorText style={{ marginBottom: 0 }} role="alert">
                  {t('account.reposError')}：{reposError}
                </ErrorText>
                <div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setRepoReloadTick((n) => n + 1)}
                  >
                    {t('common.retry')}
                  </Button>
                </div>
              </>
            ) : repos === null ? (
              <Intro>
                <Spinner aria-hidden />
                <HintText style={{ margin: 0 }}>{t('account.authPending')}</HintText>
              </Intro>
            ) : (
              <>
                <SettingRow htmlFor="account-repo-search" label={t('account.reposSearchAria')}>
                  <Input
                    id="account-repo-search"
                    placeholder={t('account.reposSearchPlaceholder')}
                    value={repoQuery}
                    onChange={(e) => setRepoQuery(e.target.value)}
                  />
                  <AppIcon icon={IconSearch} size="sm" aria-hidden />
                </SettingRow>
                {filtered.length === 0 ? (
                  <HintText style={{ margin: '8px 0 0' }}>{t('account.reposEmpty')}</HintText>
                ) : (
                  <RepoList data-repo-list>
                    {filtered.map((repo) => {
                      const isDefault = repo.fullName === defaultRepo
                      return (
                        <RepoRow key={repo.fullName} $default={isDefault}>
                          <RepoName>{repo.fullName}</RepoName>
                          {repo.private && <PrivacyTag>{t('account.repoPrivate')}</PrivacyTag>}
                          <RepoDesc>{repo.description ?? ''}</RepoDesc>
                          {isDefault ? (
                            <>
                              <KindTag>{t('account.defaultCurrent')}</KindTag>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDefaultRepo(null)}
                                aria-label={t('account.defaultClearAria')}
                              >
                                {t('account.defaultClear')}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setDefaultRepo(repo.fullName)}
                              aria-label={t('account.defaultSetAria', { repo: repo.fullName })}
                            >
                              {t('account.defaultSet')}
                            </Button>
                          )}
                        </RepoRow>
                      )
                    })}
                  </RepoList>
                )}
              </>
            )}
          </SettingSection>

          <SettingSection id="account-git" title={t('account.sectionGit')} description={t('account.gitDesc')}>
            <SettingRow htmlFor="account-git-user-name" label="user.name">
              <Input
                id="account-git-user-name"
                placeholder={gitDefault?.name ?? t('account.gitUnset')}
                value={settings?.gitUserName ?? ''}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, gitUserName: e.target.value } : s))
                }
                onBlur={() => void saveGit('gitUserName', settings?.gitUserName ?? null)}
              />
              <SavedFlash show={savedField === 'gitUserName'} />
              {fieldErrors.gitUserName && <RowError role="alert">{fieldErrors.gitUserName}</RowError>}
            </SettingRow>
            <SettingRow htmlFor="account-git-user-email" label="user.email">
              <Input
                id="account-git-user-email"
                placeholder={gitDefault?.email ?? t('account.gitUnset')}
                value={settings?.gitUserEmail ?? ''}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, gitUserEmail: e.target.value } : s))
                }
                onBlur={() => void saveGit('gitUserEmail', settings?.gitUserEmail ?? null)}
              />
              <SavedFlash show={savedField === 'gitUserEmail'} />
              {fieldErrors.gitUserEmail && <RowError role="alert">{fieldErrors.gitUserEmail}</RowError>}
            </SettingRow>
          </SettingSection>
        </Sections>
      </Content>
      </ScrollArea>
    </Page>
  )
}
