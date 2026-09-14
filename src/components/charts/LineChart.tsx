import { useState } from 'react'
import { areaPath, axisLeft, linePath, linearScale, niceDomain, ticks, useMeasure } from './chart-utils'

export interface LineSeries {
  key: string
  label: string
  color: string
  values: (number | null)[]
  /** tratteggiata: usata per medie mobili e linee di riferimento */
  dashed?: boolean
  area?: boolean
  showDots?: boolean
}

interface Props {
  labels: string[]
  series: LineSeries[]
  height?: number
  format?: (n: number) => string
  yFormat?: (n: number) => string
  zeroBased?: boolean
  /** forza tick interi: evita "1,5 task" sugli assi di conteggi */
  integer?: boolean
  reference?: { value: number; label: string }
  emptyHint?: string
}

const M = { top: 12, right: 14, bottom: 24 }

export function LineChart({
  labels, series, height = 210, format = n => String(Math.round(n)),
  yFormat, zeroBased = false, integer = false, reference, emptyHint = 'Nessun dato ancora',
}: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const all = series.flatMap(s => s.values).filter((v): v is number => v != null)
  if (reference) all.push(reference.value)
  const hasData = all.length > 0

  const innerH = height - M.top - M.bottom
  const minStep = integer ? 1 : 0

  const [lo, hi] = hasData
    ? niceDomain(zeroBased ? 0 : Math.min(...all), Math.max(...all), 4, minStep)
    : [0, 1]
  const yTicks = ticks(lo, hi, 4, minStep)
  const fmtY = yFormat ?? format
  const left = axisLeft(yTicks.map(fmtY))
  const innerW = Math.max(10, width - left - M.right)

  const y = linearScale([lo, hi], [M.top + innerH, M.top])
  const x = (i: number) => left + (labels.length <= 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW)

  // etichette X diradate quanto basta per non sovrapporsi
  const step = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(innerW / 62))))

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = labels.length <= 1 ? 0 : Math.round((px / innerW) * (labels.length - 1))
    setHover(Math.max(0, Math.min(labels.length - 1, i)))
  }

  const active = hover != null ? series.filter(s => s.values[hover] != null) : []

  return (
    <div className="viz" ref={ref}>
      {series.length > 1 && (
        <div className="legend" style={{ marginBottom: 8 }}>
          {series.map(s => (
            <span className="legend__item" key={s.key}>
              <span className="legend__swatch" style={{ ['--c' as string]: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map(s => s.label).join(', ')}>
          {/* griglia recessiva */}
          {hasData && yTicks.map(t => (
            <g key={t}>
              <line x1={left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
              <text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz__value">{fmtY(t)}</text>
            </g>
          ))}

          {reference && hasData && (
            <g>
              <line x1={left} x2={width - M.right} y1={y(reference.value)} y2={y(reference.value)}
                stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 4" />
              <text x={width - M.right} y={y(reference.value) - 6} textAnchor="end" className="viz__label"
                stroke="var(--surface-1)" strokeWidth={3} paintOrder="stroke">
                {reference.label}
              </text>
            </g>
          )}

          {/* etichette X */}
          {labels.map((l, i) => i % step === 0 && (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="viz__label">{l}</text>
          ))}

          {hasData && series.map(s => {
            const pts = s.values
              .map((v, i) => (v == null ? null : { x: x(i), y: y(v) }))
              .filter((p): p is { x: number; y: number } => p != null)
            if (!pts.length) return null
            return (
              <g key={s.key}>
                {s.area && pts.length > 1 && (
                  <path d={areaPath(pts, M.top + innerH)} fill={s.color} opacity={0.12} />
                )}
                <path
                  d={linePath(pts)} fill="none" stroke={s.color} strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '5 4' : undefined}
                />
                {(s.showDots ?? pts.length <= 14) && pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={4} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
                ))}
              </g>
            )
          })}

          {/* crosshair */}
          {hover != null && hasData && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH} stroke="var(--axis)" strokeWidth={1} />
              {series.map(s => {
                const v = s.values[hover]
                return v == null ? null : (
                  <circle key={s.key} cx={x(hover)} cy={y(v)} r={5.5}
                    fill={s.color} stroke="var(--surface-1)" strokeWidth={2} />
                )
              })}
            </g>
          )}

          <line x1={left} x2={width - M.right} y1={M.top + innerH} y2={M.top + innerH} stroke="var(--axis)" strokeWidth={1} />

          <rect
            x={left} y={M.top} width={innerW} height={innerH} fill="transparent"
            onMouseMove={onMove} onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}

      {!hasData && (
        <div className="empty" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
          <span className="small">{emptyHint}</span>
        </div>
      )}

      {hover != null && active.length > 0 && (
        <div
          className="viz__tip"
          style={{ left: Math.max(60, Math.min(width - 60, x(hover))), top: M.top + 6 }}
        >
          <div className="muted small" style={{ marginBottom: 2 }}>{labels[hover]}</div>
          {active.map(s => (
            <div className="viz__tip-row" key={s.key}>
              <span className="viz__tip-dot" style={{ background: s.color }} />
              <span className="dim">{s.label}</span>
              <b style={{ marginLeft: 'auto' }}>{format(s.values[hover]!)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
