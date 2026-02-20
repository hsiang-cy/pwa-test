import initSqlJs from '@jlongster/sql.js'
import { SQLiteFS } from 'absurd-sql'
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend'
import sqlWasmUrl from '@jlongster/sql.js/dist/sql-wasm.wasm?url'

let db = null
let initPromise = null

async function initDB() {
  const SQL = await initSqlJs({
    locateFile: (filename) => filename.endsWith('.wasm') ? sqlWasmUrl : filename,
  })

  const sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend())
  SQL.register_for_idb(sqlFS)

  SQL.FS.mkdir('/sql')
  SQL.FS.mount(sqlFS, {}, '/sql')

  const path = '/sql/notes.db'

  // Fallback: pre-open the file when SharedArrayBuffer is unavailable
  if (typeof SharedArrayBuffer === 'undefined') {
    const stream = SQL.FS.open(path, 'a+')
    await stream.node.contents.readIfFallback()
    SQL.FS.close(stream)
  }

  db = new SQL.Database(path, { filename: true })
  db.run('PRAGMA journal_mode=MEMORY;')
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    )
  `)
}

self.onmessage = async ({ data: { id, action, payload } }) => {
  try {
    if (!initPromise) initPromise = initDB()
    await initPromise

    let result
    switch (action) {
      case 'ping':
        result = { ok: true }
        break
      case 'add': {
        db.run(
          'INSERT INTO notes (title, content, created_at) VALUES (?, ?, ?)',
          [payload.title, payload.content || '', Date.now()]
        )
        const rows = db.exec('SELECT last_insert_rowid() as id')
        result = { id: rows[0].values[0][0] }
        break
      }
      case 'getAll': {
        const rows = db.exec('SELECT id, title, content, created_at FROM notes ORDER BY id DESC')
        result = rows.length
          ? rows[0].values.map(([id, title, content, created_at]) => ({ id, title, content, created_at }))
          : []
        break
      }
      case 'update':
        db.run('UPDATE notes SET title=?, content=? WHERE id=?', [payload.title, payload.content || '', payload.id])
        result = { ok: true }
        break
      case 'delete':
        db.run('DELETE FROM notes WHERE id=?', [payload.id])
        result = { ok: true }
        break
      default:
        result = { error: 'unknown action' }
    }
    self.postMessage({ id, result })
  } catch (err) {
    self.postMessage({ id, error: err.message })
  }
}
