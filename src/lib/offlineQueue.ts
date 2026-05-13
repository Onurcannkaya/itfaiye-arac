// ============================================================
// Sivas İtfaiye — IndexedDB Offline Queue
// Cihazda veri saklama + online olunca Background Sync
// ============================================================

const DB_NAME = 'SivasItfaiyeOffline'
const DB_VERSION = 1
const STORE_NAME = 'offlineQueue'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export interface QueueItem {
  id?: number
  url: string
  method: string
  headers: Record<string, string>
  body: string
  timestamp: number
  description: string
}

/**
 * Offline queue'ya yeni bir istek ekle
 * Internet yoksa IndexedDB'ye kaydeder, varsa direkt gönderir
 */
export async function addToQueue(item: Omit<QueueItem, 'id' | 'timestamp'>): Promise<boolean> {
  // Online ise direkt gönder
  if (navigator.onLine) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      })
      if (response.ok) return true
    } catch {
      // Network error — fall through to queue
    }
  }

  // Offline veya network hatası — IndexedDB'ye kaydet
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    store.add({
      ...item,
      timestamp: Date.now(),
    })

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    // Background Sync talep et
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'QUEUE_SYNC' })
    }

    return false // Queued, not sent
  } catch (err) {
    console.error('[OfflineQueue] Kaydetme hatası:', err)
    return false
  }
}

/**
 * Queue'daki tüm bekleyen itemları getir
 */
export async function getQueue(): Promise<QueueItem[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return []
  }
}

/**
 * Queue'daki belirli bir itemi sil
 */
export async function removeFromQueue(id: number): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
  } catch (err) {
    console.error('[OfflineQueue] Silme hatası:', err)
  }
}

/**
 * Tüm queue'yu temizle
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
  } catch (err) {
    console.error('[OfflineQueue] Temizleme hatası:', err)
  }
}

/**
 * Queue'daki item sayısını getir
 */
export async function getQueueCount(): Promise<number> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return 0
  }
}

/**
 * Online olunca otomatik sync başlat
 */
export function initOnlineSync() {
  if (typeof window === 'undefined') return

  window.addEventListener('online', async () => {
    console.log('[OfflineQueue] Online — senkronizasyon başlatılıyor...')
    
    const items = await getQueue()
    if (items.length === 0) return

    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        })

        if (response.ok && item.id) {
          await removeFromQueue(item.id)
          console.log(`[OfflineQueue] Synced: ${item.description}`)
        }
      } catch {
        console.log(`[OfflineQueue] Tekrar denenecek: ${item.description}`)
        break // Stop on first failure
      }
    }
  })
}
