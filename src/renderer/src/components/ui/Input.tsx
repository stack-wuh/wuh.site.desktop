import { cx } from './cx'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input(props: InputProps): React.JSX.Element {
  const { className, ...rest } = props
  return <input className={cx('ui-input', className)} {...rest} />
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea(props: TextareaProps): React.JSX.Element {
  const { className, ...rest } = props
  return <textarea className={cx('ui-textarea', className)} {...rest} />
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select(props: SelectProps): React.JSX.Element {
  const { className, ...rest } = props
  return <select className={cx('ui-select', className)} {...rest} />
}
