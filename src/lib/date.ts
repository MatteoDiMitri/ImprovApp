/** Utility di data: tutto ruota attorno a settimane lunedì → domenica. */

export type ISODate = string // "YYYY-MM-DD"

const pad = (n: number) => String(n).padStart(2, '0')

/** Data locale in formato ISO (niente toISOString: sposterebbe il giorno per via del fuso). */
export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): ISODate {
  return toISO(new Date())
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 1 = lunedì … 7 = domenica */
export function weekday(s: ISODate): number {
  const js = fromISO(s).getDay()
  return js === 0 ? 7 : js
}

/** Lunedì della settimana che contiene `s`. */
export function weekStart(s: ISODate): ISODate {
  return addDays(s, -(weekday(s) - 1))
}

export function weekDays(monday: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000)
}

export const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
export const DAY_NAMES_LONG = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
const MONTHS_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

export function dayNum(s: ISODate): number { return fromISO(s).getDate() }
export function monthShort(s: ISODate): string { return MONTHS_SHORT[fromISO(s).getMonth()] }

export function formatDay(s: ISODate): string {
  const d = fromISO(s)
  return `${DAY_NAMES_LONG[weekday(s) - 1]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function formatShort(s: ISODate): string {
  const d = fromISO(s)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function formatWeekRange(monday: ISODate): string {
  const end = addDays(monday, 6)
  const a = fromISO(monday), b = fromISO(end)
  const left = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]}`
  return `${left} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`
}

/** Numero di settimana ISO 8601: utile come "numero di livello" della settimana. */
export function isoWeekNumber(s: ISODate): number {
  const d = fromISO(s)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function relativeLabel(s: ISODate): string {
  const diff = daysBetween(today(), s)
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Domani'
  if (diff === -1) return 'Ieri'
  return formatShort(s)
}

/** "1h 25m" — durate sempre leggibili. */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** "08:30" + 90 → "10:00" */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`
}

export function minutesBetweenTimes(start: string, end: string): number {
  const [h1, m1] = start.split(':').map(Number)
  const [h2, m2] = end.split(':').map(Number)
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1))
}
