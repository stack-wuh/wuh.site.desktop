'use client'

/**
 * 设置页「外观与语言」区段（20261015-feature-workbench-shell review 修复）：
 * 主题（酒红/素雅）、外观（跟随系统/浅色/深色）、语言（中文/English/日本語）三行。
 * 三入口原挂 SideMenu 设置项快捷面板，随 SideMenu 退役迁入本区段（回归修复：
 * 曾一度全仓无 setFamily/setScheme/setLocale 消费方）。持久化沿用 ThemeProvider /
 * LocaleProvider 既有机制（wd.theme / wd.locale），本区段只做控制面。
 */
import { SettingRow } from '../ui/SettingRow'
import { SegmentedControl } from '../ui/SegmentedControl'
import { SettingSection } from './SettingSection'
import { useTheme } from '../theme/ThemeProvider'
import { useLocale } from '@/lib/i18n/context'
import { localeLabels, localeOrder, type Locale } from '@/lib/i18n/locales'

const FAMILIES = ['wine', 'plain'] as const

export function AppearanceSection(): React.JSX.Element {
  const { t, locale, setLocale } = useLocale()
  const { family, scheme, setFamily, setScheme } = useTheme()

  return (
    <SettingSection id="appearance" title={t('settings.navAppearance')} description={t('settings.appearanceDesc')}>
      <SettingRow htmlFor="settings-theme-family" label={t('pop.theme')} description={t('settings.themeDesc')}>
        <SegmentedControl
          ariaLabel={t('pop.theme')}
          value={family}
          options={FAMILIES.map((f) => ({
            value: f,
            label: f === 'wine' ? t('pop.themeWine') : t('pop.themePlain')
          }))}
          onChange={setFamily}
        />
      </SettingRow>

      <SettingRow htmlFor="settings-color-scheme" label={t('pop.appearance')} description={t('settings.schemeDesc')}>
        <SegmentedControl
          ariaLabel={t('pop.appearance')}
          value={scheme}
          options={[
            { value: 'system', label: t('pop.system') },
            { value: 'light', label: t('pop.light') },
            { value: 'dark', label: t('pop.dark') }
          ]}
          onChange={setScheme}
        />
      </SettingRow>

      <SettingRow htmlFor="settings-locale" label={t('pop.language')} description={t('settings.languageDesc')}>
        <SegmentedControl
          ariaLabel={t('pop.language')}
          value={locale}
          options={localeOrder.map((l: Locale) => ({ value: l, label: localeLabels[l].native }))}
          onChange={setLocale}
        />
      </SettingRow>
    </SettingSection>
  )
}
