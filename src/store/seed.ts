import { addDays, today, weekDays, weekStart, type ISODate } from '../lib/date'
import { uid } from '../lib/id'
import { emptyData } from './store'
import type { AppData, Adherence, DayPlan, DietDay, Meal, SplitDay, Task } from './types'

/** PRNG deterministico: lo stesso set di esempio a ogni caricamento. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)]

/**
 * Sei settimane di storia plausibile: serve solo a vedere come si comporta
 * l'app "a regime". Dalle impostazioni si azzera tutto in un click.
 */
export function demoData(): AppData {
  const r = rng(20260914)
  const d = emptyData()
  const now = today()
  const firstMonday = addDays(weekStart(now), -5 * 7)

  d.profile = { name: 'Matteo', startDate: firstMonday, heightCm: 178, targetWeightKg: 74 }
  d.settings = { kcalTarget: 2300, workoutsPerWeekTarget: 4, tasksPerWeekTarget: 10 }
  d.studyGoals = { dailyMinutes: 120, weeklyMinutes: 720 }

  /* ------------------------------- dieta ------------------------------- */
  const mk = (name: string, meals: [string, string, [string, string, number][]][]): DietDay => ({
    note: name,
    meals: meals.map(([mname, time, items]): Meal => ({
      id: uid('m'), name: mname, time,
      items: items.map(([n, q, k]) => ({ id: uid('f'), name: n, qty: q, kcal: k })),
    })),
  })

  /** ogni giorno ha pasti propri: copiarli condividerebbe gli id */
  const clone = (d: DietDay): DietDay => ({
    note: d.note,
    meals: d.meals.map(m => ({ ...m, id: uid('m'), items: m.items.map(i => ({ ...i, id: uid('f') })) })),
  })

  const standard = mk('Giorno standard', [
    ['Colazione', '08:00', [['Porridge di avena', '80 g', 300], ['Yogurt greco', '150 g', 130], ['Mirtilli', '100 g', 60]]],
    ['Pranzo', '13:00', [['Riso basmati', '100 g', 350], ['Petto di pollo', '180 g', 300], ['Verdure grigliate', '200 g', 90], ['Olio evo', '10 g', 90]]],
    ['Spuntino', '17:00', [['Mela', '1', 80], ['Mandorle', '25 g', 150]]],
    ['Cena', '20:30', [['Salmone', '180 g', 370], ['Patate', '250 g', 210], ['Insalata', '150 g', 40], ['Olio evo', '10 g', 90]]],
  ])
  const allenamento = mk('Giorno di allenamento', [
    ['Colazione', '07:30', [['Pancake proteici', '3', 420], ['Banana', '1', 105], ['Burro di arachidi', '20 g', 120]]],
    ['Pre-workout', '16:00', [['Riso soffiato', '40 g', 150], ['Miele', '15 g', 45]]],
    ['Post-workout', '19:00', [['Shake proteico', '30 g', 120], ['Datteri', '3', 200]]],
    ['Cena', '20:30', [['Pasta integrale', '120 g', 420], ['Manzo magro', '200 g', 380], ['Zucchine', '200 g', 60], ['Olio evo', '15 g', 135]]],
  ])
  const scarico = mk('Giorno di scarico', [
    ['Colazione', '08:30', [['Uova strapazzate', '3', 230], ['Pane di segale', '60 g', 150]]],
    ['Pranzo', '13:00', [['Insalata di ceci', '250 g', 380], ['Tonno', '120 g', 150]]],
    ['Cena', '20:00', [['Vellutata di verdure', '300 g', 160], ['Petto di tacchino', '180 g', 240], ['Olio evo', '10 g', 90]]],
  ])
  // giorni di allenamento (lun, mar, gio, sab) più carichi; domenica di scarico
  d.dietWeek = {
    1: allenamento,
    2: clone(allenamento),
    3: standard,
    4: clone(allenamento),
    5: clone(standard),
    6: clone(allenamento),
    7: scarico,
  }

  /* ------------------------------ workout ------------------------------ */
  const split = (name: string, focus: string, kcal: number, durationMin: number, ex: [string, number, string, number][]): SplitDay => ({
    id: uid('sd'), name, focus, kcal, durationMin,
    exercises: ex.map(([n, sets, reps, weight]) => ({ id: uid('ex'), name: n, sets, reps, weight })),
  })

  const push = split('Push', 'Petto / Spalle / Tricipiti', 520, 70, [
    ['Panca piana', 4, '6-8', 70], ['Panca inclinata manubri', 3, '8-10', 24],
    ['Military press', 3, '8-10', 40], ['Alzate laterali', 3, '12-15', 10], ['French press', 3, '10-12', 25],
  ])
  const pull = split('Pull', 'Dorso / Bicipiti', 480, 65, [
    ['Stacco da terra', 4, '5', 110], ['Trazioni', 4, '6-8', 0],
    ['Rematore bilanciere', 3, '8-10', 60], ['Curl bilanciere', 3, '10-12', 30],
  ])
  const legs = split('Gambe', 'Quadricipiti / Femorali / Polpacci', 600, 75, [
    ['Squat', 4, '6-8', 90], ['Leg press', 3, '10-12', 160],
    ['Leg curl', 3, '12', 45], ['Calf raise', 4, '15', 70],
  ])
  const upper = split('Upper extra', 'Richiamo full body', 420, 55, [
    ['Panca piana', 3, '8-10', 60], ['Trazioni', 3, '8', 0], ['Alzate laterali', 3, '15', 9],
  ])
  d.splitDays = [push, pull, legs, upper]

  /* ------------------------------- studio ------------------------------ */
  const courses = [
    { id: uid('c'), name: 'Analisi Matematica II', cfu: 9, docente: 'Prof. Rossi' },
    { id: uid('c'), name: 'Fisica I', cfu: 12, docente: 'Prof.ssa Bianchi' },
    { id: uid('c'), name: 'Programmazione', cfu: 6, docente: 'Prof. Verdi' },
  ]
  d.courses = courses
  d.lectures = [
    { id: uid('l'), courseId: courses[0].id, weekday: 1, start: '09:00', end: '11:00', room: 'Aula 3' },
    { id: uid('l'), courseId: courses[1].id, weekday: 1, start: '14:00', end: '16:00', room: 'Aula Magna' },
    { id: uid('l'), courseId: courses[2].id, weekday: 2, start: '11:00', end: '13:00', room: 'Lab 2' },
    { id: uid('l'), courseId: courses[0].id, weekday: 3, start: '09:00', end: '11:00', room: 'Aula 3' },
    { id: uid('l'), courseId: courses[1].id, weekday: 4, start: '14:00', end: '17:00', room: 'Aula Magna' },
    { id: uid('l'), courseId: courses[2].id, weekday: 5, start: '09:00', end: '11:00', room: 'Lab 2' },
  ]

  /* ------------------------ storia giorno per giorno -------------------- */
  const workoutByWeekday: Record<number, SplitDay | undefined> = { 1: push, 2: pull, 4: legs, 6: upper }
  const adherences: Adherence[] = ['perfetto', 'perfetto', 'bene', 'bene', 'bene', 'cosi-cosi', 'saltato']
  let weight = 79.4
  const progression = new Map<string, number>()

  for (let w = 0; w < 6; w++) {
    const monday = addDays(firstMonday, w * 7)
    const days: Record<ISODate, DayPlan> = {}

    for (const [i, date] of weekDays(monday).entries()) {
      const wd = i + 1
      const sd = workoutByWeekday[wd]
      const plan: DayPlan = {
        workoutDayId: sd ? sd.id : 'riposo',
        studyTargetMin: wd === 7 ? 60 : wd === 6 ? 90 : 120,
        studyBlocks: wd <= 5
          ? [{ id: uid('sb'), courseId: courses[wd % 3].id, label: 'Studio serale', start: '18:00', end: '20:00' }]
          : [],
      }
      days[date] = plan

      if (date > now) continue

      // peso: trend in discesa con rumore quotidiano
      weight += -0.045 + (r() - 0.5) * 0.5
      if (wd % 2 === 1 || r() > 0.4) d.weights.push({ date, kg: Math.round(weight * 10) / 10 })

      // aderenza alla dieta
      const adherence = pick(r, adherences)
      d.dietLogs[date] = { date, adherence }

      // allenamento: qualche salto qua e là
      if (sd && r() > 0.14) {
        d.workoutLogs.push({
          id: uid('wl'), date, splitDayId: sd.id, name: sd.name,
          kcal: Math.round(sd.kcal * (0.9 + r() * 0.2)),
          durationMin: Math.round(sd.durationMin * (0.9 + r() * 0.25)),
          entries: sd.exercises.map(e => {
            const key = e.name
            const base = progression.get(key) ?? e.weight
            // incremento minimo realistico (disco piccolo), con qualche stallo
            const step = base >= 60 ? 2.5 : base >= 20 ? 1.25 : 0.5
            const next = base === 0 ? 0 : base + (r() > 0.35 ? step : 0)
            progression.set(key, next)
            return { exerciseId: e.id, name: e.name, weight: next, reps: e.reps, sets: e.sets }
          }),
        })
      }

      // studio
      const target = plan.studyTargetMin ?? 0
      const done = Math.round((target * (0.4 + r() * 0.95)) / 15) * 15
      if (done > 0) {
        // lo storico è fatto di sessioni cronometrate: i pomodori sono blocchi da 50'
        const pomodori = Math.floor(done / 50)
        d.studyLogs.push({
          id: uid('sl'), date, minutes: done, courseId: courses[Math.floor(r() * 3)].id,
          topic: pick(r, ['Esercizi', 'Teoria', 'Ripasso', 'Laboratorio', 'Vecchi esami']),
          pomodoros: pomodori, source: 'pomodoro',
        })
        d.pomodoroRound += pomodori
      }
    }

    d.weekPlans[monday] = { weekStart: monday, days, plannedAt: new Date().toISOString() }
  }

  // i carichi finali dello split riflettono la progressione
  d.splitDays = d.splitDays.map(s => ({
    ...s,
    exercises: s.exercises.map(e => ({ ...e, weight: progression.get(e.name) ?? e.weight })),
  }))

  /* ------------------------------ routine ------------------------------ */
  const titles = [
    'Pagare bollette', 'Prenotare visita medica', 'Chiamare i miei', 'Fare la spesa',
    'Rispondere alle mail', 'Lavatrice', 'Ritirare pacco', 'Sistemare la scrivania',
    'Backup del portatile', 'Rinnovare abbonamento palestra', 'Pulire la stanza', 'Preparare i pasti',
  ]
  const tasks: Task[] = titles.map((title, i) => {
    const date = addDays(now, Math.floor(r() * 12) - 8)
    const done = date < now ? r() > 0.28 : false
    return {
      id: uid('t'), title, date, done, doneAt: done ? date : undefined,
      priority: i % 5 === 0 ? 'alta' : i % 3 === 0 ? 'bassa' : 'media',
      repeat: title === 'Fare la spesa' ? 'settimanale' : 'mai',
      createdAt: new Date().toISOString(),
    }
  })
  d.tasks = tasks

  return d
}
