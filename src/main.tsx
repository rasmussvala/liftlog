import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createDexieLogbookStore } from './adapters/dexie/dexieLogbookStore'
import { putHomeUnderScreen } from './adapters/ui/router'

// Composition root: create the store and hand it to the UI.
const store = createDexieLogbookStore(__DATA_NAMESPACE__)
putHomeUnderScreen()

// Ask the browser to keep the logbook, so the phone is less likely to clear it (ADR 0002).
// The answer doesn't change anything here, and older browsers don't have it.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)
