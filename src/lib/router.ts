import { useEffect, useState } from 'react'

export type Route = 'settimana' | 'dieta' | 'workout' | 'studio' | 'routine' | 'statistiche' | 'impostazioni'

const ROUTES: Route[] = ['settimana', 'dieta', 'workout', 'studio', 'routine', 'statistiche', 'impostazioni']

function current(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route
  // la settimana è la schermata principale: è lì che si atterra
  return ROUTES.includes(h) ? h : 'settimana'
}

/** Router minimo su hash: l'app resta un file statico e il refresh non perde la pagina. */
export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(current)

  useEffect(() => {
    // senza hash l'app è comunque sulla settimana: lo scriviamo per non lasciare
    // un URL ambiguo nei preferiti e nella schermata home del telefono
    if (!window.location.hash) window.location.replace(`#/${current()}`)
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
