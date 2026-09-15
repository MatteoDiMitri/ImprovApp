import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { uid } from '../lib/id'
import { addDays, today, weekStart, weekDays, type ISODate } from '../lib/date'
import { safeStorage } from '../lib/storage'
import type {
  AppData, Course, DietDay, DietLog, DayPlan, ExerciseDef, Lecture, Meal,
  PomodoroConfig, SplitDay, StudyGoals, StudyLog, Task, WeekPlan, WorkoutLog,
} from './types'
import { emptyDietDay } from './types'

export const DATA_VERSION = 2

export const defaultPomodoro = (): PomodoroConfig => ({ focusMin: 50, breakMin: 10 })

export const emptyData = (): AppData => ({
  version: DATA_VERSION,
  profile: { name: '', startDate: today() },
  settings: { kcalTarget: 2200, workoutsPerWeekTarget: 4, tasksPerWeekTarget: 10 },
  dietWeek: { 1: emptyDietDay(), 2: emptyDietDay(), 3: emptyDietDay(), 4: emptyDietDay(), 5: emptyDietDay(), 6: emptyDietDay(), 7: emptyDietDay() },
  dietLogs: {},
  weights: [],
  splitDays: [],
  workoutLogs: [],
  courses: [],
  lectures: [],
  studyLogs: [],
  studyGoals: { dailyMinutes: 120, weeklyMinutes: 720 },
  pomodoro: defaultPomodoro(),
  pomodoroRound: 0,
  tasks: [],
  weekPlans: {},
})

export const emptyDayPlan = (): DayPlan => ({ studyBlocks: [] })

function ensureWeekPlan(plans: Record<ISODate, WeekPlan>, monday: ISODate): WeekPlan {
  const existing = plans[monday]
  if (existing) return existing
  const days: Record<ISODate, DayPlan> = {}
  for (const d of weekDays(monday)) days[d] = emptyDayPlan()
  return { weekStart: monday, days }
}

interface Store {
  data: AppData

  /* generici */
  replaceAll: (data: AppData) => void
  reset: () => void
  patchProfile: (p: Partial<AppData['profile']>) => void
  patchSettings: (p: Partial<AppData['settings']>) => void

  /* dieta settimanale */
  setDietMeals: (weekday: number, meals: Meal[]) => void
  setDietNote: (weekday: number, note: string) => void
  copyDietDay: (from: number, to: number[]) => void
  clearDietDay: (weekday: number) => void
  setDietLog: (date: ISODate, patch: Partial<DietLog>) => void
  setWeight: (date: ISODate, kg: number) => void
  removeWeight: (date: ISODate) => void

  /* workout */
  saveSplitDay: (day: SplitDay) => void
  removeSplitDay: (id: string) => void
  setExerciseWeight: (splitDayId: string, exerciseId: string, weight: number) => void
  saveWorkoutLog: (log: WorkoutLog) => void
  removeWorkoutLog: (id: string) => void

  /* studio */
  saveCourse: (c: Course) => void
  removeCourse: (id: string) => void
  saveLecture: (l: Lecture) => void
  removeLecture: (id: string) => void
  removeStudyLog: (id: string) => void
  setStudyGoals: (g: Partial<StudyGoals>) => void

  /* pomodoro */
  setPomodoroConfig: (c: Partial<PomodoroConfig>) => void
  startFocus: (opts: { courseId?: string; topic?: string }) => void
  startBreak: () => void
  /** chiude la sessione di focus registrando i minuti realmente trascorsi */
  finishFocus: (minutes: number, completed: boolean) => void
  endSession: () => void

  /* routine */
  saveTask: (t: Task) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  clearDoneTasks: () => void

  /* pianificazione settimanale */
  setDayPlan: (date: ISODate, patch: Partial<DayPlan>) => void
  setWeekNote: (monday: ISODate, note: string) => void
  markWeekPlanned: (monday: ISODate) => void
  copyWeek: (from: ISODate, to: ISODate) => void
  clearWeek: (monday: ISODate) => void
}

const patchData = (fn: (d: AppData) => Partial<AppData>) =>
  (state: Store): Partial<Store> => ({ data: { ...state.data, ...fn(state.data) } })

