import { cx } from './cx'

interface Props {
  color?: string
  onRemove?: () => void
  children: React.ReactNode
  className?: string
}

/** 彩色标签：color 为 hex（GitHub labels 风格），缺省用主题色 */
export function Tag(props: Props): React.JSX.Element {
  const { color, onRemove, children, className } = props
  return (
    <span className={cx('ui-tag', className)} style={color ? { backgroundColor: color } : undefined}>
      {children}
      {onRemove && (
        <button
          type="button"
          className="ui-tag__remove"
          aria-label="删除"
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </span>
  )
}
