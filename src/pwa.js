import { setStatus } from './utils.js'

// ── HTTPS check ──
const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
setStatus('https', isSecure ? 'ok' : 'err', isSecure ? location.protocol : '不安全')

// ── Service Worker ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => setStatus('sw', 'ok', '已註冊'))
    .catch(() => setStatus('sw', 'err', '失敗'))
} else {
  setStatus('sw', 'err', '不支援')
}

// ── Manifest ──
fetch('manifest.json')
  .then(r => r.ok ? setStatus('manifest', 'ok', '已載入') : setStatus('manifest', 'err', '載入失敗'))
  .catch(() => setStatus('manifest', 'err', '找不到'))

// ── Installed check ──
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
setStatus('installed', isStandalone ? 'ok' : 'warn', isStandalone ? '已安裝 ✓' : '瀏覽器中')

// ── PWA Install prompt ──
let deferredPrompt

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferredPrompt = e
  document.getElementById('install-banner').style.display = 'block'
})

document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  document.getElementById('install-banner').style.display = 'none'
  if (outcome === 'accepted') setStatus('installed', 'ok', '已安裝 ✓')
})
