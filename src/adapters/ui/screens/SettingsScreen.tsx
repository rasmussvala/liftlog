import { Download, Share } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { exportBackup, importBackup } from '../../../application/backup'
import type { LogbookStore } from '../../../application/logbookStore'
import { backupFileName, parseBackup, serializeBackup, type BackupProblem } from '../../../domain/backup'
import { shareOrDownload } from '../backupFile'
import { agoLabel, countLabel, dateLabel, localToday } from '../format'
import { lastBackupAt, rememberBackup } from '../lastBackup'
import { PushedScreen } from '../PushedScreen'

// Grouped lists, like the phone's own Settings: a Backup card, then About.
export function SettingsScreen({ store, slideIn }: { store: LogbookStore; slideIn: boolean }) {
  return (
    <PushedScreen title="Settings" slideIn={slideIn}>
      <BackupSection store={store} />
      <Group title="About">
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
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<string>()
  const fileInput = useRef<HTMLInputElement>(null)

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

  // Checks the whole picked file first. A problem shows one message and changes nothing; a valid
  // Backup asks to replace everything, and OK does it in one step. Screens update through live queries.
  async function onFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared, so picking the same file again still fires a change.
    event.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      const read = parseBackup(await file.text())
      if (read.problem) return window.alert(PROBLEMS[read.problem])
      const exercises = countLabel(read.exerciseCount, 'exercise')
      const entries = countLabel(read.entryCount, 'entry', 'entries')
      const ok = window.confirm(
        `Backup from ${dateLabel(read.exportedAt)}: ${exercises}, ${entries}. ` +
          `This replaces all your current exercises and entries and can't be undone.`,
      )
      if (!ok) return
      await importBackup(store, read.backup)
      setImported(`Imported ${exercises} and ${entries}`)
    } catch {
      window.alert("Couldn't import this Backup. Your exercises and entries haven't changed.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Group
      title="Backup"
      footer={imported ?? 'Your lifts live only on this phone. Export a Backup to keep a copy somewhere safe.'}
    >
      <button onClick={onExport} disabled={exporting} className={ROW}>
        <Share size={24} strokeWidth={1.75} className="text-tint" aria-hidden />
        <span className="flex-1 text-tint">Export backup</span>
        <span className="text-subhead text-label-secondary">
          {last ? agoLabel(localToday(last), localToday()) : 'Never'}
        </span>
      </button>
      <div className="ml-5 border-t border-separator" />
      <button onClick={() => fileInput.current?.click()} disabled={importing} className={ROW}>
        <Download size={24} strokeWidth={1.75} className="text-tint" aria-hidden />
        <span className="flex-1 text-tint">Import backup</span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        onChange={onFilePicked}
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
    </Group>
  )
}

const ROW =
  'flex min-h-14 w-full items-center gap-3 px-5 text-left text-body transition-colors duration-150 ease-out active:bg-surface-raised active:duration-0'

// What the user is told when a picked file can't be imported. Nothing has changed in any of them.
const PROBLEMS: Record<BackupProblem, string> = {
  'not-a-backup': "This file isn't a liftlog Backup.",
  'newer-version': 'This Backup was made by a newer version of liftlog. Update the app, then import it again.',
  'blank-name': "This Backup can't be imported: an exercise has no name.",
  'name-too-long': "This Backup can't be imported: an exercise name is longer than 40 characters.",
  'duplicate-name': "This Backup can't be imported: two exercises have the same name.",
  'bad-weight': "This Backup can't be imported: an entry's weight isn't over 0 and under 1000 kg, with at most 2 decimals.",
  'bad-reps': "This Backup can't be imported: an entry's reps aren't a whole number from 1 to 12.",
  'bad-day': "This Backup can't be imported: an entry's day isn't a valid date.",
  'duplicate-day': "This Backup can't be imported: an exercise has two entries on the same day.",
}

// A titled card of rows, with optional small print under it.
function Group({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  return (
    <section className="mt-6 px-5" aria-label={title}>
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
