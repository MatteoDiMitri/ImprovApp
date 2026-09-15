import type { ISODate } from '../lib/date'

export type SectionId = 'dieta' | 'workout' | 'studio' | 'routine'

/* ------------------------------- DIETA -------------------------------- */

export interface FoodItem {
  id: string
  name: string
  qty?: string      // "150 g", "2 uova"…
  kcal: number
}

export interface Meal {
  id: string
  name: string      // Colazione, Pranzo…
  time?: string     // "13:00"
  items: FoodItem[]
}

/**
 * La dieta settimanale: per ogni giorno della settimana (1 = lunedì … 7 = domenica)
 * i pasti previsti. È un modello ricorrente — la scrivi una volta e vale per tutte
 * le settimane, esattamente come l'orario delle lezioni.
 */
export interface DietDay {
  meals: Meal[]
  note?: string
}

export type DietWeek = Record<number, DietDay>

export const emptyDietDay = (): DietDay => ({ meals: [] })

/** Quanto bene ho seguito il piano in un dato giorno. */
export type Adherence = 'perfetto' | 'bene' | 'cosi-cosi' | 'saltato'

export interface DietLog {
  date: ISODate
  adherence?: Adherence
  kcalActual?: number    // consuntivo, se diverso dal piano
  note?: string
}

export interface WeightEntry {
  date: ISODate
  kg: number
}

/* ------------------------------- WORKOUT ------------------------------ */

export interface ExerciseDef {
  id: string
  name: string
  sets: number
  reps: string        // "8-10"
  weight: number      // kg di lavoro attuali
  note?: string
}

/** Un giorno dello split (Push, Pull, Gambe…). */
export interface SplitDay {
  id: string
  name: string
  focus?: string      // "Petto / Tricipiti"
  kcal: number        // kcal stimate bruciate
  durationMin: number
  exercises: ExerciseDef[]
}

export interface ExerciseLog {
  exerciseId: string
  name: string        // salvato in copia: lo storico resta leggibile anche se rinomini
  weight: number
  reps: string
  sets: number
}

export interface WorkoutLog {
  id: string
  date: ISODate
  splitDayId?: string
  name: string
  kcal: number
  durationMin: number
  entries: ExerciseLog[]
  note?: string
}

/* ------------------------------- STUDIO ------------------------------- */

export interface Course {
  id: string
  name: string
  cfu?: number
  docente?: string
}

/** Lezione ricorrente del calendario universitario. */
export interface Lecture {
  id: string
  courseId: string
  weekday: number     // 1 = lunedì … 7 = domenica
  start: string       // "09:00"
  end: string         // "11:00"
  room?: string
}

export interface StudyLog {
  id: string
  date: ISODate
  courseId?: string
  minutes: number
  topic?: string
  /** quanti pomodori completi ha prodotto questa sessione */
  pomodoros?: number
  /** 'pomodoro' = tempo misurato dal timer; assente = voce storica importata */
  source?: 'pomodoro'
}

export type PomodoroPhase = 'focus' | 'pausa'

/** Tecnica pomodoro classica: un blocco di focus, poi una pausa. Di default 50 / 10. */
export interface PomodoroConfig {
  focusMin: number
  breakMin: number
}

/** Una sessione in corso. Vive nello stato persistito, così un refresh non la perde. */
export interface PomodoroSession {
  phase: PomodoroPhase
  /** timestamp epoch: il conteggio è sull'orologio reale, non su tick accumulati */
  startedAt: number
  endsAt: number
  courseId?: string
  topic?: string
}

export interface StudyGoals {
  dailyMinutes: number
  weeklyMinutes: number
}

/* ------------------------------- ROUTINE ------------------------------ */

export type Priority = 'bassa' | 'media' | 'alta'
export type Repeat = 'mai' | 'giornaliera' | 'settimanale'

export interface Task {
  id: string
  title: string
  date?: ISODate       // giorno in cui va fatta
  done: boolean
  doneAt?: ISODate
  priority: Priority
  repeat: Repeat
  createdAt: string
}

/* --------------------------- PIANO SETTIMANALE ------------------------ */

export interface StudyBlock {
  id: string
  courseId?: string
  label: string
  start: string
  end: string
}

export interface DayPlan {
  workoutDayId?: string     // id di uno SplitDay, oppure 'riposo'
  workoutDone?: boolean
  studyTargetMin?: number
  studyBlocks: StudyBlock[]
}

export interface WeekPlan {
  weekStart: ISODate            // lunedì
  days: Record<ISODate, DayPlan>
  note?: string
  plannedAt?: string            // quando l'ho compilata (la domenica sera)
}

/* --------------------------------- STATO ------------------------------ */

export interface Profile {
  name: string
  startDate: ISODate
  heightCm?: number
  targetWeightKg?: number
}

export interface Settings {
  kcalTarget: number
  workoutsPerWeekTarget: number
  tasksPerWeekTarget: number
}

export interface AppData {
  version: number
  profile: Profile
  settings: Settings
  dietWeek: DietWeek
  dietLogs: Record<ISODate, DietLog>
  weights: WeightEntry[]
  splitDays: SplitDay[]
  workoutLogs: WorkoutLog[]
  courses: Course[]
  lectures: Lecture[]
  studyLogs: StudyLog[]
  studyGoals: StudyGoals
  pomodoro: PomodoroConfig
  pomodoroSession?: PomodoroSession
  pomodoroRound: number
  tasks: Task[]
  weekPlans: Record<ISODate, WeekPlan>
}

export const SECTIONS: { id: SectionId; label: string; icon: string; color: string; dim: string }[] = [
  { id: 'dieta',   label: 'Dieta',   icon: '🍽️', color: 'var(--s-dieta)',   dim: 'var(--s-dieta-dim)' },
  { id: 'workout', label: 'Workout', icon: '🏋️', color: 'var(--s-workout)', dim: 'var(--s-workout-dim)' },
  { id: 'studio',  label: 'Studio',  icon: '📚', color: 'var(--s-studio)',  dim: 'var(--s-studio-dim)' },
  { id: 'routine', label: 'Routine', icon: '✅', color: 'var(--s-routine)', dim: 'var(--s-routine-dim)' },
]

export const ADHERENCE: Record<Adherence, { label: string; score: number; tone: string; icon: string }> = {
  'perfetto':  { label: 'Perfetto',   score: 1,    tone: 'good',     icon: '●' },
  'bene':      { label: 'Bene',       score: 0.75, tone: 'warning',  icon: '◕' },
  'cosi-cosi': { label: 'Così così',  score: 0.4,  tone: 'serious',  icon: '◑' },
  'saltato':   { label: 'Sgarro',     score: 0,    tone: 'critical', icon: '○' },
}
