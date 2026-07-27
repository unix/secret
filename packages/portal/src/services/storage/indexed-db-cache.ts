type IndexedDBCacheOptions = {
  readonly databaseName: string
  readonly maxEntries: number
  readonly namespace: string
}

type CacheRecord<T> = {
  readonly createdAt: number
  readonly key: string
  readonly namespace: string
  readonly updatedAt: number
  readonly value: T
}

const STORE_NAME = 'keyValueCache'
const NAMESPACE_UPDATED_AT_INDEX = 'namespaceUpdatedAt'
const DB_VERSION = 1

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const openDatabase = (databaseName: string) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!Reflect.has(globalThis, 'indexedDB')) {
      reject(new Error('IndexedDB is not available.'))
      return
    }

    const request = globalThis.indexedDB.open(databaseName, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction?.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'key' })

      if (store && !store.indexNames.contains(NAMESPACE_UPDATED_AT_INDEX)) {
        store.createIndex(NAMESPACE_UPDATED_AT_INDEX, ['namespace', 'updatedAt'])
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const namespaceRange = (namespace: string) => {
  return IDBKeyRange.bound([namespace, 0], [namespace, Number.MAX_SAFE_INTEGER])
}

const deleteOldest = ({
  deleteCount,
  index,
  namespace,
}: {
  readonly deleteCount: number
  readonly index: IDBIndex
  readonly namespace: string
}) =>
  new Promise<void>((resolve, reject) => {
    if (deleteCount <= 0) {
      resolve()
      return
    }

    let remaining = deleteCount
    const request = index.openCursor(namespaceRange(namespace))
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor || remaining <= 0) {
        resolve()
        return
      }

      const deleteRequest = cursor.delete()
      deleteRequest.onsuccess = () => {
        remaining -= 1
        cursor.continue()
      }
      deleteRequest.onerror = () => reject(deleteRequest.error)
    }
    request.onerror = () => reject(request.error)
  })

const create = <T>({
  databaseName,
  maxEntries,
  namespace,
}: IndexedDBCacheOptions) => {
  const fullKey = (key: string) => `${namespace}:${key}`

  const storeFor = async (mode: IDBTransactionMode) => {
    const db = await openDatabase(databaseName)
    const transaction = db.transaction(STORE_NAME, mode)

    return {
      db,
      store: transaction.objectStore(STORE_NAME),
    }
  }

  const prune = async () => {
    const { db, store } = await storeFor('readwrite')
    try {
      const index = store.index(NAMESPACE_UPDATED_AT_INDEX)
      const count = await requestToPromise(index.count(namespaceRange(namespace)))
      await deleteOldest({
        deleteCount: count - maxEntries,
        index,
        namespace,
      })
    } finally {
      db.close()
    }
  }

  const list = async (): Promise<readonly T[]> => {
    const { db, store } = await storeFor('readonly')
    try {
      const index = store.index(NAMESPACE_UPDATED_AT_INDEX)

      return await new Promise<readonly T[]>((resolve, reject) => {
        const records: T[] = []
        const request = index.openCursor(namespaceRange(namespace), 'prev')
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) {
            resolve(records)
            return
          }

          // IndexedDB cursor values are typed as any by the DOM API.
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          const record = cursor.value as CacheRecord<T>
          records.push(record.value)
          cursor.continue()
        }
        request.onerror = () => reject(request.error)
      })
    } finally {
      db.close()
    }
  }

  const get = async (key: string): Promise<T | null> => {
    const { db, store } = await storeFor('readonly')
    try {
      const record = await requestToPromise<CacheRecord<T> | undefined>(
        // IndexedDB get() exposes IDBRequest<any>; the store schema supplies the type.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        store.get(fullKey(key)),
      )

      return record?.value ?? null
    } finally {
      db.close()
    }
  }

  const remove = async (key: string): Promise<void> => {
    const { db, store } = await storeFor('readwrite')
    try {
      await requestToPromise(store.delete(fullKey(key)))
    } finally {
      db.close()
    }
  }

  const set = async (key: string, value: T): Promise<void> => {
    const now = Date.now()
    const keyPath = fullKey(key)
    const { db, store } = await storeFor('readwrite')
    try {
      const existing = await requestToPromise<CacheRecord<T> | undefined>(
        // IndexedDB get() exposes IDBRequest<any>; the store schema supplies the type.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        store.get(keyPath),
      )
      await requestToPromise(
        store.put({
          createdAt: existing?.createdAt ?? now,
          key: keyPath,
          namespace,
          updatedAt: now,
          value,
        } satisfies CacheRecord<T>),
      )
    } finally {
      db.close()
    }

    await prune()
  }

  return {
    get,
    list,
    remove,
    set,
  }
}

export const indexedDBCache = {
  create,
}
