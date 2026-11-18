import { useState, useSyncExternalStore } from 'react'
import { Download, Share } from 'lucide-react'
import Modal from '../ui/Modal'

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const installChanges = new EventTarget()
const standalone = window.matchMedia('(display-mode: standalone)')
const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
let promptEvent: InstallPromptEvent | null = null
let installed = false

function updateInstallPrompt(event: InstallPromptEvent | null) {
  promptEvent = event
  installChanges.dispatchEvent(new Event('change'))
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  updateInstallPrompt(event as InstallPromptEvent)
})
window.addEventListener('appinstalled', () => {
  installed = true
  updateInstallPrompt(null)
})

function subscribe(callback: () => void) {
  installChanges.addEventListener('change', callback)
  standalone.addEventListener('change', callback)
  return () => {
    installChanges.removeEventListener('change', callback)
    standalone.removeEventListener('change', callback)
  }
}

function canInstall() {
  const appleStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return !installed && !standalone.matches && !appleStandalone && (promptEvent !== null || isAppleMobile)
}

export default function InstallAppButton() {
  const available = useSyncExternalStore(subscribe, canInstall)
  const [showInstructions, setShowInstructions] = useState(false)
  if (!available && !showInstructions) return null

  async function install() {
    if (!promptEvent) {
      setShowInstructions(true)
      return
    }
    const event = promptEvent
    try {
      await event.prompt()
    } catch {
      setShowInstructions(true)
    } finally {
      if (promptEvent === event) updateInstallPrompt(null)
    }
  }

  return (
    <>
      {available && <button
        type="button"
        onClick={install}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        <Download size={16} aria-hidden />
        Pasang aplikasi
      </button>}
      <Modal title="Pasang Loka Admin" open={showInstructions} onClose={() => setShowInstructions(false)}>
        <p className="text-sm leading-relaxed text-slate-600">
          {isAppleMobile ? <>
            Di Safari, ketuk <Share size={16} className="inline align-text-bottom" aria-hidden /> <strong>Bagikan</strong>, lalu pilih <strong>Tambah ke Layar Utama</strong>.
          </> : 'Buka menu browser dan pilih pemasangan aplikasi atau Tambahkan ke layar utama.'}
        </p>
      </Modal>
    </>
  )
}
