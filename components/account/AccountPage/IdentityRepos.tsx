'use client'

/**
 * 用户中心「仓库 + Git 提交身份」区（拆分自 AccountPage 单文件，
 * 20260926-refactor-mega-component-split）：仓库列表（搜索/默认站点仓库设置/重试）
 * 与 Git user.name/user.email 两行（失焦保存 + 瞬时已存反馈）。状态与 handler
 * 全部由宿主 AccountPage 持有并注入。
 */
import type { AppSettings, GitIdentityDefault, RepoSummary } from '@shared/types'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { AppIcon } from '../../ui/AppIcon'
import { ErrorText, HintText } from '../../ui/Text'
import { SettingRow } from '../../ui/SettingRow'
import { SettingSection } from '../../settings/SettingSection'
import { IconSearch } from '../../icons'
import { useLocale } from '../../../lib/i18n/context'
import {
  Intro,
  KindTag,
  PrivacyTag,
  RepoDesc,
  RepoList,
  RepoName,
  RepoRow,
  RowError,
  SavedFlash,
  Spinner
} from './styles'

export type GitFieldKey = 'gitUserName' | 'gitUserEmail'

export function IdentityRepos(props: {
  authed: boolean
  repos: RepoSummary[] | null
  reposError: string | null
  repoQuery: string
  defaultRepo: string | null
  settings: AppSettings | null
  gitDefault: GitIdentityDefault | null
  savedField: GitFieldKey | null
  fieldErrors: Partial<Record<GitFieldKey, string>>
  onRepoQuery: (value: string) => void
  onRepoReload: () => void
  onSetDefaultRepo: (fullName: string | null) => void
  onGitChange: (field: GitFieldKey, value: string) => void
  onSaveGit: (field: GitFieldKey, value: string | null) => void
}): React.JSX.Element {
  const { t } = useLocale()
  const query = props.repoQuery.trim().toLowerCase()
  const filtered = props.repos?.filter((r) => !query || r.fullName.toLowerCase().includes(query)) ?? []
  return (
    <>
      <SettingSection id="account-repos" title={t('account.sectionRepos')} description={t('account.reposDesc')}>
        {!props.authed ? (
          <HintText style={{ margin: 0 }}>{t('account.reposDesc')}</HintText>
        ) : props.reposError ? (
          <>
            <ErrorText style={{ marginBottom: 0 }} role="alert">
              {t('account.reposError')}：{props.reposError}
            </ErrorText>
            <div>
              <Button variant="default" size="sm" onClick={props.onRepoReload}>
                {t('common.retry')}
              </Button>
            </div>
          </>
        ) : props.repos === null ? (
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
                value={props.repoQuery}
                onChange={(e) => props.onRepoQuery(e.target.value)}
              />
              <AppIcon icon={IconSearch} size="sm" aria-hidden />
            </SettingRow>
            {filtered.length === 0 ? (
              <HintText style={{ margin: '8px 0 0' }}>{t('account.reposEmpty')}</HintText>
            ) : (
              <RepoList data-repo-list>
                {filtered.map((repo) => {
                  const isDefault = repo.fullName === props.defaultRepo
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
                            onClick={() => props.onSetDefaultRepo(null)}
                            aria-label={t('account.defaultClearAria')}
                          >
                            {t('account.defaultClear')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => props.onSetDefaultRepo(repo.fullName)}
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
            placeholder={props.gitDefault?.name ?? t('account.gitUnset')}
            value={props.settings?.gitUserName ?? ''}
            onChange={(e) => props.onGitChange('gitUserName', e.target.value)}
            onBlur={() => props.onSaveGit('gitUserName', props.settings?.gitUserName ?? null)}
          />
          <SavedFlash show={props.savedField === 'gitUserName'} />
          {props.fieldErrors.gitUserName && <RowError role="alert">{props.fieldErrors.gitUserName}</RowError>}
        </SettingRow>
        <SettingRow htmlFor="account-git-user-email" label="user.email">
          <Input
            id="account-git-user-email"
            placeholder={props.gitDefault?.email ?? t('account.gitUnset')}
            value={props.settings?.gitUserEmail ?? ''}
            onChange={(e) => props.onGitChange('gitUserEmail', e.target.value)}
            onBlur={() => props.onSaveGit('gitUserEmail', props.settings?.gitUserEmail ?? null)}
          />
          <SavedFlash show={props.savedField === 'gitUserEmail'} />
          {props.fieldErrors.gitUserEmail && <RowError role="alert">{props.fieldErrors.gitUserEmail}</RowError>}
        </SettingRow>
      </SettingSection>
    </>
  )
}
