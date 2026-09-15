import { useEffect, useState } from 'react'
import { useRoute, type Route } from './lib/router'
import { getStorageHealth, onStorageHealth, probeStorage, STORAGE_MESSAGES, type StorageHealth } from './lib/storage'
import { useStore } from './store/store'
import { Week } from './pages/Week'
import { Diet } from './pages/Diet'
import { Workout } from './pages/Workout'
import { Study } from './pages/Study'
import { Routine } from './pages/Routine'
import { Stats } from './pages/Stats'
import { Settings } from './pages/Settings'

const SECTION_NAV: { route: Route; label: string; short: string; icon: string }[] = [
  { route: 'dieta',   label: 'Dieta',   short: 'Dieta',  icon: '🍽️' },
  { route: 'workout', label: 'Workout', short: 'Gym',    icon: '🏋️' },
  { route: 'studio',  label: 'Studio',  short: 'Studio', icon: '📚' },
  { route: 'routine', label: 'Routine', short: 'Todo',   icon: '✅' },
]

export function App() {
  const [route, go] = useRoute()
  const openTasks = useStore(s => s.data.tasks.filter(t => !t.done).length)
  const pomodoroActive = useStore(s => !!s.data.pomodoroSession)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">IA</div>
          <div>
            <div className="sidebar__title">ImprovApp</div>
            <div className="sidebar__sub">Life RPG</div>
          </div>
        </div>

        <button
          className="navitem navitem--main"
          aria-current={route === 'settimana' ? 'page' : undefined}
          onClick={() => go('settimana')}
        >
          <span className="navitem__icon">🗓️</span>
          La settimana
        </button>

        <div className="sidebar__group">Sezioni</div>
        <nav>
          {SECTION_NAV.map(n => (
            <button
              key={n.route}
              className="navitem"
              aria-current={route === n.route ? 'page' : undefined}
              onClick={() => go(n.route)}
            >
              <span className="navitem__icon">{n.icon}</span>
              {n.label}
              {n.route === 'routine' && openTasks > 0 && <span className="navitem__badge num">{openTasks}</span>}
              {n.route === 'studio' && pomodoroActive && <span className="navitem__badge">🍅</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button className="navitem" aria-current={route === 'statistiche' ? 'page' : undefined}
            onClick={() => go('statistiche')}>
            <span className="navitem__icon">📈</span>
            Statistiche
          </button>
          <button className="navitem" aria-current={route === 'impostazioni' ? 'page' : undefined}
            onClick={() => go('impostazioni')}>
            <span className="navitem__icon">⚙️</span>
            Impostazioni
          </button>
        </div>
      </aside>

      <main className={`main${route === 'settimana' ? ' main--full' : ''}`}>
        <StorageWarning />
        {route === 'settimana' && <Week go={go} />}
        {route === 'dieta' && <Diet />}
        {route === 'workout' && <Workout />}
        {route === 'studio' && <Study />}
        {route === 'routine' && <Routine />}
        {route === 'statistiche' && <Stats go={go} />}
        {route === 'impostazioni' && <Settings />}
      </main>

      <nav className="mobilenav">
        <button className="navitem" style={{ flex: 1 }}
          aria-current={route === 'settimana' ? 'page' : undefined} onClick={() => go('settimana')}>
          <span className="navitem__icon">🗓️</span>
          Week
        </button>
        {SECTION_NAV.map(n => (
          <button key={n.route} className="navitem" style={{ flex: 1 }}
            aria-current={route === n.route ? 'page' : undefined} onClick={() => go(n.route)}>
            <span className="navitem__icon">{n.icon}</span>
            {n.short}
          </button>
        ))}
        <button className="navitem" style={{ flex: 1 }}
          aria-current={route === 'statistiche' ? 'page' : undefined} onClick={() => go('statistiche')}>
          <span className="navitem__icon">📈</span>
          Stats
        </button>
      </nav>
    </div>
  )
}

/**
 * Se il browser non conserva i dati bisogna dirlo prima che l'utente ci lavori
 * sopra un'ora: è l'unico modo di non far sparire il lavoro in silenzio.
 */
function StorageWarning() {
  const [health, setHealth] = useState<StorageHealth>(getStorageHealth)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setHealth(probeStorage())
    return onStorageHealth(setHealth)
  }, [])

  if (health === 'ok' || dismissed) return null

  return (
    <div className="notice notice--danger" style={{ marginBottom: 14 }}>
      <div className="row">
        <span style={{ fontSize: 16 }}>⚠️</span>
        <span className="grow">{STORAGE_MESSAGES[health]}</span>
        <button className="btn btn--sm btn--ghost" onClick={() => setDismissed(true)}>Ho capito</button>
      </div>
    </div>
  )
}
