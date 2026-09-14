interface Props {
  /** 0..1 */
  value: number
  size?: number
  thickness?: number
  color?: string
  label?: string
  caption?: string
}

/**
 * Anello di avanzamento: una sola misura, quindi niente legenda —
 * il numero al centro è l'etichetta diretta.
 */
export function RadialGauge({
  value, size = 92, thickness = 9, color = 'var(--s-studio)', label, caption,
}: Props) {
  const pct = Math.max(0, Math.min(1, value))
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`${label ?? 'Avanzamento'}: ${Math.round(pct * 100)}%`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
          <circle
            cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={thickness}
            strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.25,1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: size * 0.23, fontVariantNumeric: 'tabular-nums',
        }}>
          {Math.round(pct * 100)}<span style={{ fontSize: size * 0.13, color: 'var(--ink-3)' }}>%</span>
        </div>
      </div>
      {label && <div style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</div>}
      {caption && <div className="small muted" style={{ textAlign: 'center' }}>{caption}</div>}
    </div>
  )
}
