import { cx } from './cx'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button(props: Props): React.JSX.Element {
  const { variant = 'default', size = 'md', className, ...rest } = props
  return (
    <button
      className={cx('ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`, className)}
      {...rest}
    />
  )
}
