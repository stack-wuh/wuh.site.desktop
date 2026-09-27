'use client'

/**
 * 用户中心「GitHub 账户」区（拆分自 AccountPage 单文件，20260926-refactor-mega-component-split）：
 * Device Flow 授权三态 UI（未授权/pending 用户码/已授权身份卡）+ stale 横幅 +
 * PAT 回退折叠区。状态与 handler 全部由宿主 AccountPage 持有并注入。
 */
import type { DeviceFlowStart, GithubIdentity, TokenKind } from '@shared/types'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { AppIcon } from '../../ui/AppIcon'
import { ErrorText, HintText } from '../../ui/Text'
import { SettingRow } from '../../ui/SettingRow'
import { SettingSection } from '../../settings/SettingSection'
import { GithubIcon } from '../../ui/GithubIcon'
import { IconCheck, IconCopy, IconExternalLink } from '../../icons'
import { useLocale } from '../../../lib/i18n/context'
import {
  Avatar,
  Code,
  CodeBox,
  IdentityMeta,
  IdentityRow,
  Intro,
  IntroMeta,
  KindTag,
  PatBody,
  PatDetails,
  RowError,
  SavedFlash,
  ScopeTag,
  ScopeTags,
  Spinner,
  StaleBanner
} from './styles'

export type AuthView = { state: 'idle' } | { state: 'pending'; start: DeviceFlowStart }

export function AuthFlow(props: {
  auth: AuthView
  authError: string | null
  identity: GithubIdentity | null
  identityLoading: boolean
  identityError: string | null
  tokenKind: TokenKind | null
  copied: boolean
  patInput: string
  patError: string | null
  patSaved: boolean
  onCopyCode: () => void
  onStartAuth: () => void
  onCancelAuth: () => void
  onDisconnect: () => void
  onPatInput: (value: string) => void
  onPatSave: () => void
}): React.JSX.Element {
  const { t } = useLocale()
  // const 解构保留原判别收窄语义（回调内引用 auth.start 不失窄）
  const { auth, identity } = props
  return (
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
              <Button variant="default" size="sm" onClick={props.onCopyCode} aria-label={t('account.copyCode')}>
                <AppIcon icon={props.copied ? IconCheck : IconCopy} size="sm" />
                {props.copied ? t('account.copied') : t('account.copyCode')}
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
              <Button variant="ghost" size="sm" onClick={props.onCancelAuth}>
                {t('account.cancelAuth')}
              </Button>
            </CodeBox>
          </IntroMeta>
        </Intro>
      ) : props.identityLoading ? (
        <Intro>
          <Spinner aria-hidden />
          <HintText style={{ margin: 0 }}>{t('account.authPending')}</HintText>
        </Intro>
      ) : identity?.stale ? (
        <Intro>
          <IntroMeta>
            <StaleBanner role="alert">{t('account.staleBanner')}</StaleBanner>
            <div>
              <Button variant="primary" onClick={props.onStartAuth}>
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
            <Button variant="danger" size="sm" onClick={props.onDisconnect}>
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
            <Button variant="primary" onClick={props.onStartAuth}>
              {t('account.authStart')}
            </Button>
            <HintText style={{ margin: 0 }}>{t('account.accountDesc')}</HintText>
          </IntroMeta>
        </Intro>
      )}

      {props.authError && (
        <ErrorText role="alert" style={{ marginBottom: 0 }}>
          {props.authError}
        </ErrorText>
      )}
      {props.identityError && identity === null && (
        <ErrorText role="alert" style={{ marginBottom: 0 }}>
          {t('account.identityError')}：{props.identityError}
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
                value={props.patInput}
                onChange={(e) => props.onPatInput(e.target.value)}
              />
              <Button variant="primary" onClick={props.onPatSave}>
                {t('account.patSave')}
              </Button>
              {identity !== null && props.tokenKind !== null && (
                <Button variant="danger" onClick={props.onDisconnect}>
                  {t('account.patClear')}
                </Button>
              )}
              <SavedFlash show={props.patSaved} />
              {props.patError && <RowError role="alert">{props.patError}</RowError>}
            </SettingRow>
          </PatBody>
        </PatDetails>
      )}
    </SettingSection>
  )
}
