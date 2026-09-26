import type { MediaItem } from "@/lib/media/types"

const DB_NAME = "may-beauty-media"
const STORE_NAME = "media"
const DB_VERSION = 1

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Không thể mở cache media"))
  })
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, mode)
    const request = action(tx.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Lỗi cache media"))
    tx.oncomplete = () => database.close()
    tx.onerror = () => reject(tx.error ?? new Error("Lỗi giao dịch cache media"))
  })
}

export async function listDemoMedia() {
  const items = await transaction<MediaItem[]>("readonly", (store) => store.getAll())
  return items.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function saveDemoMedia(item: MediaItem) {
  await transaction<IDBValidKey>("readwrite", (store) => store.put(item))
  return item
}

export async function deleteDemoMedia(id: string) {
  await transaction<undefined>("readwrite", (store) => store.delete(id) as IDBRequest<undefined>)
}

export async function seedDemoMedia(items: MediaItem[]) {
  const existing = await listDemoMedia()
  if (existing.length > 0) return existing
  await Promise.all(items.map(saveDemoMedia))
  return listDemoMedia()
}
