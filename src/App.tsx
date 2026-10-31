import { useState } from 'react'
import type { LogbookStore } from './application/logbookStore'
import { ExerciseScreen } from './adapters/ui/screens/ExerciseScreen'
import { HomeScreen } from './adapters/ui/screens/HomeScreen'
import { SettingsScreen } from './adapters/ui/screens/SettingsScreen'
import { useRoute } from './adapters/ui/router'

function App({ store }: { store: LogbookStore }) {
  const route = useRoute()

  // Slide a screen in only when it opens from Home, not when the app starts on it (a reload).
  const [previous, setPrevious] = useState(route.name)
  const [slideIn, setSlideIn] = useState(false)
  if (route.name !== previous) {
    setPrevious(route.name)
    setSlideIn(previous === 'home')
  }

  return (
    <>
      {/* Home stays mounted under other screens, so it keeps its scroll position. */}
      <div inert={route.name !== 'home'}>
        <HomeScreen store={store} />
      </div>
      {route.name === 'exercise' && <ExerciseScreen key={route.id} store={store} id={route.id} slideIn={slideIn} />}
      {route.name === 'settings' && <SettingsScreen slideIn={slideIn} />}
    </>
  )
}

export default App
