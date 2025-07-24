import { type Database } from "@/lib/supabase"

type Supporter = Database['public']['Tables']['supporters']['Row']

// IndexedDB configuration
const DB_NAME = 'neo2hand_support_db'
const DB_VERSION = 1
const SUPPORTER_STORE = 'current_supporter'

export interface SupporterSession {
  supporter: Supporter
  loginTime: string
  lastActivity: string
  isActive: boolean
}

class SupporterStorage {
  private db: IDBDatabase | null = null

  // Initialize IndexedDB
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create supporter store
        if (!db.objectStoreNames.contains(SUPPORTER_STORE)) {
          db.createObjectStore(SUPPORTER_STORE, { keyPath: 'id' })
        }
      }
    })
  }

  // Save supporter to localStorage
  saveSupporterToLocalStorage(session: SupporterSession): void {
    try {
      localStorage.setItem('neo2hand_current_supporter', JSON.stringify(session))
    } catch (error) {
      console.error('Error saving supporter to localStorage:', error)
    }
  }

  // Load supporter from localStorage
  loadSupporterFromLocalStorage(): SupporterSession | null {
    try {
      const savedSession = localStorage.getItem('neo2hand_current_supporter')
      return savedSession ? JSON.parse(savedSession) : null
    } catch (error) {
      console.error('Error loading supporter from localStorage:', error)
      return null
    }
  }

  // Save supporter to IndexedDB
  async saveSupporterToIndexedDB(session: SupporterSession): Promise<void> {
    if (!this.db) await this.initDB()
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([SUPPORTER_STORE], 'readwrite')
      const store = transaction.objectStore(SUPPORTER_STORE)

      // Clear existing session and add new one
      const clearRequest = store.clear()
      
      clearRequest.onsuccess = () => {
        store.add({ ...session, id: 'current' })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Load supporter from IndexedDB
  async loadSupporterFromIndexedDB(): Promise<SupporterSession | null> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([SUPPORTER_STORE], 'readonly')
      const store = transaction.objectStore(SUPPORTER_STORE)
      const request = store.get('current')

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // Update last activity
  updateActivity(): void {
    try {
      const session = this.loadSupporterFromLocalStorage()
      if (session) {
        const updatedSession = {
          ...session,
          lastActivity: new Date().toISOString()
        }
        this.saveSupporterToLocalStorage(updatedSession)
        this.saveSupporterToIndexedDB(updatedSession).catch(console.error)
      }
    } catch (error) {
      console.error('Failed to update activity:', error)
    }
  }

  // Check if session is expired (older than 8 hours)
  isSessionExpired(session: SupporterSession): boolean {
    try {
      const lastActivity = new Date(session.lastActivity).getTime()
      const now = new Date().getTime()
      const hoursDiff = (now - lastActivity) / (1000 * 60 * 60)

      return hoursDiff > 8 // Expire after 8 hours
    } catch {
      return true
    }
  }

  // Get current supporter session
  async getCurrentSupporter(): Promise<Supporter | null> {
    try {
      // Try IndexedDB first
      let session = await this.loadSupporterFromIndexedDB()
      
      // Fallback to localStorage
      if (!session) {
        session = this.loadSupporterFromLocalStorage()
      }

      if (!session || this.isSessionExpired(session) || !session.isActive) {
        return null
      }

      return session.supporter
    } catch (error) {
      console.warn('Error loading supporter session:', error)
      return null
    }
  }

  // Save supporter session
  async saveSupporter(supporter: Supporter): Promise<void> {
    const session: SupporterSession = {
      supporter,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true
    }

    // Save to both storages
    this.saveSupporterToLocalStorage(session)
    
    try {
      await this.saveSupporterToIndexedDB(session)
    } catch (error) {
      console.warn('Failed to save to IndexedDB:', error)
    }
  }

  // Clear supporter session
  async clearSupporter(): Promise<void> {
    try {
      // Clear localStorage
      localStorage.removeItem('neo2hand_current_supporter')
      
      // Clear IndexedDB
      if (!this.db) await this.initDB()
      
      if (this.db) {
        const transaction = this.db.transaction([SUPPORTER_STORE], 'readwrite')
        const store = transaction.objectStore(SUPPORTER_STORE)
        store.clear()
      }
    } catch (error) {
      console.error('Failed to clear supporter session:', error)
    }
  }

  // Mark session as inactive (for logout)
  async markInactive(): Promise<void> {
    try {
      const session = this.loadSupporterFromLocalStorage()
      if (session) {
        const updatedSession = {
          ...session,
          isActive: false,
          lastActivity: new Date().toISOString()
        }
        this.saveSupporterToLocalStorage(updatedSession)
        await this.saveSupporterToIndexedDB(updatedSession)
      }
    } catch (error) {
      console.error('Failed to mark session inactive:', error)
    }
  }
}

export const supporterStorage = new SupporterStorage()