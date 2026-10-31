import { PushedScreen } from '../PushedScreen'

// Managing exercises and backups come in later tickets.
export function SettingsScreen({ slideIn }: { slideIn: boolean }) {
  return (
    <PushedScreen title="Settings" slideIn={slideIn}>
      <p className="mt-4 px-5 text-body text-label-secondary">WIP</p>
    </PushedScreen>
  )
}