/** Inserisce o aggiorna per id, preservando l'ordine. */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex(x => x.id === item.id)
  if (i === -1) return [...list, item]
  const next = list.slice()
  next[i] = item
  return next
}

const dietDay = (d: AppData, weekday: number): DietDay => d.dietWeek[weekday] ?? emptyDietDay()

export const useStore = create<Store>()(
  persist(
    (set) => ({
      data: emptyData(),

      replaceAll: (data) => set({ data: { ...emptyData(), ...data, version: DATA_VERSION } }),
      reset: () => set({ data: emptyData() }),
      patchProfile: (p) => set(patchData(d => ({ profile: { ...d.profile, ...p } }))),
      patchSettings: (p) => set(patchData(d => ({ settings: { ...d.settings, ...p } }))),

      /* --------------------------- dieta settimanale -------------------- */
      setDietMeals: (weekday, meals) => set(patchData(d => ({
        dietWeek: { ...d.dietWeek, [weekday]: { ...dietDay(d, weekday), meals } },
      }))),
      setDietNote: (weekday, note) => set(patchData(d => ({
        dietWeek: { ...d.dietWeek, [weekday]: { ...dietDay(d, weekday), note } },
      }))),
      copyDietDay: (from, to) => set(patchData(d => {
        const src = dietDay(d, from)
        const next = { ...d.dietWeek }
        for (const wd of to) {
          next[wd] = {
            note: src.note,
            // id nuovi: i pasti copiati devono poter essere modificati in autonomia
            meals: src.meals.map(m => ({
              ...m, id: uid('m'), items: m.items.map(i => ({ ...i, id: uid('f') })),
            })),
          }
        }
        return { dietWeek: next }
      })),
      clearDietDay: (weekday) => set(patchData(d => ({
        dietWeek: { ...d.dietWeek, [weekday]: emptyDietDay() },
      }))),
      setDietLog: (date, patch) => set(patchData(d => ({
        dietLogs: { ...d.dietLogs, [date]: { ...d.dietLogs[date], ...patch, date } },
      }))),
      setWeight: (date, kg) => set(patchData(d => ({
        weights: [...d.weights.filter(w => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date)),
      }))),
      removeWeight: (date) => set(patchData(d => ({ weights: d.weights.filter(w => w.date !== date) }))),

      /* ----------------------------- workout ---------------------------- */
      saveSplitDay: (day) => set(patchData(d => ({ splitDays: upsert(d.splitDays, day) }))),
      removeSplitDay: (id) => set(patchData(d => ({
        splitDays: d.splitDays.filter(s => s.id !== id),
        weekPlans: Object.fromEntries(Object.entries(d.weekPlans).map(([w, wp]) => [w, {
          ...wp,
          days: Object.fromEntries(Object.entries(wp.days).map(([day, dp]) =>
            [day, dp.workoutDayId === id ? { ...dp, workoutDayId: undefined } : dp])),
        }])),
      }))),
      setExerciseWeight: (splitDayId, exerciseId, weight) => set(patchData(d => ({
        splitDays: d.splitDays.map(s => s.id !== splitDayId ? s : {
          ...s,
          exercises: s.exercises.map((e: ExerciseDef) => e.id === exerciseId ? { ...e, weight } : e),
        }),
      }))),
      saveWorkoutLog: (log) => set(patchData(d => ({
        workoutLogs: upsert(d.workoutLogs, log).sort((a, b) => a.date.localeCompare(b.date)),
      }))),
      removeWorkoutLog: (id) => set(patchData(d => ({ workoutLogs: d.workoutLogs.filter(l => l.id !== id) }))),

      /* ------------------------------ studio ---------------------------- */
      saveCourse: (c) => set(patchData(d => ({ courses: upsert(d.courses, c) }))),
      removeCourse: (id) => set(patchData(d => ({
        courses: d.courses.filter(c => c.id !== id),
        lectures: d.lectures.filter(l => l.courseId !== id),
      }))),
      saveLecture: (l) => set(patchData(d => ({ lectures: upsert(d.lectures, l) }))),
      removeLecture: (id) => set(patchData(d => ({ lectures: d.lectures.filter(l => l.id !== id) }))),
      removeStudyLog: (id) => set(patchData(d => ({ studyLogs: d.studyLogs.filter(l => l.id !== id) }))),
      setStudyGoals: (g) => set(patchData(d => ({ studyGoals: { ...d.studyGoals, ...g } }))),

      /* ----------------------------- pomodoro --------------------------- */
      setPomodoroConfig: (c) => set(patchData(d => ({ pomodoro: { ...d.pomodoro, ...c } }))),

      startFocus: ({ courseId, topic }) => set(patchData(d => {
        const now = Date.now()
        return {
          pomodoroSession: {
            phase: 'focus',
            startedAt: now,
            endsAt: now + d.pomodoro.focusMin * 60_000,
            courseId,
            topic,
          },
        }
      })),

      startBreak: () => set(patchData(d => {
        const now = Date.now()
        return {
          pomodoroSession: { phase: 'pausa', startedAt: now, endsAt: now + d.pomodoro.breakMin * 60_000 },
        }
      })),

      finishFocus: (minutes, completed) => set(patchData(d => {
        const s = d.pomodoroSession
        const rounded = Math.round(minutes)
        // sotto il minuto non si registra niente: eviterebbe solo di sporcare lo storico
        const logs: StudyLog[] = rounded >= 1 && s
          ? [...d.studyLogs, {
              id: uid('sl'),
              date: today(),
              courseId: s.courseId,
              topic: s.topic,
              minutes: rounded,
              pomodoros: completed ? 1 : 0,
              source: 'pomodoro' as const,
            }].sort((a, b) => a.date.localeCompare(b.date))
          : d.studyLogs
        return {
          studyLogs: logs,
          pomodoroRound: completed ? d.pomodoroRound + 1 : d.pomodoroRound,
          pomodoroSession: undefined,
        }
      })),

      endSession: () => set(patchData(() => ({ pomodoroSession: undefined }))),

      /* ----------------------------- routine ---------------------------- */
      saveTask: (t) => set(patchData(d => ({ tasks: upsert(d.tasks, t) }))),
      toggleTask: (id) => set(patchData(d => {
        const target = d.tasks.find(t => t.id === id)
        const tasks = d.tasks.map(t => t.id !== id ? t
          : { ...t, done: !t.done, doneAt: !t.done ? today() : undefined })
        // completando una ricorrente si genera subito l'occorrenza successiva
        if (target && !target.done && target.repeat !== 'mai' && target.date) {
          const next = addDays(target.date, target.repeat === 'giornaliera' ? 1 : 7)
          const already = tasks.some(t => t.title === target.title && t.date === next && !t.done)
          if (!already) {
            tasks.push({ ...target, id: uid('t'), date: next, done: false, doneAt: undefined, createdAt: new Date().toISOString() })
          }
        }
        return { tasks }
      })),
      removeTask: (id) => set(patchData(d => ({ tasks: d.tasks.filter(t => t.id !== id) }))),
      clearDoneTasks: () => set(patchData(d => ({ tasks: d.tasks.filter(t => !t.done) }))),

      /* --------------------------- settimana ---------------------------- */
      setDayPlan: (date, patch) => set(patchData(d => {
        const monday = weekStart(date)
        const wp = ensureWeekPlan(d.weekPlans, monday)
        return {
          weekPlans: {
            ...d.weekPlans,
            [monday]: { ...wp, days: { ...wp.days, [date]: { ...emptyDayPlan(), ...wp.days[date], ...patch } } },
          },
        }
      })),
      setWeekNote: (monday, note) => set(patchData(d => ({
        weekPlans: { ...d.weekPlans, [monday]: { ...ensureWeekPlan(d.weekPlans, monday), note } },
      }))),
      markWeekPlanned: (monday) => set(patchData(d => ({
        weekPlans: { ...d.weekPlans, [monday]: { ...ensureWeekPlan(d.weekPlans, monday), plannedAt: new Date().toISOString() } },
      }))),
      copyWeek: (from, to) => set(patchData(d => {
        const src = d.weekPlans[from]
        if (!src) return {}
        const srcDays = weekDays(from)
        const dstDays = weekDays(to)
        const days: Record<ISODate, DayPlan> = {}
        srcDays.forEach((s, i) => {
          const p = src.days[s] ?? emptyDayPlan()
          days[dstDays[i]] = {
            workoutDayId: p.workoutDayId,
            studyTargetMin: p.studyTargetMin,
            studyBlocks: p.studyBlocks.map(b => ({ ...b, id: uid('sb') })),
            workoutDone: false,
          }
        })
        return { weekPlans: { ...d.weekPlans, [to]: { weekStart: to, days, note: src.note } } }
      })),
      clearWeek: (monday) => set(patchData(d => {
        const days: Record<ISODate, DayPlan> = {}
        for (const day of weekDays(monday)) days[day] = emptyDayPlan()
        return { weekPlans: { ...d.weekPlans, [monday]: { weekStart: monday, days } } }
      })),
    }),
    {
      name: 'improvapp:v1',
      version: DATA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      migrate: migrateData,
      // i campi nuovi non esistono nei salvataggi vecchi: si riempiono dai default
      merge: (persisted, current) => {
        const p = persisted as { data?: Partial<AppData> } | undefined
        return { ...current, data: { ...emptyData(), ...(p?.data ?? {}) } }
      },
    },
  ),
)

