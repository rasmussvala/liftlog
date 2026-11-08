// Hands a Backup file to the user: the phone's share sheet where the browser can share files,
// otherwise a download.

// shared: the user picked somewhere to send it. cancelled: they closed the share sheet.
// downloaded: the browser can't share files, so the download started instead.
export type BackupFileOutcome = 'shared' | 'cancelled' | 'downloaded'

export async function shareOrDownload(text: string, fileName: string): Promise<BackupFileOutcome> {
  const file = new File([text], fileName, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Anything else, such as the browser refusing to share right now: download instead.
    }
  }
  download(file)
  return 'downloaded'
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  // Give the browser time to start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
