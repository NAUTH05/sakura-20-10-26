import './admin.css'

export function Card({ title, description, children, actions }) {
  return (
    <section className="adm-card">
      {(title || actions) && (
        <header className="adm-card__head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="adm-card__actions">{actions}</div>}
        </header>
      )}
      <div className="adm-card__body">{children}</div>
    </section>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="adm-field">
      <span className="adm-field__label">{label}</span>
      {children}
      {hint && <span className="adm-field__hint">{hint}</span>}
    </label>
  )
}

export function TextInput({ value, onChange, ...rest }) {
  return <input className="adm-input" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
}

export function TextArea({ value, onChange, rows = 4, ...rest }) {
  return (
    <textarea
      className="adm-input adm-textarea"
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

export function Select({ value, onChange, options }) {
  return (
    <select className="adm-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="adm-toggle">
      <div>
        <span className="adm-toggle__label">{label}</span>
        {hint && <span className="adm-toggle__hint">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`adm-switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  )
}

export function Range({ label, value, onChange, min = 0, max = 1, step = 0.05, format }) {
  return (
    <div className="adm-range">
      <div className="adm-range__top">
        <span>{label}</span>
        <em>{format ? format(value) : value}</em>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function Button({ children, variant = 'default', ...rest }) {
  return (
    <button type="button" className={`adm-btn adm-btn--${variant}`} {...rest}>
      {children}
    </button>
  )
}

export function SaveBar({ dirty, saving, onSave, savedAt }) {
  return (
    <div className={`adm-savebar ${dirty ? 'is-dirty' : ''}`}>
      <span>
        {saving ? 'Đang lưu…' : dirty ? 'Có thay đổi chưa lưu' : savedAt ? `Đã lưu ${savedAt}` : 'Đã đồng bộ'}
      </span>
      <Button variant="primary" onClick={onSave} disabled={!dirty || saving}>
        Lưu thay đổi
      </Button>
    </div>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`adm-toast adm-toast--${toast.tone}`} role="status">
      {toast.message}
    </div>
  )
}
