import {
  addDays, daysBetween, today, weekDays, weekStart, type ISODate,
} from '../lib/date'
import { avg, clamp, sum } from '../lib/format'
import { ADHERENCE, type AppData, type DietPlan, type SectionId } from './types'

/* ============================== XP & LIVELLO ============================== */

export const XP = {
  dietaPerfetto: 30,
  pesoLoggato: 5,
  workoutBase: 45,
  workoutPerKcal: 1 / 25,
  studioPerMinuto: 1 / 4,
  studioObiettivo: 20,
  taskBassa: 4,
  taskMedia: 6,
  taskAlta: 10,
}

/** XP totali richiesti per raggiungere un livello (curva quadratica dolce). */
export function xpForLevel(level: number): number {
  const l = Math.max(0, level - 1)
  return 150 * l + 25 * l * l
}

export function levelFromXp(xp: number): number {
  const l = (-150 + Math.sqrt(150 * 150 + 100 * Math.max(0, xp))) / 50
  return Math.floor(l) + 1
}

export interface LevelInfo {
  level: number
  xp: number
  intoLevel: number
  levelSpan: number
  progress: number   // 0..1
  toNext: number
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const span = next - base
  const into = xp - base
  return { level, xp, intoLevel: into, levelSpan: span, progress: clamp(into / span, 0, 1), toNext: next - xp }
}

/* ============================== XP PER GIORNO ============================= */

export type XpBySection = Record<SectionId, number>

export function xpForDay(d: AppData, date: ISODate): XpBySection {
  const out: XpBySection = { dieta: 0, workout: 0, studio: 0, routine: 0 }

  const log = d.dietLogs[date]
  if (log?.adherence) out.dieta += Math.round(ADHERENCE[log.adherence].score * XP.dietaPerfetto)
  if (d.weights.some(w => w.date === date)) out.dieta += XP.pesoLoggato

  for (const w of d.workoutLogs) {
    if (w.date === date) out.workout += XP.workoutBase + Math.round(w.kcal * XP.workoutPerKcal)
  }

  const minutes = sum(d.studyLogs.filter(l => l.date === date).map(l => l.minutes))
  if (minutes > 0) {
    out.studio += Math.round(minutes * XP.studioPerMinuto)
    if (minutes >= d.studyGoals.dailyMinutes) out.studio += XP.studioObiettivo
  }

  for (const t of d.tasks) {
    if (t.done && t.doneAt === date) {
      out.routine += t.priority === 'alta' ? XP.taskAlta : t.priority === 'media' ? XP.taskMedia : XP.taskBassa
    }
  }

  return out
}

export function totalXpForDay(d: AppData, date: ISODate): number {
  const x = xpForDay(d, date)
  return x.dieta + x.workout + x.studio + x.routine
}

/** Tutti i giorni in cui esiste almeno un dato, in ordine. */
export function activeDates(d: AppData): ISODate[] {
  const set = new Set<ISODate>()
  Object.keys(d.dietLogs).forEach(k => set.add(k))
  d.weights.forEach(w => set.add(w.date))
  d.workoutLogs.forEach(w => set.add(w.date))
  d.studyLogs.forEach(l => set.add(l.date))
  d.tasks.forEach(t => { if (t.doneAt) set.add(t.doneAt) })
  return [...set].sort()
}

export function totalXp(d: AppData): XpBySection & { total: number } {
  const acc: XpBySection = { dieta: 0, workout: 0, studio: 0, routine: 0 }
  for (const date of activeDates(d)) {
    const x = xpForDay(d, date)
    acc.dieta += x.dieta; acc.workout += x.workout; acc.studio += x.studio; acc.routine += x.routine
  }
  return { ...acc, total: acc.dieta + acc.workout + acc.studio + acc.routine }
}

/* ================================ STREAK ================================= */

