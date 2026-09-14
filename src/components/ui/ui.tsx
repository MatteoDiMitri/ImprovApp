import type { ReactNode } from 'react'

/* --------------------------------- Card --------------------------------- */

export function Card({ title, note, action, children, accent, flush, className = '' }: {
  title?: string
  note?: ReactNode
  action?: ReactNode
  children: ReactNode
  accent?: string
  flush?: boolean
  className?: string
}) {
  return (
    <section
      className={`card${flush ? ' card--flush' : ''}${accent ? ' section-accent' : ''} ${className}`}
      style={accent ? ({ ['--accent' as string]: accent, borderTopColor: accent }) : undefined}
    >
      {(title || action) && (
        <div className="card__head" style={flush ? { padding: '14px 16px 0', marginBottom: 8 } : undefined}>
          {title && <h3 className="card__title">{title}</h3>}
          {note && <span className="card__note">{note}</span>}
          {action && <span style={{ marginLeft: note ? 8 : 'auto' }}>{action}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

/* --------------------------------- Stat --------------------------------- */

export function Stat({ label, value, unit, delta, hint }: {
  label: string
  value: ReactNode
  unit?: string
  /** `dir` decide solo il colore (su/giù = bene/male); `arrow` il verso mostrato. */
  delta?: { value: string; dir: 'up' | 'down' | 'flat'; arrow?: string }
  hint?: ReactNode
}) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value num">
        {value}{unit && <span className="stat__unit">{unit}</span>}
      </span>
      {delta && (
        <span className={`stat__delta stat__delta--${delta.dir}`}>
          {delta.arrow ?? (delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '■')} {delta.value}
        </span>
      )}
      {hint && <span className="small muted">{hint}</span>}
    </div>
  )
}

/* -------------------------------- Empty --------------------------------- */

export function Empty({ icon = '✨', text, action }: { icon?: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">{icon}</span>
      <span className="small">{text}</span>
      {action}
    </div>
  )
}

/* ------------------------------- Segmented ------------------------------ */

export function Segmented<T extends string>({ value, options, onChange, accent }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  accent?: string
}) {
  return (
    <div className="chipbar" role="group">
      {options.map(o => (
        <button
          key={o.value}
          className={`chip${accent ? ' chip--accent' : ''}`}
          aria-pressed={o.value === value}
          style={accent ? ({ ['--accent' as string]: accent }) : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* --------------------------------- Field -------------------------------- */

export function Field({ label, children, style }: { label: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <label className="field" style={style}>
      <span className="field__label">{label}</span>
      {children}
    </label>
  )
}

/* --------------------------------- Bar ---------------------------------- */

export function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="bar">
      <div
        className="bar__fill"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  )
}
