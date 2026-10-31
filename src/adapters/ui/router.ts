// Hash routing (ADR 0003): #/, #/exercise/<id>, #/settings.
import { useEffect, useMemo, useSyncExternalStore } from 'react'

export type Route = { name: 'home' } | { name: 'exercise'; id: number } | { name: 'settings' }

// Unknown routes are Home.
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '')
  if (path === '/settings') return { name: 'settings' }
  const exercise = /^\/exercise\/([1-9]\d*)$/.exec(path)
  if (exercise) return { name: 'exercise', id: Number(exercise[1]) }
  return { name: 'home' }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'exercise':
      return `#/exercise/${route.id}`
    case 'settings':
      return '#/settings'
  }
}

// pushState and replaceState don't fire hashchange, so listeners are told by hand.
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  window.addEventListener('hashchange', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
    window.removeEventListener('hashchange', listener)
  }
}

// The current route. Re-renders when it changes.
export function useRoute(): Route {
  // Snapshot the hash string, not a parsed object, so React can compare snapshots.
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  const route = useMemo(() => parseRoute(hash), [hash])

  // An unknown route shows Home: tidy the URL to match.
  useEffect(() => {
    if (route.name === 'home' && hash !== '' && hash !== href(route)) goHome()
  }, [route, hash])

  return route
}

// Opens a screen on top of Home. Marks the history entry, so goHome() knows it can just go back.
export function openScreen(route: Route) {
  window.history.pushState({ openedFromHome: true }, '', href(route))
  notify()
}

// Call once at startup. When the app opens straight onto a screen (a link, or a reload of a
// fresh tab), slip a Home entry underneath it, so the back gesture returns to Home instead of leaving the app.
export function putHomeUnderScreen() {
  const route = parseRoute(window.location.hash)
  if (route.name === 'home' || (window.history.state as { openedFromHome?: boolean } | null)?.openedFromHome) return
  window.history.replaceState(null, '', href({ name: 'home' }))
  openScreen(route)
}

// Back to Home. Going back keeps history tidy, so the back gesture doesn't return to the closed screen.
// After a reload or a link opened straight onto a screen, there's no Home entry to go back to, so replace instead.
export function goHome() {
  if ((window.history.state as { openedFromHome?: boolean } | null)?.openedFromHome) {
    window.history.back()
  } else {
    window.history.replaceState(null, '', href({ name: 'home' }))
    notify()
  }
}