function hasActivity(d: AppData, date: ISODate, section: SectionId | 'any'): boolean {
  const x = xpForDay(d, date)
  if (section === 'any') return x.dieta + x.workout + x.studio + x.routine > 0
  return x[section] > 0
}

/**
 * Giorni consecutivi con attività. Oggi non ancora "riempito" non spezza la
 * striscia: si parte da ieri, così la streak non lampeggia a mezzanotte.
 */
export function streak(d: AppData, section: SectionId | 'any' = 'any'): number {
  const now = today()
  let cursor = hasActivity(d, now, section) ? now : addDays(now, -1)
  let n = 0
  while (hasActivity(d, cursor, section) && n < 730) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

export function bestStreak(d: AppData, section: SectionId | 'any' = 'any'): number {
  const dates = activeDates(d).filter(date => hasActivity(d, date, section))
  let best = 0, run = 0
  let prev: ISODate | null = null
  for (const date of dates) {
    run = prev && daysBetween(prev, date) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = date
  }
  return best
}

/* ================================= DIETA ================================= */

export function planKcal(plan: DietPlan | undefined): number {
  if (!plan) return 0
  return sum(plan.meals.flatMap(m => m.items.map(i => i.kcal)))
}

export function dietPlanById(d: AppData, id?: string): DietPlan | undefined {
  return id ? d.dietPlans.find(p => p.id === id) : undefined
}

/** Kcal previste per un giorno: consuntivo se c'è, altrimenti il piano assegnato. */
export function kcalForDay(d: AppData, date: ISODate): number | null {
  const log = d.dietLogs[date]
  if (log?.kcalActual != null) return log.kcalActual
  const planId = d.weekPlans[weekStart(date)]?.days[date]?.dietPlanId
  const plan = dietPlanById(d, planId)
  return plan ? planKcal(plan) : null
}

/** Percentuale di aderenza media su un intervallo di giorni. */
export function adherenceScore(d: AppData, dates: ISODate[]): number | null {
  const scores = dates.map(x => d.dietLogs[x]?.adherence).filter(Boolean)
    .map(a => ADHERENCE[a!].score)
  return scores.length ? avg(scores) * 100 : null
}

/** Media mobile del peso: smorza il rumore giornaliero (acqua, sale, ora della pesata). */
export function weightTrend(d: AppData, window = 7): { date: ISODate; kg: number; trend: number }[] {
  const ws = [...d.weights].sort((a, b) => a.date.localeCompare(b.date))
  return ws.map((w, i) => {
    const slice = ws.slice(Math.max(0, i - window + 1), i + 1)
    return { date: w.date, kg: w.kg, trend: avg(slice.map(s => s.kg)) }
  })
}

/* ================================ WORKOUT ================================ */

/** Storico dei carichi per un esercizio, per nome (sopravvive ai rinomini dello split). */
export function exerciseHistory(d: AppData, name: string): { date: ISODate; weight: number; volume: number }[] {
  const out: { date: ISODate; weight: number; volume: number }[] = []
  for (const log of d.workoutLogs) {
    for (const e of log.entries) {
      if (e.name.toLowerCase() !== name.toLowerCase()) continue
      const reps = parseInt(e.reps, 10) || 0
      out.push({ date: log.date, weight: e.weight, volume: e.weight * e.sets * reps })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function allExerciseNames(d: AppData): string[] {
  const set = new Set<string>()
  d.splitDays.forEach(s => s.exercises.forEach(e => set.add(e.name)))
  d.workoutLogs.forEach(l => l.entries.forEach(e => set.add(e.name)))
  return [...set].sort((a, b) => a.localeCompare(b))
}

/* ================================ STUDIO ================================= */

export function studyMinutes(d: AppData, dates: ISODate[]): number {
  const set = new Set(dates)
  return sum(d.studyLogs.filter(l => set.has(l.date)).map(l => l.minutes))
}

export function studyMinutesByCourse(d: AppData, dates: ISODate[]): { id: string; name: string; minutes: number }[] {
  const set = new Set(dates)
  const acc = new Map<string, number>()
  for (const l of d.studyLogs) {
    if (!set.has(l.date)) continue
    const key = l.courseId ?? '—'
    acc.set(key, (acc.get(key) ?? 0) + l.minutes)
  }
  return [...acc.entries()]
    .map(([id, minutes]) => ({ id, name: d.courses.find(c => c.id === id)?.name ?? 'Senza corso', minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

/* =========================== AVANZAMENTO SETTIMANA ======================== */

export interface SectionProgress {
  id: SectionId
  done: number
  target: number
  progress: number   // 0..1
  detail: string
}

/**
 * Quanto è "completata" la settimana, sezione per sezione.
 * I target vengono dal piano compilato la domenica; se manca, si usano
 * i target generali delle impostazioni, così la barra non resta mai vuota.
 */
export function weekProgress(d: AppData, monday: ISODate): SectionProgress[] {
  const days = weekDays(monday)
  const now = today()
  const elapsed = days.filter(x => x <= now)
  const plan = d.weekPlans[monday]

  // dieta: giorni con piano assegnato (o giorni trascorsi) valutati
  const dietTarget = days.filter(x => plan?.days[x]?.dietPlanId).length || elapsed.length || 7
  const dietDone = sum(days.map(x => {
    const a = d.dietLogs[x]?.adherence
    return a ? ADHERENCE[a].score : 0
  }))

  // workout: sessioni pianificate (escluso riposo) o target settimanale
  const plannedWorkouts = days.filter(x => {
    const id = plan?.days[x]?.workoutDayId
    return id && id !== 'riposo'
  }).length
  const workoutTarget = plannedWorkouts || d.settings.workoutsPerWeekTarget
  const workoutDone = d.workoutLogs.filter(l => days.includes(l.date)).length

  // studio: minuti pianificati o obiettivo settimanale
  const plannedMin = sum(days.map(x => d.weekPlans[monday]?.days[x]?.studyTargetMin ?? 0))
  const studyTarget = plannedMin || d.studyGoals.weeklyMinutes
  const studyDone = studyMinutes(d, days)

  // routine: task con scadenza nella settimana, o target generale
  const weekTasks = d.tasks.filter(t => t.date && days.includes(t.date))
  const taskTarget = weekTasks.length || d.settings.tasksPerWeekTarget
  const taskDone = weekTasks.length
    ? weekTasks.filter(t => t.done).length
    : d.tasks.filter(t => t.doneAt && days.includes(t.doneAt)).length

  const mk = (id: SectionId, done: number, target: number, detail: string): SectionProgress => ({
    id, done, target, progress: target > 0 ? clamp(done / target, 0, 1) : 0, detail,
  })

  return [
    mk('dieta', dietDone, dietTarget, `${dietDone.toFixed(1)} / ${dietTarget} giorni in linea`),
    mk('workout', workoutDone, workoutTarget, `${workoutDone} / ${workoutTarget} allenamenti`),
    mk('studio', studyDone, studyTarget, `${Math.round(studyDone / 60 * 10) / 10}h / ${Math.round(studyTarget / 60 * 10) / 10}h`),
    mk('routine', taskDone, taskTarget, `${taskDone} / ${taskTarget} task`),
  ]
}

export function weekScore(d: AppData, monday: ISODate): number {
  return avg(weekProgress(d, monday).map(p => p.progress)) * 100
}

/** Le ultime `n` settimane (lunedì) fino a quella corrente. */
export function recentWeeks(n: number, from: ISODate = today()): ISODate[] {
  const current = weekStart(from)
  return Array.from({ length: n }, (_, i) => addDays(current, -7 * (n - 1 - i)))
}

/** Gli ultimi `n` giorni fino a oggi compreso. */
export function recentDays(n: number, from: ISODate = today()): ISODate[] {
  return Array.from({ length: n }, (_, i) => addDays(from, -(n - 1 - i)))
}
