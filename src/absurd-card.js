import { initBackend } from 'absurd-sql/dist/indexeddb-main-thread'

const ID = 'aql'

function setStatus(state, value) {
  document.getElementById(`dot-${ID}`).className = `dot ${state}`
  document.getElementById(`val-${ID}`).textContent = value
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

let msgId = 0
const pending = new Map()
let worker

function send(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, action, payload })
  })
}

async function renderList() {
  const records = await send('getAll')
  const list = document.getElementById(`${ID}-list`)
  document.getElementById(`${ID}-count`).textContent = records.length ? `(${records.length})` : ''
  if (!records.length) {
    list.innerHTML = '<div class="idb-empty">尚無資料</div>'
    return
  }
  list.innerHTML = records.map(r => `
    <div class="idb-item">
      <div class="idb-item-body">
        <div class="idb-item-title">${escHtml(r.title)}</div>
        ${r.content ? `<div class="idb-item-content">${escHtml(r.content)}</div>` : ''}
        <div class="idb-item-id">#${r.id} · ${new Date(r.created_at).toLocaleString('zh-TW')}</div>
      </div>
      <div class="idb-actions">
        <button class="btn-edit" onclick="aqlStartEdit(${r.id})">編輯</button>
        <button class="btn-del" onclick="aqlDelete(${r.id})">刪除</button>
      </div>
    </div>
  `).join('')
}

let editingId = null

function cancelEdit() {
  editingId = null
  document.getElementById(`${ID}-title`).value = ''
  document.getElementById(`${ID}-content`).value = ''
  document.getElementById(`${ID}-save-btn`).textContent = '＋ 新增'
  document.getElementById(`${ID}-cancel-btn`).style.display = 'none'
}

window.aqlStartEdit = async (id) => {
  const records = await send('getAll')
  const r = records.find(x => x.id === id)
  if (!r) return
  editingId = id
  document.getElementById(`${ID}-title`).value = r.title
  document.getElementById(`${ID}-content`).value = r.content || ''
  document.getElementById(`${ID}-save-btn`).textContent = '✓ 儲存修改'
  document.getElementById(`${ID}-cancel-btn`).style.display = ''
  document.getElementById(`${ID}-title`).focus()
}

window.aqlDelete = async (id) => {
  await send('delete', { id })
  await renderList()
  setStatus('ok', `刪除 #${id}`)
}

document.getElementById(`${ID}-cancel-btn`).addEventListener('click', cancelEdit)

document.getElementById(`${ID}-save-btn`).addEventListener('click', async () => {
  const title = document.getElementById(`${ID}-title`).value.trim()
  if (!title) { document.getElementById(`${ID}-title`).focus(); return }
  const content = document.getElementById(`${ID}-content`).value.trim()
  if (editingId !== null) {
    await send('update', { id: editingId, title, content })
    setStatus('ok', `已更新 #${editingId}`)
    cancelEdit()
  } else {
    const { id } = await send('add', { title, content })
    setStatus('ok', `已新增 #${id}`)
    document.getElementById(`${ID}-title`).value = ''
    document.getElementById(`${ID}-content`).value = ''
  }
  await renderList()
})

// ── Init ──
setStatus('pulse', '初始化中…')

if (!crossOriginIsolated) {
  setStatus('warn', '缺少 COOP/COEP 標頭')
  document.getElementById(`${ID}-form`).style.opacity = '0.4'
  document.getElementById(`${ID}-form`).style.pointerEvents = 'none'
  document.getElementById(`${ID}-list`).innerHTML = `
    <div class="idb-empty" style="color:var(--yellow);line-height:1.8">
      需要 SharedArrayBuffer 支援<br>
      請以 <code style="color:var(--accent)">pnpm dev</code> 啟動才能使用
    </div>
  `
} else {
  worker = new Worker(new URL('./absurd-sql.worker.js', import.meta.url), { type: 'module' })

  // Let absurd-sql proxy IDB child-worker creation through the main thread
  initBackend(worker)

  // Our CRUD message handler
  worker.addEventListener('message', ({ data: { id, result, error } }) => {
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    if (error) p.reject(new Error(error))
    else p.resolve(result)
  })

  worker.addEventListener('error', (e) => {
    setStatus('err', e.message || 'Worker 錯誤')
  })

  send('ping')
    .then(() => {
      setStatus('ok', 'SQLite + IDB (absurd-sql)')
      return renderList()
    })
    .catch(err => {
      setStatus('err', err.message || '初始化失敗')
    })
}
