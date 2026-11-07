// PROTOTYPE ONLY (#46): three layouts for the Backup section in Settings, switchable via ?variant=.
// Export and import are stubs: nothing is written or read. The state bar sets the Last backup date.
import { FileDown, FileUp, Share } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { press } from '../press'
import { PrototypeSwitcher, useVariant } from '../PrototypeSwitcher'

const DAY = 24 * 60 * 60 * 1000

const STATES = [
  { key: 'none', label: 'No backup', ago: null },
  { key: 'today', label: 'Today', ago: 0 },
  { key: 'days', label: '4 days', ago: 4 },
  { key: 'weeks', label: '5 weeks', ago: 35 },
] as const

const VARIANTS = [
  { key: 'A', label: 'Grouped list' },
  { key: 'B', label: 'Status card' },
  { key: 'C', label: 'Two tiles' },
  { key: 'D', label: 'List + reason' },
]

function agoText(lastBackup: number): string {
  const days = Math.floor((Date.now() - lastBackup) / DAY)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return `${Math.floor(days / 7)} weeks ago`
}

const lastBackupLine = (lastBackup: number | null) =>
  lastBackup === null ? 'No backup yet' : `Last backup: ${agoText(lastBackup)}`

type Props = {
  lastBackup: number | null
  imported: string | null
  onExport: () => void
  onImport: () => void
}

function VariantA({ lastBackup, imported, onExport, onImport }: Props) {
  const row = 'flex min-h-14 w-full items-center gap-3 px-5 text-left text-body text-tint active:bg-surface-raised'
  return (
    <section className="mt-6 px-5" aria-label="Backup">
      <h2 className="px-1 text-headline">Backup</h2>
      <div className="mt-2 overflow-hidden rounded-card bg-surface">
        <button onClick={onExport} className={row}>
          <Share size={24} strokeWidth={1.75} aria-hidden />
          Export backup
        </button>
        <div className="ml-14 border-t border-separator" />
        <button onClick={onImport} className={row}>
          <FileDown size={24} strokeWidth={1.75} aria-hidden />
          Import backup
        </button>
      </div>
      <p className="mt-2 px-1 text-footnote text-label-secondary">{lastBackupLine(lastBackup)}</p>
      {imported && <p className="mt-1 px-1 text-footnote text-label-secondary">{imported}</p>}
    </section>
  )
}

function VariantB({ lastBackup, imported, onExport, onImport }: Props) {
  return (
    <section className="mt-6 px-5" aria-label="Backup">
      <div className="rounded-card bg-surface p-5">
        <p className="text-footnote text-label-secondary">Backup</p>
        <p className="mt-1 text-title">{lastBackup === null ? 'No backup yet' : `Last one ${agoText(lastBackup)}`}</p>
        <p className="mt-2 text-subhead text-label-secondary">
          Your lifts live only on this phone. Export a Backup to keep a copy in Files or iCloud Drive.
        </p>
        <button
          onClick={onExport}
          className={`mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-tint text-headline text-on-tint ${press}`}
        >
          <Share size={22} strokeWidth={2.25} aria-hidden />
          Export backup
        </button>
        <button
          onClick={onImport}
          className="mt-2 min-h-11 w-full text-body text-tint transition-opacity duration-150 active:opacity-50 active:duration-0"
        >
          Import backup
        </button>
        {imported && <p className="mt-1 text-center text-footnote text-label-secondary">{imported}</p>}
      </div>
    </section>
  )
}

// A's grouped list, with the date as the Export row's value (iOS Settings style) and B's reason as the footer.
function VariantD({ lastBackup, imported, onExport, onImport }: Props) {
  const row = 'flex min-h-14 w-full items-center gap-3 px-5 text-left text-body active:bg-surface-raised'
  return (
    <section className="mt-6 px-5" aria-label="Backup">
      <h2 className="px-1 text-headline">Backup</h2>
      <div className="mt-2 overflow-hidden rounded-card bg-surface">
        <button onClick={onExport} className={row}>
          <Share size={24} strokeWidth={1.75} className="text-tint" aria-hidden />
          <span className="flex-1 text-tint">Export backup</span>
          <span className="text-subhead text-label-secondary">
            {lastBackup === null ? 'Never' : agoText(lastBackup).replace(/^./, (c) => c.toUpperCase())}
          </span>
        </button>
        <div className="ml-14 border-t border-separator" />
        <button onClick={onImport} className={`${row} text-tint`}>
          <FileDown size={24} strokeWidth={1.75} aria-hidden />
          Import backup
        </button>
      </div>
      <p className="mt-2 px-1 text-footnote text-label-secondary">
        {imported ?? 'Your lifts live only on this phone. Export a Backup to keep a copy in Files or iCloud Drive.'}
      </p>
    </section>
  )
}

