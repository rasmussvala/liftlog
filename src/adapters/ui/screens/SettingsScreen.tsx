import { Share } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { exportBackup } from '../../../application/backup'
import type { LogbookStore } from '../../../application/logbookStore'
import { backupFileName, serializeBackup } from '../../../domain/backup'
import { shareOrDownload } from '../backupFile'
import { agoLabel, localToday } from '../format'
import { lastBackupAt, rememberBackup } from '../lastBackup'
import { PushedScreen } from '../PushedScreen'

// Grouped lists, like the phone's own Settings: a Backup card, then About.
export function SettingsScreen({ store, slideIn }: { store: LogbookStore; slideIn: boolean }) {
  return (
    <PushedScreen title="Settings" slideIn={slideIn}>
      <BackupSection store={store} />
      <Group title="About" label="App version">
        <ValueRow name="Version" value={__APP_VERSION__} />
        <div className="ml-5 border-t border-separator" />
        <ValueRow name="Build" value={__APP_COMMIT__} />
      </Group>
    </PushedScreen>
  )
}

function BackupSection({ store }: { store: LogbookStore }) {
  const [last, setLast] = useState(lastBackupAt)
  const [exporting, setExporting] = useState(false)

  // Shares the Backup, or downloads it where the browser can't share files. Only a share that went
  // through, or a download that started, counts as a backup: a cancelled share leaves the date alone.
  async function onExport() {
    setExporting(true)
    try {
      const now = new Date()
      const backup = await exportBackup(store, now)
      const outcome = await shareOrDownload(serializeBackup(backup), backupFileName(localToday(now)))
      if (outcome === 'cancelled') return
      rememberBackup(now)
      setLast(now)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Group
      title="Backup"
      footer="Your lifts live only on this phone. Export a Backup to keep a copy somewhere safe."
    >
      <button
        onClick={onExport}
        disabled={exporting}
        className="flex min-h-14 w-full items-center gap-3 px-5 text-left text-body transition-colors duration-150 ease-out active:bg-surface-raised active:duration-0"
      >
        <Share size={24} strokeWidth={1.75} className="text-tint" aria-hidden />
        <span className="flex-1 text-tint">Export backup</span>
        <span className="text-subhead text-label-secondary">
          {last ? agoLabel(localToday(last), localToday()) : 'Never'}
        </span>
      </button>
    </Group>
  )
}

// A titled card of rows, with optional small print under it.
function Group({ title, label, footer, children }: { title: string; label?: string; footer?: string; children: ReactNode }) {
  return (
    <section className="mt-6 px-5" aria-label={label ?? title}>
      <h2 className="px-1 text-headline">{title}</h2>
      <div className="mt-2 overflow-hidden rounded-card bg-surface">{children}</div>
      {footer && <p className="mt-2 px-1 text-footnote text-label-secondary">{footer}</p>}
    </section>
  )
}

function ValueRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-5 text-body">
      {name}
      <span className="text-label-secondary">{value}</span>
    </div>
  )
}
