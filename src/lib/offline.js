// ── Offline support library ───────────────────────────────────────────
// Caches the current grocery list and weekly plan to IndexedDB
// so it's accessible at the grocery store with no signal.
// Falls back to localStorage if IndexedDB unavailable.

const DB_NAME   = 'mealplan-offline'
const DB_VER    = 1
const STORE     = 'cache'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE)
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = ()  => reject(new Error('IndexedDB unavailable'))
  })
}

async function idbSet(key, value) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx   = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      store.put(JSON.stringify(value), key)
      tx.oncomplete = () => resolve(true)
      tx.onerror    = ()  => reject(false)
    })
  } catch {
    // Fallback to localStorage
    try { localStorage.setItem(`offline_${key}`, JSON.stringify(value)); return true } catch { return false }
  }
}

async function idbGet(key) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx    = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req   = store.get(key)
      req.onsuccess = () => {
        try { resolve(req.result ? JSON.parse(req.result) : null) } catch { resolve(null) }
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    try {
      const v = localStorage.getItem(`offline_${key}`)
      return v ? JSON.parse(v) : null
    } catch { return null }
  }
}

// ── Public API ────────────────────────────────────────────────────────

export async function saveForOffline(weeklyPlan, groceryMap, checkedItems = {}) {
  const payload = {
    weeklyPlan,
    groceryMap,
    checkedItems,
    savedAt: new Date().toISOString(),
  }
  return idbSet('grocery_offline', payload)
}

export async function loadOfflineData() {
  return idbGet('grocery_offline')
}

export async function saveOfflineChecked(checkedItems) {
  const existing = await loadOfflineData()
  if (!existing) return
  return idbSet('grocery_offline', { ...existing, checkedItems, updatedAt: new Date().toISOString() })
}

export async function clearOfflineData() {
  try {
    const db = await openDB()
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete('grocery_offline')
      tx.oncomplete = () => resolve(true)
    })
  } catch {
    localStorage.removeItem('offline_grocery')
    return true
  }
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
