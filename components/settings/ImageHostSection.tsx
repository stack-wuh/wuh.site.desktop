'use client'

/**
 * 设置页「图床」区块（20261007-feature-image-host-plugin）：
 * 上传模式三选（local=仅本地 .assets / oss=阿里云 OSS 直传 / command=外部上传命令）、
 * OSS 非敏感配置（endpoint/bucket/自定义域名/默认目录模板）、AccessKey 保存与清除
 * （经 setOssCredentials 走 safeStorage 加密独立存储，值不回显、不进 settings.json）、
 * 连接测试与上传命令配置。保存反馈为行内 ✓ / 错误文案（与设置页既有行内语义一致）。
 */
import { useEffect, useState } from 'react'
import type { AppSettings, OssSettings, UploadMode } from '@shared/types'
import styled from 'styled-components'
import { Input } from '../ui/Input'
import { SettingRow } from '../ui/SettingRow'
import { SettingSection } from './SettingSection'
import { useLocale } from '../../lib/i18n/context'

const EMPTY_OSS: OssSettings = { endpoint: '', bucket: '', customDomain: null, prefixTemplate: null }

const MODES: UploadMode[] = ['local', 'oss', 'command']

const ModeGroup = styled.div`
  display: inline-flex;
  gap: 0;
  border: 1px solid var(--chrome-border);
  border-radius: var(--border-radius-sm);
  overflow: hidden;
`

const ModeButton = styled.button<{ $active: boolean }>`
  font: inherit;
  font-size: 12px;
  padding: 5px 12px;
  border: none;
  cursor: pointer;
  background: ${(props) =>
    props.$active ? 'color-mix(in oklab, var(--primary-color) 14%, transparent)' : 'transparent'};
  color: ${(props) => (props.$active ? 'var(--primary-color)' : 'var(--text-secondary)')};

  & + & {
    border-left: 1px solid var(--chrome-border);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`

const Feedback = styled.span<{ $kind: 'ok' | 'error' | 'muted' }>`
  font-size: 12px;
  color: ${(props) =>
    props.$kind === 'ok' ? 'var(--success-color)' : props.$kind === 'error' ? 'var(--danger-color)' : 'var(--text-muted)'};
`

