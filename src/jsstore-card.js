import { Connection } from 'jsstore'
import jsStoreWorkerUrl from 'jsstore/dist/jsstore.worker.min.js?url'

const ID = 'jss'

function setStatus(state, value) {
  document.getElementById(`dot-${ID}`).className = `dot ${state}`
  document.getElementById(`val-${ID}`).textContent = value
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const connection = new Connection(new Worker(jsStoreWorkerUrl))

const DB_SCHEMA = {
  name: 'pwa-jsstore-db',
  tables: [{
    name: 'notes',
    columns: {
      id: { primaryKey: true, autoIncrement: true },
      title: { notNull: true, dataType: 'string' },
      content: { dataType: 'string' },
      createdAt: { dataType: 'number' },
    },
  }],
}

async function renderList() {
  const records = await connection.select({
    from: 'notes',
    order: { by: 'id', type: 'desc' },
  })
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
        <div class="idb-item-id">#${r.id} · ${new Date(r.createdAt).toLocaleString('zh-TW')}</div>
      </div>
      <div class="idb-actions">
        <button class="btn-edit" onclick="jssStartEdit(${r.id})">編輯</button>
        <button class="btn-del" onclick="jssDelete(${r.id})">刪除</button>
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

window.jssStartEdit = async (id) => {
  const records = await connection.select({ from: 'notes', where: { id } })
  const r = records[0]
  if (!r) return
  editingId = id
  document.getElementById(`${ID}-title`).value = r.title
  document.getElementById(`${ID}-content`).value = r.content || ''
  document.getElementById(`${ID}-save-btn`).textContent = '✓ 儲存修改'
  document.getElementById(`${ID}-cancel-btn`).style.display = ''
  document.getElementById(`${ID}-title`).focus()
}

window.jssDelete = async (id) => {
  await connection.remove({ from: 'notes', where: { id } })
  await renderList()
  setStatus('ok', `刪除 #${id}`)
}

document.getElementById(`${ID}-cancel-btn`).addEventListener('click', cancelEdit)

document.getElementById(`${ID}-save-btn`).addEventListener('click', async () => {
  const title = document.getElementById(`${ID}-title`).value.trim()
  if (!title) { document.getElementById(`${ID}-title`).focus(); return }
  const content = document.getElementById(`${ID}-content`).value.trim()
  if (editingId !== null) {
    await connection.update({ in: 'notes', set: { title, content }, where: { id: editingId } })
    setStatus('ok', `已更新 #${editingId}`)
    cancelEdit()
  } else {
    await connection.insert({ into: 'notes', values: [{ title, content, createdAt: Date.now() }] })
    setStatus('ok', '已新增')
    document.getElementById(`${ID}-title`).value = ''
    document.getElementById(`${ID}-content`).value = ''
  }
  await renderList()
})

setStatus('pulse', '初始化中…')
connection.initDb(DB_SCHEMA)
  .then(() => {
    setStatus('ok', 'IndexedDB (JsStore v4)')
    return renderList()
  })
  .catch(err => {
    setStatus('err', err.message || '初始化失敗')
  })