/* ------------------------------- migrazioni ------------------------------- */

/** Forma dei dati salvati dalla versione 1: serve solo a recuperarne il contenuto. */
interface LegacyV1 {
  data?: {
    dietPlans?: { id: string; name: string; meals: Meal[] }[]
    weekPlans?: Record<string, { days?: Record<string, { dietPlanId?: string }> }>
    [k: string]: unknown
  }
}

/**
 * v1 → v2: la dieta era una libreria di piani assegnati giorno per giorno,
 * ora è una settimana ricorrente. Ricostruiamo i sette giorni dall'ultima
 * pianificazione fatta, così chi aveva già inserito la sua dieta non la perde.
 */
function migrateData(persisted: unknown, version: number): unknown {
  if (version >= DATA_VERSION) return persisted
  const legacy = persisted as LegacyV1
  const d = legacy?.data
  if (!d) return persisted

  const plans = d.dietPlans ?? []
  const dietWeek: Record<number, DietDay> = {}
  for (let wd = 1; wd <= 7; wd++) dietWeek[wd] = emptyDietDay()

  const mondays = Object.keys(d.weekPlans ?? {}).sort()
  for (const monday of mondays) {              // dal più vecchio al più recente: vince l'ultimo
    const days = d.weekPlans?.[monday]?.days ?? {}
    Object.entries(days).forEach(([date, day]) => {
      if (!day?.dietPlanId) return
      const plan = plans.find(p => p.id === day.dietPlanId)
      if (!plan) return
      const js = new Date(date).getDay()
      const wd = js === 0 ? 7 : js
      dietWeek[wd] = { meals: plan.meals, note: plan.name }
    })
  }

  // se non c'era nessuna assegnazione ma esisteva un solo piano, vale per tutti i giorni
  const nothingAssigned = Object.values(dietWeek).every(x => x.meals.length === 0)
  if (nothingAssigned && plans.length === 1) {
    for (let wd = 1; wd <= 7; wd++) dietWeek[wd] = { meals: plans[0].meals, note: plans[0].name }
  }

  const { dietPlans: _drop, ...rest } = d
  return { ...legacy, data: { ...rest, dietWeek, pomodoro: defaultPomodoro(), pomodoroRound: 0, version: DATA_VERSION } }
}

/** Porta un export JSON (anche della versione 1) alla forma corrente. */
export function migrateExport(parsed: AppData & { dietPlans?: unknown[] }): AppData {
  if ('dietWeek' in parsed && parsed.dietWeek) return { ...parsed, version: DATA_VERSION }
  const wrapped = migrateData({ data: parsed }, 1) as { data: AppData }
  return { ...emptyData(), ...wrapped.data, version: DATA_VERSION }
}

/** Il piano di un giorno, sempre definito (anche se la settimana non esiste ancora). */
export function useDayPlan(date: ISODate): DayPlan {
  return useStore(s => s.data.weekPlans[weekStart(date)]?.days[date]) ?? emptyDayPlan()
}
