import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createDexieLogbookStore } from './adapters/dexie/dexieLogbookStore'

// Composition root: create the store and hand it to the UI.
const store = createDexieLogbookStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
)
