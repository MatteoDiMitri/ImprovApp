import { useEffect, useState } from 'react'

export type Route = 'dashboard' | 'settimana' | 'dieta' | 'workout' | 'studio' | 'routine' | 'impostazioni'

const ROUTES: Route[] = ['dashboard', 'settimana', 'dieta', 'workout', 'studio', 'routine', 'impostazioni']

function current(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(h) ? h : 'dashboard'
}

/** Router minimo su hash: l'app resta un file statico e il refresh non perde la pagina. */
export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(current)

  useEffect(() => {
    const onHash = () => setRoute(current())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route) => {
    window.location.hash = `/${r}`
    window.scrollTo({ top: 0 })
  }

  return [route, go]
}
