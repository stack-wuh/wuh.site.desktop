'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './theme/ThemeProvider'

/** 客户端 Provider 聚合（对齐 site app/components/AppProviders 模式） */
export default function AppProviders({ children }: { children: ReactNode }): React.JSX.Element {
  return <ThemeProvider>{children}</ThemeProvider>
}
