import { useRoute, type Route } from './lib/router'
import { useStore } from './store/store'
import { levelInfo, totalXp } from './store/selectors'
import { today } from './lib/date'
import { Dashboard } from './pages/Dashboard'
import { Week } from './pages/Week'
import { Diet } from './pages/Diet'
import { Workout } from './pages/Workout'
import { Study } from './pages/Study'
import { Routine } from './pages/Routine'
import { Settings } from './pages/Settings'

const NAV: { route: Route; label: string; short: string; icon: string; color?: string }[] = [
  { route: 'dashboard',  label: 'Panoramica', short: 'Home',  icon: '🎮' },
  { route: 'settimana',  label: 'Settimana',  short: 'Week',  icon: '🗓️' },
  { route: 'dieta',      label: 'Dieta',      short: 'Dieta', icon: '🍽️', color: 'var(--s-dieta)' },
  { route: 'workout',    label: 'Workout',    short: 'Gym',   icon: '🏋️', color: 'var(--s-workout)' },
  { route: 'studio',     label: 'Studio',     short: 'Studio',icon: '📚', color: 'var(--s-studio)' },
  { route: 'routine',    label: 'Routine',    short: 'Todo',  icon: '✅', color: 'var(--s-routine)' },
]

export function App() {
  const [route, go] = useRoute()
  const data = useStore(s => s.data)

  const xp = totalXp(data)
  const lvl = levelInfo(xp.total)

  const openTasks = data.tasks.filter(t => !t.done).length
  const loggedToday = data.dietLogs[today()]?.adherence != null

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

        <div className="hud" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ width: '100%' }}>
            <div className="row row--tight" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="label">Livello {lvl.level}</span>
              <span className="small muted num">{lvl.intoLevel}/{lvl.levelSpan}</span>
            </div>
            <div className="xpbar"><div className="xpbar__fill" style={{ width: `${lvl.progress * 100}%` }} /></div>
          </div>
        </div>

        <nav>
          {NAV.map(n => (
            <button
              key={n.route}
              className="navitem"
              aria-current={route === n.route ? 'page' : undefined}
              onClick={() => go(n.route)}
            >
              <span className="navitem__icon">{n.icon}</span>
              {n.label}
              {n.route === 'routine' && openTasks > 0 && <span className="navitem__badge num">{openTasks}</span>}
              {n.route === 'dieta' && !loggedToday && <span className="navitem__badge">!</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button
            className="navitem"
            aria-current={route === 'impostazioni' ? 'page' : undefined}
            onClick={() => go('impostazioni')}
          >
            <span className="navitem__icon">⚙️</span>
            Impostazioni
          </button>
        </div>
      </aside>

      <main className="main">
        {route === 'dashboard' && <Dashboard go={go} />}
        {route === 'settimana' && <Week />}
        {route === 'dieta' && <Diet />}
        {route === 'workout' && <Workout />}
        {route === 'studio' && <Study />}
        {route === 'routine' && <Routine />}
        {route === 'impostazioni' && <Settings />}
      </main>

      <nav className="mobilenav">
        {NAV.map(n => (
          <button
            key={n.route}
            className="navitem"
            style={{ flex: 1 }}
            aria-current={route === n.route ? 'page' : undefined}
            onClick={() => go(n.route)}
          >
            <span className="navitem__icon">{n.icon}</span>
            {n.short}
          </button>
        ))}
        <button
          className="navitem" style={{ flex: 1 }}
          aria-current={route === 'impostazioni' ? 'page' : undefined}
          onClick={() => go('impostazioni')}
        >
          <span className="navitem__icon">⚙️</span>
          Setup
        </button>
      </nav>
    </div>
  )
}
