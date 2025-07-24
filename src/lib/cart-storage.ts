// Cart item type
export type CartItem = {
  id: number
  name: string
  price: number
  originalPrice: number
  image: string
  rating: number
  reviews: number
  category: string
  quantity: number
}

// IndexedDB configuration
const DB_NAME = 'neo2hand_db'
const DB_VERSION = 1
const CART_STORE = 'cart'
const FAVORITES_STORE = 'favorites'

class CartStorage {
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

        // Create cart store
        if (!db.objectStoreNames.contains(CART_STORE)) {
          db.createObjectStore(CART_STORE, { keyPath: 'id' })
        }

        // Create favorites store
        if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
          db.createObjectStore(FAVORITES_STORE, { keyPath: 'id' })
        }
      }
    })
  }

  // Save cart to localStorage
  saveCartToLocalStorage(cartItems: CartItem[]): void {
    try {
      localStorage.setItem('neo2hand_cart', JSON.stringify(cartItems))
    } catch (error) {
      console.error('Error saving cart to localStorage:', error)
    }
  }

  // Load cart from localStorage
  loadCartFromLocalStorage(): CartItem[] {
    try {
      const savedCart = localStorage.getItem('neo2hand_cart')
      return savedCart ? JSON.parse(savedCart) : []
    } catch (error) {
      console.error('Error loading cart from localStorage:', error)
      return []
    }
  }

  // Save cart to IndexedDB
  async saveCartToIndexedDB(cartItems: CartItem[]): Promise<void> {
    if (!this.db) await this.initDB()
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CART_STORE], 'readwrite')
      const store = transaction.objectStore(CART_STORE)

      // Clear existing cart items
      const clearRequest = store.clear()
      
      clearRequest.onsuccess = () => {
        // Add new cart items
        cartItems.forEach(item => {
          store.add(item)
        })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Load cart from IndexedDB
  async loadCartFromIndexedDB(): Promise<CartItem[]> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CART_STORE], 'readonly')
      const store = transaction.objectStore(CART_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // Save favorites to localStorage
  saveFavoritesToLocalStorage(favorites: Omit<CartItem, 'quantity'>[]): void {
    try {
      localStorage.setItem('neo2hand_favorites', JSON.stringify(favorites))
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error)
    }
  }

  // Load favorites from localStorage
  loadFavoritesFromLocalStorage(): Omit<CartItem, 'quantity'>[] {
    try {
      const savedFavorites = localStorage.getItem('neo2hand_favorites')
      return savedFavorites ? JSON.parse(savedFavorites) : []
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error)
      return []
    }
  }

  // Save favorites to IndexedDB
  async saveFavoritesToIndexedDB(favorites: Omit<CartItem, 'quantity'>[]): Promise<void> {
    if (!this.db) await this.initDB()
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([FAVORITES_STORE], 'readwrite')
      const store = transaction.objectStore(FAVORITES_STORE)

      // Clear existing favorites
      const clearRequest = store.clear()
      
      clearRequest.onsuccess = () => {
        // Add new favorites
        favorites.forEach(item => {
          store.add(item)
        })
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // Load favorites from IndexedDB
  async loadFavoritesFromIndexedDB(): Promise<Omit<CartItem, 'quantity'>[]> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([FAVORITES_STORE], 'readonly')
      const store = transaction.objectStore(FAVORITES_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // Sync data: try IndexedDB first, fallback to localStorage
  async loadCart(): Promise<CartItem[]> {
    try {
      const indexedDBCart = await this.loadCartFromIndexedDB()
      if (indexedDBCart.length > 0) {
        return indexedDBCart
      }
    } catch (error) {
      console.warn('IndexedDB not available, using localStorage:', error)
    }
    
    return this.loadCartFromLocalStorage()
  }

  async saveCart(cartItems: CartItem[]): Promise<void> {
    // Always save to localStorage for immediate access
    this.saveCartToLocalStorage(cartItems)
    
    // Try to save to IndexedDB for better storage
    try {
      await this.saveCartToIndexedDB(cartItems)
    } catch (error) {
      console.warn('Failed to save to IndexedDB:', error)
    }
  }

  async loadFavorites(): Promise<Omit<CartItem, 'quantity'>[]> {
    try {
      const indexedDBFavorites = await this.loadFavoritesFromIndexedDB()
      if (indexedDBFavorites.length > 0) {
        return indexedDBFavorites
      }
    } catch (error) {
      console.warn('IndexedDB not available, using localStorage:', error)
    }
    
    return this.loadFavoritesFromLocalStorage()
  }

  async saveFavorites(favorites: Omit<CartItem, 'quantity'>[]): Promise<void> {
    // Always save to localStorage for immediate access
    this.saveFavoritesToLocalStorage(favorites)
    
    // Try to save to IndexedDB for better storage
    try {
      await this.saveFavoritesToIndexedDB(favorites)
    } catch (error) {
      console.warn('Failed to save favorites to IndexedDB:', error)
    }
  }
}

export const cartStorage = new CartStorage()