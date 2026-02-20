# PWA 測試站 — IndexedDB 兩種方案比較筆記

> 本專案用來測試 PWA 基本功能（Service Worker、Manifest、Geolocation）以及兩種 IndexedDB CRUD 方案的實際可用性。
> 開發環境：Vite 7 + Tailwind CSS v4，部署至 Cloudflare Pages。

---

## 啟動方式

```bash
pnpm dev      # 開發伺服器（http://localhost:5173）
pnpm build    # 打包至 dist/
pnpm preview  # 預覽 build 結果（http://localhost:4173）
```

---

## 兩種 IndexedDB 方案

### 1. 原生 IndexedDB

**套件**：無，瀏覽器內建 API。

**使用感受**：
- API 全部基於 callback / event，沒有原生 Promise 支援，需要自己包裝。
- 開啟連線、建立 schema、transaction、CRUD 各自獨立的步驟，程式碼冗長。
- 完全無抽象層，對 schema 版本升級（`onupgradeneeded`）需手動處理。
- 但也因此最輕量、沒有任何外部依賴，瀏覽器相容性最好。

**資料庫名稱**：`pwa-test-db`

**適合情境**：簡單需求、不想引入依賴、或作為其他方案的底層理解基礎。

---

### 2. Dexie.js

**套件**：`dexie@4.3.0`

**使用感受**：
- Promise-based API，直接 `await db.table.add()`，比原生 IDB 乾淨許多。
- Schema 以字串描述索引（`'++id, createdAt'`），簡潔直觀。
- `++id` 代表 autoIncrement keyPath；列出的欄位都會建立 index。
- **與原生 IDB 完全互通**：開啟相同資料庫名稱、相同版本，就能讀寫同一份資料。
- 不需要 Worker，不需要任何特殊 HTTP 標頭，直接 import 即用。
- 支援 liveQuery（響應式查詢）、transaction、複合索引等進階功能。

**資料庫名稱**：`pwa-test-db`（與原生 IDB 共用）

**Vite 整合**：
```js
import Dexie from 'dexie'

const db = new Dexie('pwa-test-db')
db.version(1).stores({ notes: '++id, createdAt' })

// CRUD
await db.notes.add({ title, content, createdAt: Date.now() })
await db.notes.orderBy('id').toArray()
await db.notes.update(id, { title, content, updatedAt: Date.now() })
await db.notes.delete(id)
```

**版本相容性注意**：
- 若資料庫已由原生 IDB 建立（v1 + `notes` store + `createdAt` index），Dexie 開啟同一個 DB 時不會重新執行 `onupgradeneeded`，直接沿用現有結構。
- 若是全新建立，Dexie 會依 schema 定義建立 store 與 index，結果與原生 IDB 的 `onupgradeneeded` 等效。

**適合情境**：需要乾淨的 Promise API、想與原生 IDB 共用資料、或需要 liveQuery 等進階功能的專案。

---

## 兩方案比較

| | 原生 IndexedDB | Dexie.js |
|---|---|---|
| 外部依賴 | 無 | `dexie` |
| 查詢語法 | Event callback | Promise-based 方法鏈 |
| 需要 Worker | 否 | 否 |
| 需要 COOP/COEP | 否 | 否 |
| 瀏覽器相容性 | 最廣 | 廣（IE 支援需另設定） |
| 資料與原生 IDB 互通 | — | **是（同一個 DB）** |
| 維護狀態 | — | 活躍 |

---

## 關於兩種方案互通

兩個卡片使用**同一個 IDB 資料庫**（`pwa-test-db`）和同一個 `notes` object store。在原生 IDB 卡片新增的記錄，重新整理後可在 Dexie 卡片看到，反之亦然。Dexie 本質上只是原生 IDB 的 Promise 包裝層，不改變底層儲存格式。

---

## COOP / COEP 標頭設定

（保留供參考，目前專案不再強制依賴這些標頭）

**開發環境**（`vite.config.js`）：
```js
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
  }
}
```

**Cloudflare Pages 生產環境**（`public/_headers`）：
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```
