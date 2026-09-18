import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/Button'
import { AppIcon } from './ui/AppIcon'
import { IconCheck, IconPalette } from './icons'
import { useTheme } from '../theme/ThemeProvider'
import type { ColorScheme, ThemeFamily } from '../theme/tokens'

const FAMILIES: { id: ThemeFamily; label: string }[] = [
  { id: 'wine', label: '酒红' },
  { id: 'plain', label: '素雅' }
]

const SCHEMES: { id: ColorScheme; label: string }[] = [
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' }
]

export function AppearanceMenu(): React.JSX.Element {
  const { family, scheme, setFamily, setScheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="appearance-menu" ref={ref}>
      <Button variant="ghost" size="sm" title="外观" onClick={() => setOpen((v) => !v)}>
        <AppIcon icon={IconPalette} size="md" />
      </Button>
      {open && (
        <div className="appearance-pop">
          <div className="appearance-group">
            <span className="appearance-label">主题</span>
            {FAMILIES.map((f) => (
              <button
                key={f.id}
                className="appearance-item"
                onClick={() => setFamily(f.id)}
              >
                {f.label}
                {family === f.id && <AppIcon icon={IconCheck} size="sm" />}
              </button>
            ))}
          </div>
          <div className="appearance-group">
            <span className="appearance-label">外观</span>
            {SCHEMES.map((s) => (
              <button
                key={s.id}
                className="appearance-item"
                onClick={() => setScheme(s.id)}
              >
                {s.label}
                {scheme === s.id && <AppIcon icon={IconCheck} size="sm" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
