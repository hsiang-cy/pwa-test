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