function Tile({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-36 flex-col justify-between rounded-card bg-surface p-5 text-left ${press}`}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-tint/15 text-tint">{icon}</span>
      <span>
        <span className="block text-headline">{title}</span>
        <span className="mt-0.5 block text-footnote text-label-secondary">{detail}</span>
      </span>
    </button>
  )
}

function VariantC({ lastBackup, imported, onExport, onImport }: Props) {
  return (
    <section className="mt-6 px-5" aria-label="Backup">
      <h2 className="text-title">Backup</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile
          icon={<FileUp size={24} strokeWidth={1.75} aria-hidden />}
          title="Export"
          detail={lastBackup === null ? 'No backup yet' : `Last: ${agoText(lastBackup)}`}
          onClick={onExport}
        />
        <Tile
          icon={<FileDown size={24} strokeWidth={1.75} aria-hidden />}
          title="Import"
          detail={imported ?? 'Replaces all data'}
          onClick={onImport}
        />
      </div>
    </section>
  )
}

const DIALOGS = {
  export: {
    text: 'Pretend share sheet. In the app, iOS shows its own share sheet here.',
    ok: 'Saved to Files',
    cancel: 'Cancel share',
  },
  import: {
    text: "Backup from 3 Nov 2026: 6 exercises, 142 entries. This replaces all your current exercises and entries and can't be undone.",
    ok: 'OK',
    cancel: 'Cancel',
  },
}

// Looks like the switcher, not the app, so it reads as a stand-in for a native iOS sheet or alert.
function PrototypeDialog({ kind, onClose }: { kind: 'export' | 'import'; onClose: (ok: boolean) => void }) {
  const { text, ok, cancel } = DIALOGS[kind]
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-shadow/50 px-8">
      <div className="w-full max-w-80 rounded-card bg-label p-5 text-bg">
        <p className="text-footnote opacity-70">Prototype stand-in</p>
        <p className="mt-1 text-subhead">{text}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => onClose(false)} className="min-h-11 rounded-control border border-bg/30 text-subhead">
            {cancel}
          </button>
          <button onClick={() => onClose(true)} className="min-h-11 rounded-control bg-bg text-subhead text-label">
            {ok}
          </button>
        </div>
      </div>
    </div>
  )
}

// D's Version, in the same grouped-list style as its Backup section.
function VersionD() {
  const row = 'flex min-h-12 items-center justify-between px-5 text-body'
  return (
    <section className="mt-6 px-5" aria-label="App version">
      <h2 className="px-1 text-headline">About</h2>
      <div className="mt-2 overflow-hidden rounded-card bg-surface">
        <div className={row}>
          Version
          <span className="text-label-secondary">{__APP_VERSION__}</span>
        </div>
        <div className="ml-5 border-t border-separator" />
        <div className={row}>
          Build
          <span className="text-label-secondary">{__APP_COMMIT__}</span>
        </div>
      </div>
    </section>
  )
}

// `version` is the screen's current Version section, shown under every variant but D.
export function BackupSectionPrototype({ version }: { version: ReactNode }) {
  const [variant, setVariant] = useVariant(VARIANTS.map((v) => v.key))
  const [state, setState] = useState<string>('none')
  const [lastBackup, setLastBackup] = useState<number | null>(null)
  const [imported, setImported] = useState<string | null>(null)

  const chooseState = (key: string) => {
    const ago = STATES.find((s) => s.key === key)?.ago ?? null
    setState(key)
    setLastBackup(ago === null ? null : Date.now() - ago * DAY)
  }

  // Stand-ins for the share sheet and the import confirm. In-page, since some viewers block confirm().
  const [dialog, setDialog] = useState<'export' | 'import' | null>(null)
  const onExport = () => setDialog('export')
  const onImport = () => setDialog('import')
  const close = (ok: boolean) => {
    if (ok && dialog === 'export') {
      setLastBackup(Date.now())
      setState('today')
    }
    if (ok && dialog === 'import') setImported('Imported 6 exercises and 142 entries')
    setDialog(null)
  }

  const props = { lastBackup, imported, onExport, onImport }
  return (
    <>
      {variant === 'A' && <VariantA {...props} />}
      {variant === 'B' && <VariantB {...props} />}
      {variant === 'C' && <VariantC {...props} />}
      {variant === 'D' && <VariantD {...props} />}
      {variant === 'D' ? <VersionD /> : version}
      {dialog && <PrototypeDialog kind={dialog} onClose={close} />}
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={setVariant}
        states={STATES.map(({ key, label }) => ({ key, label }))}
        currentState={state}
        onStateChange={chooseState}
      />
    </>
  )
}
