import { setStatus, escHtml } from './utils.js'

const IDB_NAME = 'pwa-test-db'
const IDB_VERSION = 1
const STORE = 'notes'
let db = null
let editingId = null

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = e => {
      const store = e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      store.createIndex('createdAt', 'createdAt')
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = e => reject(e.target.error)
  })
}

function idbAdd(title, content) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add({ title, content, createdAt: Date.now() })
    req.onsuccess = () => resolve(req.result)
    req.onerror = e => reject(e.target.error)
  })
}

function idbUpdate(id, title, content) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const record = getReq.result
      record.title = title
      record.content = content
      record.updatedAt = Date.now()
      const putReq = store.put(record)
      putReq.onsuccess = () => resolve()
      putReq.onerror = e => reject(e.target.error)
    }
    getReq.onerror = e => reject(e.target.error)
  })
}

function idbDelete(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = e => reject(e.target.error)
  })
}

function idbGetAll() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = e => reject(e.target.error)
  })
}

async function renderList() {
  const records = await idbGetAll()
  const list = document.getElementById('idb-list')
  document.getElementById('idb-count').textContent = records.length ? `(${records.length})` : ''
  if (records.length === 0) {
    list.innerHTML = '<div class="idb-empty">尚無資料</div>'
    return
  }
  list.innerHTML = records.slice().reverse().map(r => `
    <div class="idb-item">
      <div class="idb-item-body">
        <div class="idb-item-title">${escHtml(r.title)}</div>
        ${r.content ? `<div class="idb-item-content">${escHtml(r.content)}</div>` : ''}
        <div class="idb-item-id">#${r.id} · ${new Date(r.createdAt).toLocaleString('zh-TW')}</div>
      </div>
      <div class="idb-actions">
        <button class="btn-edit" onclick="idbStartEdit(${r.id})">編輯</button>
        <button class="btn-del" onclick="idbDeleteRecord(${r.id})">刪除</button>
      </div>
    </div>
  `).join('')
}

function cancelEdit() {
  editingId = null
  document.getElementById('idb-title').value = ''
  document.getElementById('idb-content').value = ''
  document.getElementById('idb-save-btn').textContent = '＋ 新增'
  document.getElementById('idb-cancel-btn').style.display = 'none'
}

window.idbStartEdit = (id) => {
  idbGetAll().then(records => {
    const r = records.find(x => x.id === id)
    if (!r) return
    editingId = id
    document.getElementById('idb-title').value = r.title
    document.getElementById('idb-content').value = r.content || ''
    document.getElementById('idb-save-btn').textContent = '✓ 儲存修改'
    document.getElementById('idb-cancel-btn').style.display = ''
    document.getElementById('idb-title').focus()
  })
}

window.idbDeleteRecord = async (id) => {
  await idbDelete(id)
  await renderList()
  setStatus('idb', 'ok', `刪除 #${id}`)
}

document.getElementById('idb-cancel-btn').addEventListener('click', cancelEdit)

document.getElementById('idb-save-btn').addEventListener('click', async () => {
  const title = document.getElementById('idb-title').value.trim()
  if (!title) { document.getElementById('idb-title').focus(); return }
  const content = document.getElementById('idb-content').value.trim()
  if (editingId !== null) {
    await idbUpdate(editingId, title, content)
    setStatus('idb', 'ok', `已更新 #${editingId}`)
    cancelEdit()
  } else {
    const newId = await idbAdd(title, content)
    setStatus('idb', 'ok', `已新增 #${newId}`)
    document.getElementById('idb-title').value = ''
    document.getElementById('idb-content').value = ''
  }
  await renderList()
})

document.getElementById('clear-all-btn').addEventListener('click', async () => {
  const btn = document.getElementById('clear-all-btn')
  btn.disabled = true
  btn.textContent = '清空中…'
  try {
    if ('databases' in indexedDB) {
      const dbs = await indexedDB.databases()
      dbs.forEach(({ name }) => indexedDB.deleteDatabase(name))
    } else {
      ['pwa-test-db'].forEach(name => indexedDB.deleteDatabase(name))
    }
    location.reload()
  } catch {
    btn.disabled = false
    btn.textContent = '🗑 清空所有 IndexedDB 資料'
  }
})

openDB()
  .then(database => {
    db = database
    setStatus('idb', 'ok', '已開啟 v1')
    return renderList()
  })
  .catch(err => setStatus('idb', 'err', err.message || '開啟失敗'))
