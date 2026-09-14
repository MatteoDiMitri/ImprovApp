import { useState } from 'react'
import { axisLeft, barPath, linearScale, niceDomain, ticks, useMeasure } from './chart-utils'

export interface BarSeries {
  key: string
  label: string
  color: string
  values: number[]
}

interface Props {
  labels: string[]
  series: BarSeries[]
  /** impilate (composizione di un totale) invece che affiancate */
  stacked?: boolean
  height?: number
  /** forza tick interi: evita "1,5 task" sugli assi di conteggi */
  integer?: boolean
  format?: (n: number) => string
  yFormat?: (n: number) => string
  reference?: { value: number; label: string }
  emptyHint?: string
  highlightIndex?: number
}

const M = { top: 12, right: 14, bottom: 24 }
const GAP = 2 // stacco di superficie fra segmenti e fra barre adiacenti

export function BarChart({
  labels, series, stacked = false, height = 210, integer = false,
  format = n => String(Math.round(n)), yFormat, reference, emptyHint = 'Nessun dato ancora',
  highlightIndex,
}: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const totals = labels.map((_, i) =>
    stacked ? series.reduce((a, s) => a + (s.values[i] ?? 0), 0) : Math.max(...series.map(s => s.values[i] ?? 0)))
  const maxV = Math.max(0, ...totals, reference?.value ?? 0)
  const hasData = totals.some(t => t > 0)

  const innerH = height - M.top - M.bottom
  const minStep = integer ? 1 : 0
  const [, hi] = niceDomain(0, maxV || 1, 4, minStep)
  const yTicks = ticks(0, hi, 4, minStep)
  const fmtY = yFormat ?? format
  const left = axisLeft(yTicks.map(fmtY))
  const innerW = Math.max(10, width - left - M.right)
  const y = linearScale([0, hi], [M.top + innerH, M.top])
  const baseline = M.top + innerH

  const band = innerW / Math.max(1, labels.length)
  const bandPad = Math.min(10, band * 0.22)
  const groupW = Math.max(2, band - bandPad)
  const barW = stacked ? groupW : Math.max(2, (groupW - GAP * (series.length - 1)) / series.length)

  const step = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(innerW / 54))))

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
          {yTicks.map(t => (
            <g key={t}>
              <line x1={left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
              <text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz__value">{fmtY(t)}</text>
            </g>
          ))}

          {reference && (
            <g>
              <line x1={left} x2={width - M.right} y1={y(reference.value)} y2={y(reference.value)}
                stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 4" />
              <text x={width - M.right} y={y(reference.value) - 6} textAnchor="end" className="viz__label"
                stroke="var(--surface-1)" strokeWidth={3} paintOrder="stroke">{reference.label}</text>
            </g>
          )}

          {labels.map((label, i) => {
            const gx = left + i * band + bandPad / 2
            let stackTop = baseline
            return (
              <g key={i} opacity={hover == null || hover === i ? 1 : 0.55}>
                {highlightIndex === i && (
                  <rect x={left + i * band} y={M.top} width={band} height={innerH} rx={6}
                    fill="var(--surface-2)" opacity={0.55} />
                )}
                {series.map((s, si) => {
                  const v = s.values[i] ?? 0
                  if (v <= 0) return null
                  const h = baseline - y(v)
                  if (stacked) {
                    const top = stackTop - h
                    stackTop = top - GAP
                    return <path key={s.key} d={barPath(gx, top, barW, h)} fill={s.color} />
                  }
                  return (
                    <path key={s.key} d={barPath(gx + si * (barW + GAP), baseline - h, barW, h)} fill={s.color} />
                  )
                })}
                {i % step === 0 && (
                  <text x={left + i * band + band / 2} y={height - 6} textAnchor="middle" className="viz__label">{label}</text>
                )}
                <rect
                  x={left + i * band} y={M.top} width={band} height={innerH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                />
              </g>
            )
          })}

          <line x1={left} x2={width - M.right} y1={baseline} y2={baseline} stroke="var(--axis)" strokeWidth={1} />
        </svg>
      )}

      {!hasData && (
        <div className="empty" style={{ position: 'absolute', inset: 0, justifyContent: 'center' }}>
          <span className="small">{emptyHint}</span>
        </div>
      )}

      {hover != null && (
        <div
          className="viz__tip"
          style={{
            left: Math.max(64, Math.min(width - 64, left + hover * band + band / 2)),
            top: M.top + 6,
          }}
        >
          <div className="muted small" style={{ marginBottom: 2 }}>{labels[hover]}</div>
          {series.map(s => (
            <div className="viz__tip-row" key={s.key}>
              <span className="viz__tip-dot" style={{ background: s.color }} />
              <span className="dim">{s.label}</span>
              <b style={{ marginLeft: 'auto' }}>{format(s.values[hover] ?? 0)}</b>
            </div>
          ))}
          {stacked && series.length > 1 && (
            <div className="viz__tip-row" style={{ marginTop: 3, borderTop: '1px solid var(--line)', paddingTop: 3 }}>
              <span className="dim">Totale</span>
              <b style={{ marginLeft: 'auto' }}>{format(totals[hover])}</b>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
