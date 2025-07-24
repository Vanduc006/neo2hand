import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, 
  Menu,
  X,
  Heart,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { supabase } from "@/lib/supabase"

// Simple types
interface Product {
  id: string
  name: string
  price: number
  original_price?: number
  images: string[]
  category_id: string
  categories?: {
    name: string
  }
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

const LandingPage = () => {
  // States
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showCart, setShowCart] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [imageIndex, setImageIndex] = useState<Record<string, number>>({})

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get products
      const { data: productsData } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false })

      if (productsData) {
        setProducts(productsData)
        
        // Set categories
        const cats = ["All", ...new Set(productsData.map(p => p.categories?.name).filter(Boolean))]
        setCategories(cats)

        // Initialize image indexes
        const indexes: Record<string, number> = {}
        productsData.forEach(p => indexes[p.id] = 0)
        setImageIndex(indexes)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === "All" || product.categories?.name === category
    return matchSearch && matchCategory
  })

  // Cart functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images[0] || ''
      }]
    })
    setShowCart(true)
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ))
  }

  // Favorite functions
  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(fav => fav !== id)
        : [...prev, id]
    )
  }

  // Image navigation
  const nextImage = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product || product.images.length <= 1) return
    
    setImageIndex(prev => ({
      ...prev,
      [productId]: (prev[productId] + 1) % product.images.length
    }))
  }

  const prevImage = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product || product.images.length <= 1) return
    
    setImageIndex(prev => ({
      ...prev,
      [productId]: prev[productId] === 0 ? product.images.length - 1 : prev[productId] - 1
    }))
  }

  // Calculations
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <h1 
              className="text-xl font-bold cursor-pointer"
              onClick={() => setCategory("All")}
            >
              Neo2Hand
            </h1>

            {/* Search - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowCart(true)}
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
              </Button>

              <Button 
                variant="ghost" 
                size="icon"
                className="md:hidden"
                onClick={() => setShowMenu(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Categories - Desktop */}
          <div className="hidden md:flex space-x-6 py-3 border-t">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-sm ${
                  category === cat 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMenu(false)} />
          <div className="fixed top-0 left-0 w-64 h-full bg-white p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Menu</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMenu(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>

            {/* Mobile Categories */}
            <div className="space-y-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat)
                    setShowMenu(false)
                  }}
                  className={`block w-full text-left px-3 py-2 rounded ${
                    category === cat 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="fixed top-0 right-0 w-80 h-full bg-white flex flex-col" data-cart-sidebar>
            {/* Cart Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold">Cart ({cartCount})</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex space-x-3">
                      <img 
                        src={item.image || '/placeholder.svg'} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{item.name}</h3>
                        <p className="text-blue-600 font-semibold">
                          {item.price.toLocaleString()} ₫
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border rounded">
                            <button 
                              className="px-2 py-1 hover:bg-gray-50"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              -
                            </button>
                            <span className="px-3 py-1">{item.quantity}</span>
                            <button 
                              className="px-2 py-1 hover:bg-gray-50"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          <button 
                            className="text-red-500 text-sm"
                            onClick={() => removeFromCart(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg">
                    {cartTotal.toLocaleString()} ₫
                  </span>
                </div>
                <Button className="w-full bg-pink-600 py-5 hover:bg-blue-700">
                  Checkout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">
            {category === "All" ? "All Products" : category}
          </h2>
          <p className="text-gray-600">{filteredProducts.length} products found</p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
              const currentIndex = imageIndex[product.id] || 0
              const hasMultipleImages = product.images.length > 1
              const isFavorite = favorites.includes(product.id)

              return (
                <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {/* Product Image */}
                    <div className="overflow-hidden rounded-t-lg">
                      {product.images.length > 0 ? (
                        <img 
                          src={product.images[currentIndex]} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Image Navigation */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={() => prevImage(product.id)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => nextImage(product.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>

                        {/* Dots */}
                        <div className="bg-gray-500 p-2 rounded-md absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                          {product.images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setImageIndex(prev => ({ ...prev, [product.id]: index }))}
                              className={`w-2 h-2 rounded-full ${
                                index === currentIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Favorite Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute top-2 right-2 bg-white/80 hover:bg-white ${
                        isFavorite ? 'text-red-500' : ''
                      }`}
                      onClick={() => toggleFavorite(product.id)}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </Button>

                    {/* Discount Badge */}
                    {product.original_price && product.original_price > product.price && (
                      <Badge className="absolute top-2 left-2 bg-red-500">
                        -{Math.round((1 - product.price / product.original_price) * 100)}%
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2">
                      {product.categories?.name || 'Uncategorized'}
                    </Badge>
                    
                    <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-lg">
                          {product.price.toLocaleString()} ₫
                        </span>
                        {product.original_price && product.original_price > product.price && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            {product.original_price.toLocaleString()} ₫
                          </span>
                        )}
                      </div>
                      
                      <Button 
                        size="sm"
                        onClick={() => addToCart(product)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-500">&copy; 2024 Neo2Hand. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
