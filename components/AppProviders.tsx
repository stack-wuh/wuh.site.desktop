'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './theme/ThemeProvider'
import { LocaleProvider } from '../lib/i18n/context'

/** 客户端 Provider 聚合（对齐 site app/components/AppProviders 模式） */
export default function AppProviders({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <LocaleProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </LocaleProvider>
  )
}
