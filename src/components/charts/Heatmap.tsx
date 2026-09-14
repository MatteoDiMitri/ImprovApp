import { useState } from 'react'
import { addDays, DAY_NAMES, monthShort, weekStart, type ISODate } from '../../lib/date'
import { SEQ_RAMP } from './chart-utils'

interface Props {
  /** Valore per data (XP del giorno, minuti, …). */
  values: Record<ISODate, number>
  weeks?: number
  endDate: ISODate
  format?: (n: number) => string
  title?: string
}

/**
 * Calendario a intensità: codifica una magnitudine, quindi rampa a una sola
 * tinta (blu) dal quasi-zero al massimo. Mai arcobaleno.
 */
export function Heatmap({ values, weeks = 18, endDate, format = n => String(Math.round(n)), title }: Props) {
  const [hover, setHover] = useState<{ date: ISODate; v: number; x: number; y: number } | null>(null)

  const cell = 13, gap = 3
  const lastMonday = weekStart(endDate)
  const columns: ISODate[] = Array.from({ length: weeks }, (_, i) => addDays(lastMonday, -7 * (weeks - 1 - i)))

  // Soglie sui quartili dei giorni attivi: con un solo giorno fuori scala
  // il resto del calendario non si appiattisce su una tinta sola.
  const active = Object.values(values).filter(v => v > 0).sort((a, b) => a - b)
  const q = (p: number) => active.length ? active[Math.min(active.length - 1, Math.floor(active.length * p))] : 1
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)]
  const level = (v: number) => (v <= 0 ? 0 : v >= q3 ? 4 : v >= q2 ? 3 : v >= q1 ? 2 : 1)

  const w = columns.length * (cell + gap)
  const h = 7 * (cell + gap) + 16

  return (
    <div className="viz">
      <div style={{ overflowX: 'auto' }}>
        <svg width={Math.max(w + 26, 200)} height={h + 6} role="img" aria-label={title ?? 'Calendario attività'}>
          {[0, 2, 4].map(i => (
            <text key={i} x={0} y={16 + i * (cell + gap) + cell * 0.8} className="viz__label">{DAY_NAMES[i]}</text>
          ))}
          {columns.map((monday, ci) => {
            const x = 26 + ci * (cell + gap)
            const showMonth = ci === 0 || monthShort(monday) !== monthShort(columns[ci - 1])
            return (
              <g key={monday}>
                {showMonth && <text x={x} y={8} className="viz__label">{monthShort(monday)}</text>}
                {Array.from({ length: 7 }, (_, r) => {
                  const date = addDays(monday, r)
                  if (date > endDate) return null
                  const v = values[date] ?? 0
                  const y = 16 + r * (cell + gap)
                  return (
                    <rect
                      key={date} x={x} y={y} width={cell} height={cell} rx={3}
                      fill={SEQ_RAMP[level(v)]}
                      stroke={hover?.date === date ? 'var(--ink)' : 'transparent'} strokeWidth={1.5}
                      onMouseEnter={() => setHover({ date, v, x: x + cell / 2, y })}
                      onMouseLeave={() => setHover(null)}
                    />
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="row row--tight" style={{ marginTop: 6, justifyContent: 'flex-end' }}>
        <span className="small muted">meno</span>
        {SEQ_RAMP.map((c, i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: 3, background: c, display: 'inline-block' }} />
        ))}
        <span className="small muted">più</span>
      </div>

      {hover && (
        <div className="viz__tip" style={{ left: hover.x, top: hover.y }}>
          <b>{format(hover.v)}</b> <span className="muted">· {hover.date.split('-').reverse().slice(0, 2).join('/')}</span>
        </div>
      )}
    </div>
  )
}
