export const nf = new Intl.NumberFormat('it-IT')
export const nf1 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function kcal(n: number): string { return `${nf.format(Math.round(n))} kcal` }
export function kg(n: number): string { return `${nf1.format(n)} kg` }
export function pct(n: number): string { return `${Math.round(n)}%` }

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function sum(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) }

export function avg(xs: number[]): number { return xs.length ? sum(xs) / xs.length : 0 }
