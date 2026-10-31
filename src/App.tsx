import type { LogbookStore } from './application/logbookStore'
import { HomeScreen } from './adapters/ui/screens/HomeScreen'

function App({ store }: { store: LogbookStore }) {
  return <HomeScreen store={store} />
}

export default App
