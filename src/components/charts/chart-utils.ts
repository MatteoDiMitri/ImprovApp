import { useEffect, useRef, useState } from 'react'

/** Larghezza reale del contenitore: i grafici si ridisegnano, non si deformano. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0
      setWidth(Math.round(w))
    })
    ro.observe(el)
    setWidth(Math.round(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  return { ref, width }
}

export interface Scale {
  (v: number): number
  domain: [number, number]
  range: [number, number]
}

export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  const fn = ((v: number) => r0 + ((v - d0) / span) * (r1 - r0)) as Scale
  fn.domain = domain
  fn.range = range
  return fn
}

/** Estremi "belli": tick arrotondati invece che 0 → 1873,4. */
export function niceDomain(min: number, max: number, count = 4, minStep = 0): [number, number] {
  if (!isFinite(min) || !isFinite(max)) return [0, 1]
  if (min === max) return min === 0 ? [0, 1] : [min - Math.abs(min) * 0.1, max + Math.abs(max) * 0.1]
  const step = Math.max(minStep, niceStep((max - min) / count))
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step]
}

export function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)))
  const norm = raw / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  return step * mag
}

export function ticks(min: number, max: number, count = 4, minStep = 0): number[] {
  if (min === max) return [min]
  const step = Math.max(minStep, niceStep((max - min) / count))
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) {
    out.push(Math.abs(v) < step * 1e-6 ? 0 : Number(v.toFixed(6)))
  }
  return out
}

/** Polilinea semplice: niente curve, i dati non vengono "inventati" fra i punti. */
export function linePath(points: { x: number; y: number }[]): string {
  if (!points.length) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

export function areaPath(points: { x: number; y: number }[], baseline: number): string {
  if (points.length < 2) return ''
  const first = points[0], last = points[points.length - 1]
  return `${linePath(points)} L${last.x.toFixed(2)},${baseline.toFixed(2)} L${first.x.toFixed(2)},${baseline.toFixed(2)} Z`
}

/** Rettangolo con i due angoli superiori arrotondati (4px), ancorato alla base. */
export function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  if (h <= 0) return ''
  return [
    `M${x},${y + h}`,
    `L${x},${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `L${x + w - rr},${y}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `L${x + w},${y + h}`,
    'Z',
  ].join(' ')
}

export const CHART_COLORS = {
  dieta: 'var(--s-dieta)',
  workout: 'var(--s-workout)',
  studio: 'var(--s-studio)',
  routine: 'var(--s-routine)',
} as const

export const SEQ_RAMP = ['var(--seq-0)', 'var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)']

/** Margine sinistro calcolato sulle etichette reali: nessun tick tagliato. */
export function axisLeft(labels: string[], min = 38): number {
  const longest = labels.reduce((a, b) => (b.length > a.length ? b : a), '')
  return Math.max(min, Math.round(longest.length * 6.4) + 14)
}

/** 2.300 → "2,3k": tiene corti i tick sull'asse senza perdere l'ordine di grandezza. */
export function compact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 10000) return `${Math.round(n / 1000)}k`
  if (abs >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k`
  return String(Math.round(n))
}
