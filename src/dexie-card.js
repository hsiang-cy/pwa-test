import Dexie from 'dexie'

// 與原生 IndexedDB 卡片共用同一個資料庫 pwa-test-db / notes
const db = new Dexie('pwa-test-db')
db.version(1).stores({ notes: '++id, createdAt' })

function setStatus(state, value) {
  document.getElementById('dot-dex').className = `dot ${state}`
  document.getElementById('val-dex').textContent = value
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

let editingId = null

async function renderList() {
  const records = await db.notes.orderBy('id').toArray()
  const list = document.getElementById('dex-list')
  document.getElementById('dex-count').textContent = records.length ? `(${records.length})` : ''
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
        <button class="btn-edit" onclick="dexStartEdit(${r.id})">編輯</button>
        <button class="btn-del" onclick="dexDelete(${r.id})">刪除</button>
      </div>
    </div>
  `).join('')
}

window.dexStartEdit = async (id) => {
  const r = await db.notes.get(id)
  if (!r) return
  editingId = id
  document.getElementById('dex-title').value = r.title
  document.getElementById('dex-content').value = r.content || ''
  document.getElementById('dex-save-btn').textContent = '✓ 儲存修改'
  document.getElementById('dex-cancel-btn').style.display = ''
  document.getElementById('dex-title').focus()
}

window.dexDelete = async (id) => {
  await db.notes.delete(id)
  await renderList()
  setStatus('ok', `刪除 #${id}`)
}

document.getElementById('dex-cancel-btn').addEventListener('click', () => {
  editingId = null
  document.getElementById('dex-title').value = ''
  document.getElementById('dex-content').value = ''
  document.getElementById('dex-save-btn').textContent = '＋ 新增'
  document.getElementById('dex-cancel-btn').style.display = 'none'
})

document.getElementById('dex-save-btn').addEventListener('click', async () => {
  const title = document.getElementById('dex-title').value.trim()
  if (!title) { document.getElementById('dex-title').focus(); return }
  const content = document.getElementById('dex-content').value.trim()
  if (editingId !== null) {
    await db.notes.update(editingId, { title, content, updatedAt: Date.now() })
    setStatus('ok', `已更新 #${editingId}`)
    editingId = null
    document.getElementById('dex-title').value = ''
    document.getElementById('dex-content').value = ''
    document.getElementById('dex-save-btn').textContent = '＋ 新增'
    document.getElementById('dex-cancel-btn').style.display = 'none'
  } else {
    const newId = await db.notes.add({ title, content, createdAt: Date.now() })
    setStatus('ok', `已新增 #${newId}`)
    document.getElementById('dex-title').value = ''
    document.getElementById('dex-content').value = ''
  }
  await renderList()
})

db.open()
  .then(() => {
    setStatus('ok', '已開啟 v1（共用 pwa-test-db）')
    return renderList()
  })
  .catch(err => setStatus('err', err.message || '開啟失敗'))
