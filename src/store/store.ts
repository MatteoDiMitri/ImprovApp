import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../lib/id'
import { addDays, today, weekStart, weekDays, type ISODate } from '../lib/date'
import type {
  AppData, Course, DietLog, DietPlan, DayPlan, ExerciseDef, Lecture,
  SplitDay, StudyGoals, StudyLog, Task, WeekPlan, WorkoutLog,
} from './types'

export const DATA_VERSION = 1

export const emptyData = (): AppData => ({
  version: DATA_VERSION,
  profile: { name: '', startDate: today() },
  settings: { kcalTarget: 2200, workoutsPerWeekTarget: 4, tasksPerWeekTarget: 10 },
  dietPlans: [],
  dietLogs: {},
  weights: [],
  splitDays: [],
  workoutLogs: [],
  courses: [],
  lectures: [],
  studyLogs: [],
  studyGoals: { dailyMinutes: 120, weeklyMinutes: 720 },
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

  /* dieta */
  saveDietPlan: (plan: DietPlan) => void
  removeDietPlan: (id: string) => void
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
  addStudyLog: (log: StudyLog) => void
  removeStudyLog: (id: string) => void
  setStudyGoals: (g: Partial<StudyGoals>) => void

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

export const useStore = create<Store>()(
  persist(
    (set) => ({
      data: emptyData(),

      replaceAll: (data) => set({ data }),
      reset: () => set({ data: emptyData() }),
      patchProfile: (p) => set(patchData(d => ({ profile: { ...d.profile, ...p } }))),
      patchSettings: (p) => set(patchData(d => ({ settings: { ...d.settings, ...p } }))),

      /* ------------------------------ dieta ----------------------------- */
      saveDietPlan: (plan) => set(patchData(d => ({ dietPlans: upsert(d.dietPlans, plan) }))),
      removeDietPlan: (id) => set(patchData(d => ({
        dietPlans: d.dietPlans.filter(p => p.id !== id),
        // sgancia il piano dai giorni che lo usavano
        weekPlans: Object.fromEntries(Object.entries(d.weekPlans).map(([w, wp]) => [w, {
          ...wp,
          days: Object.fromEntries(Object.entries(wp.days).map(([day, dp]) =>
            [day, dp.dietPlanId === id ? { ...dp, dietPlanId: undefined } : dp])),
        }])),
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
      addStudyLog: (log) => set(patchData(d => ({
        studyLogs: [...d.studyLogs, log].sort((a, b) => a.date.localeCompare(b.date)),
      }))),
      removeStudyLog: (id) => set(patchData(d => ({ studyLogs: d.studyLogs.filter(l => l.id !== id) }))),
      setStudyGoals: (g) => set(patchData(d => ({ studyGoals: { ...d.studyGoals, ...g } }))),

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
            dietPlanId: p.dietPlanId,
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
    },
  ),
)

/** Il piano di un giorno, sempre definito (anche se la settimana non esiste ancora). */
export function useDayPlan(date: ISODate): DayPlan {
  return useStore(s => s.data.weekPlans[weekStart(date)]?.days[date]) ?? emptyDayPlan()
}
