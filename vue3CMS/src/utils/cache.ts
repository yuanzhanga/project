//storage的封装
enum StorageType {
  Local,
  Session,
}
class StorageCache {
  storage: Storage
  constructor(storage: StorageType) {
    this.storage = storage === StorageType.Local ? localStorage : sessionStorage
  }
  setCache(key: string, value: any): void {
    this.storage.setItem(key, JSON.stringify(value))
  }
  getCache(key: string): any {
    const cacheData = this.storage.getItem(key)
    return cacheData ? JSON.parse(cacheData) : null
  }
  removeCache(key: string): void {
    this.storage.removeItem(key)
  }
}
const localCache = new StorageCache(StorageType.Local)
const sessionCache = new StorageCache(StorageType.Session)
export { localCache, sessionCache }
