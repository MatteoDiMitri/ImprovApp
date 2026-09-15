import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'

/**
 * Timer per la tecnica pomodoro: un blocco di focus, poi una pausa.
 *
 * Il tempo è la differenza fra due timestamp (`Date.now()`), non un conteggio
 * di tick: sospendere la scheda o bloccare il telefono non regala né toglie
 * minuti, e la sessione sopravvive a un refresh perché vive nello stato
 * salvato. I minuti finiscono nello storico solo passando da qui: non esiste
 * un campo per scriverli a mano.
 */
export interface PomodoroView {
  active: boolean
  phase: 'focus' | 'pausa' | null
  remainingMs: number
  totalMs: number
  /** 0..1, quanto ne è passato */
  progress: number
  round: number
  /** esito dell'ultima sessione chiusa, per darne conferma a schermo */
  lastResult: { minutes: number; logged: boolean; completed: boolean } | null
  start: (opts: { courseId?: string; topic?: string }) => void
  /** ferma il focus in corso registrando i minuti fatti fin qui */
  stop: () => void
  skipBreak: () => void
}

function beep(kind: 'fine-focus' | 'fine-pausa') {
  try {
    const Ctx = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = kind === 'fine-focus' ? [660, 880] : [520, 400]
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = f
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02 + i * 0.22)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22 + i * 0.22)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.22)
      osc.stop(ctx.currentTime + 0.3 + i * 0.22)
    })
    setTimeout(() => void ctx.close(), 1200)
  } catch { /* audio non disponibile: il timer funziona lo stesso */ }
}

export function usePomodoro(): PomodoroView {
  const session = useStore(s => s.data.pomodoroSession)
  const round = useStore(s => s.data.pomodoroRound)
  const startFocus = useStore(s => s.startFocus)
  const startBreak = useStore(s => s.startBreak)
  const finishFocus = useStore(s => s.finishFocus)
  const endSession = useStore(s => s.endSession)

  const [now, setNow] = useState(() => Date.now())
  const [lastResult, setLastResult] = useState<PomodoroView['lastResult']>(null)
  // evita che due render ravvicinati chiudano la stessa sessione due volte
  const closing = useRef(false)

  useEffect(() => {
    if (!session) return
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 250)
    // al rientro nell'app l'orologio va riallineato subito, senza aspettare il tick
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [session])

  /* fine naturale della fase: il focus registra il pomodoro e apre la pausa */
  useEffect(() => {
    if (!session || closing.current || now < session.endsAt) return
    closing.current = true
    if (session.phase === 'focus') {
      const minutes = (session.endsAt - session.startedAt) / 60_000
      finishFocus(minutes, true)
      setLastResult({ minutes: Math.round(minutes), logged: true, completed: true })
      beep('fine-focus')
      startBreak()
    } else {
      endSession()
      beep('fine-pausa')
    }
    setTimeout(() => { closing.current = false }, 0)
  }, [session, now, finishFocus, startBreak, endSession])

  const totalMs = session ? session.endsAt - session.startedAt : 0
  const remainingMs = session ? Math.max(0, session.endsAt - now) : 0

  return {
    active: !!session,
    phase: session?.phase ?? null,
    remainingMs,
    totalMs,
    progress: totalMs > 0 ? 1 - remainingMs / totalMs : 0,
    round,
    lastResult,
    start: (opts) => { setLastResult(null); startFocus(opts) },
    stop: () => {
      const s = useStore.getState().data.pomodoroSession
      if (!s) return
      if (s.phase !== 'focus') { endSession(); return }
      const minutes = (Date.now() - s.startedAt) / 60_000
      finishFocus(minutes, false)
      // sotto il minuto non si registra niente: va detto, o sembra un dato perso
      setLastResult({ minutes: Math.round(minutes), logged: Math.round(minutes) >= 1, completed: false })
    },
    skipBreak: () => endSession(),
  }
}

export function mmss(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