const OssInput = styled(Input)`
  width: 260px;
`

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function ImageHostSection(): React.JSX.Element {
  const { t } = useLocale()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [hasCreds, setHasCreds] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [akId, setAkId] = useState('')
  const [akSecret, setAkSecret] = useState('')
  const [testState, setTestState] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  useEffect(() => {
    void window.api
      .getSettings()
      .then((s) => {
        setSettings(s.settings)
        setHasCreds(s.hasOssCredentials)
      })
      .catch((err: unknown) => setError(errText(err)))
  }, [])

  const showFlash = (text: string): void => {
    setFlash(text)
    window.setTimeout(() => setFlash(null), 1800)
  }

  const save = async (patch: Partial<AppSettings>, flashText?: string): Promise<void> => {
    try {
      const s = await window.api.setSettings(patch)
      setSettings(s.settings)
      setError(null)
      if (flashText) showFlash(flashText)
    } catch (err) {
      setError(errText(err))
    }
  }

  const saveOss = (patch: Partial<OssSettings>): void => {
    if (!settings) return
    void save({ oss: { ...(settings.oss ?? EMPTY_OSS), ...patch } })
  }

  const setMode = (mode: UploadMode): void => {
    if (!settings || settings.uploadMode === mode) return
    void save({ uploadMode: mode })
  }

  const saveCreds = async (): Promise<void> => {
    try {
      await window.api.setOssCredentials(akId, akSecret)
      setAkId('')
      setAkSecret('')
      setHasCreds(true)
      setError(null)
      showFlash(t('settings.ossCredsSaved'))
    } catch (err) {
      setError(errText(err))
    }
  }

  const clearCreds = async (): Promise<void> => {
    try {
      await window.api.clearOssCredentials()
      setHasCreds(false)
      setError(null)
    } catch (err) {
      setError(errText(err))
    }
  }

  const runTest = async (): Promise<void> => {
    setTestState('running')
    setTestError(null)
    try {
      const res = await window.api.testOssConnection()
      if (res.ok) {
        setTestState('ok')
      } else {
        setTestState('fail')
        setTestError(res.error ?? t('settings.ossTestFail'))
      }
    } catch (err) {
      setTestState('fail')
      setTestError(errText(err))
    }
  }

  if (!settings) {
    return (
      <SettingSection id="imageHost" title={t('settings.navImageHost')} description={t('settings.imageHostDesc')}>
        {error && <Feedback $kind="error" role="alert">{error}</Feedback>}
      </SettingSection>
    )
  }

  const oss = settings.oss ?? EMPTY_OSS

  return (
    <SettingSection id="imageHost" title={t('settings.navImageHost')} description={t('settings.imageHostDesc')}>
      <SettingRow htmlFor="settings-upload-mode" label={t('settings.uploadMode')} description={t('settings.uploadModeDesc')}>
        <ModeGroup role="radiogroup" aria-label={t('settings.uploadMode')}>
          {MODES.map((mode) => (
            <ModeButton
              key={mode}
              type="button"
              $active={settings.uploadMode === mode}
              aria-checked={settings.uploadMode === mode}
              role="radio"
              onClick={() => setMode(mode)}
            >
              {t(`settings.uploadMode_${mode}`)}
            </ModeButton>
          ))}
        </ModeGroup>
      </SettingRow>

      <SettingRow htmlFor="settings-oss-endpoint" label={t('settings.ossEndpoint')} description={t('settings.ossEndpointHint')}>
        <OssInput
          id="settings-oss-endpoint"
          placeholder="oss-cn-hangzhou.aliyuncs.com"
          value={oss.endpoint}
          onChange={(e) => setSettings({ ...settings, oss: { ...oss, endpoint: e.target.value } })}
          onBlur={(e) => saveOss({ endpoint: e.target.value.trim() })}
        />
      </SettingRow>

      <SettingRow htmlFor="settings-oss-bucket" label={t('settings.ossBucket')}>
        <OssInput
          id="settings-oss-bucket"
          value={oss.bucket}
          onChange={(e) => setSettings({ ...settings, oss: { ...oss, bucket: e.target.value } })}
          onBlur={(e) => saveOss({ bucket: e.target.value.trim() })}
        />
      </SettingRow>

      <SettingRow htmlFor="settings-oss-domain" label={t('settings.ossDomain')} description={t('settings.ossDomainHint')}>
        <OssInput
          id="settings-oss-domain"
          placeholder="cdn.example.com"
          value={oss.customDomain ?? ''}
          onChange={(e) => setSettings({ ...settings, oss: { ...oss, customDomain: e.target.value || null } })}
          onBlur={(e) => saveOss({ customDomain: e.target.value.trim() || null })}
        />
      </SettingRow>

      <SettingRow htmlFor="settings-oss-prefix" label={t('settings.ossPrefix')} description={t('settings.ossPrefixHint')}>
        <OssInput
          id="settings-oss-prefix"
          placeholder="blog/{yyyy}/{MM}"
          value={oss.prefixTemplate ?? ''}
          onChange={(e) => setSettings({ ...settings, oss: { ...oss, prefixTemplate: e.target.value || null } })}
          onBlur={(e) => saveOss({ prefixTemplate: e.target.value.trim() || null })}
        />
      </SettingRow>

      <SettingRow
        htmlFor="settings-oss-key-id"
        label={t('settings.ossKeyId')}
        description={hasCreds ? t('settings.ossCredsConfigured') : t('settings.ossCredsMissing')}
      >
        <OssInput
          id="settings-oss-key-id"
          type="password"
          autoComplete="off"
          placeholder="AccessKey ID"
          value={akId}
          onChange={(e) => setAkId(e.target.value)}
        />
        <OssInput
          type="password"
          autoComplete="new-password"
          placeholder="AccessKey Secret"
          value={akSecret}
          onChange={(e) => setAkSecret(e.target.value)}
        />
        <button type="button" onClick={() => void saveCreds()} disabled={!akId.trim() || !akSecret.trim()}>
          {t('settings.ossSaveCreds')}
        </button>
        {hasCreds && (
          <button type="button" onClick={() => void clearCreds()}>
            {t('settings.ossClearCreds')}
          </button>
        )}
      </SettingRow>

      <SettingRow label={t('settings.ossTest')}>
        <button type="button" onClick={() => void runTest()} disabled={testState === 'running'}>
          {t('settings.ossTest')}
        </button>
        {testState === 'ok' && <Feedback $kind="ok">{t('settings.ossTestOk')}</Feedback>}
        {testState === 'fail' && (
          <Feedback $kind="error" role="alert">
            {testError ?? t('settings.ossTestFail')}
          </Feedback>
        )}
      </SettingRow>

      <SettingRow htmlFor="settings-upload-command" label={t('settings.uploadCommandField')} description={t('settings.uploadCommandHint')}>
        <OssInput
          id="settings-upload-command"
          placeholder="picgo u {file}"
          value={settings.uploadCommand ?? ''}
          onChange={(e) => setSettings({ ...settings, uploadCommand: e.target.value || null })}
          onBlur={(e) => void save({ uploadCommand: e.target.value.trim() || null })}
        />
      </SettingRow>

      {flash && <Feedback $kind="ok" role="status" aria-live="polite">{flash}</Feedback>}
      {error && <Feedback $kind="error" role="alert">{error}</Feedback>}
    </SettingSection>
  )
}
