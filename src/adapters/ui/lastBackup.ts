// When the user last exported a Backup on this device. It describes the device, not the logbook,
// so it lives in browser storage and stays out of Backups.
const KEY = 'liftlog.lastBackupAt'

// Undefined before the first export, or when storage is unavailable.
export function lastBackupAt(): Date | undefined {
  try {
    const stored = localStorage.getItem(KEY)
    const date = stored === null ? undefined : new Date(stored)
    return date && !Number.isNaN(date.getTime()) ? date : undefined
  } catch {
    return undefined
  }
}

export function rememberBackup(at: Date) {
  try {
    localStorage.setItem(KEY, at.toISOString())
  } catch {
    // Storage unavailable (private mode, blocked site data): Settings just shows "Never".
  }
}
