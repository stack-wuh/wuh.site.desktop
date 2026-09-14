interface Props {
  icon?: React.ReactNode
  title: string
  hint?: string
}

export function Empty(props: Props): React.JSX.Element {
  return (
    <div className="ui-empty">
      {props.icon && <div className="ui-empty__icon">{props.icon}</div>}
      <div className="ui-empty__title">{props.title}</div>
      {props.hint && <div className="ui-empty__hint">{props.hint}</div>}
    </div>
  )
}
