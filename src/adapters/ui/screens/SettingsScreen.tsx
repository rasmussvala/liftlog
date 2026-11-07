import { PushedScreen } from '../PushedScreen'

// Managing exercises and backups come in later tickets.
export function SettingsScreen({ slideIn }: { slideIn: boolean }) {
  return (
    <PushedScreen title="Settings" slideIn={slideIn}>
      <section className="mt-6 px-5" aria-label="App version">
        <h2 className="text-headline">Version</h2>
        <p className="mt-1 text-subhead text-label-secondary">
          {__APP_VERSION__} · build {__APP_COMMIT__}
        </p>
      </section>
    </PushedScreen>
  )
}
