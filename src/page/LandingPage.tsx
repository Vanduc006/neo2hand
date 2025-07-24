import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, 
  // Star, 
  Menu,
  X,
  Heart,
  Search,
  // User,
  // ChevronDown
} from "lucide-react"
import { cartStorage, type CartItem } from "@/lib/cart-storage"

// Product type definition
type Product = {
  id: number
  name: string
  price: number
  originalPrice: number
  image: string
  rating: number
  reviews: number
  category: string
}

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  // const [isFavoritesOpen, setIsFavoritesOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [favoriteItems, setFavoriteItems] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  // setActiveCategory('All')
  const [isLoading, setIsLoading] = useState(true)

  // Load data from storage on component mount
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        setIsLoading(true)
        
        // Load cart and favorites from storage
        const [storedCart, storedFavorites] = await Promise.all([
          cartStorage.loadCart(),
          cartStorage.loadFavorites()
        ])
        
        setCartItems(storedCart)
        setFavoriteItems(storedFavorites)
      } catch (error) {
        console.error('Error loading stored data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStoredData()
  }, [])

  // Save cart to storage whenever cartItems changes
  useEffect(() => {
    if (!isLoading && cartItems.length >= 0) {
      cartStorage.saveCart(cartItems)
    }
  }, [cartItems, isLoading])

  // Save favorites to storage whenever favoriteItems changes
  useEffect(() => {
    if (!isLoading && favoriteItems.length >= 0) {
      cartStorage.saveFavorites(favoriteItems)
    }
  }, [favoriteItems, isLoading])

  // Product data
  const products: Product[] = [
    {
      id: 1,
      name: "Ao tung tung sahuar",
      price: 89000,
      originalPrice: 129000,
      image: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400",
      rating: 4.8,
      reviews: 124,
      category: "Clothing"
    },
    {
      id: 2,
      name: "Trarale olala Bag",
      price: 149000,
      originalPrice: 199000,
      image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
      rating: 4.9,
      reviews: 89,
      category: "Accessories"
    },

  ]

  // Get all unique categories
  // const categories = ["All", ...new Set(products.map(p => p.category))]

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === "All" || product.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Add to cart function
  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id)
      
      if (existingItem) {
        // Increase quantity if already in cart
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      } else {
        // Add new item with quantity 1
        return [...prev, { ...product, quantity: 1 }]
      }
    })
    
    // Open cart when adding items
    setIsCartOpen(true)
  }

  // Remove from cart
  const removeFromCart = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.id !== productId))
  }

  // Update quantity
  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return
    
    setCartItems(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    )
  }

  // Calculate cart totals
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900"
              onClick={() => setActiveCategory('All')}
              >Neo2Hand</h1>
            </div>
            
            {/* Search bar - desktop */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(!isCartOpen)}>
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
              </Button>
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              {/* <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button> */}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsCartOpen(!isCartOpen)}
                className="mr-2"
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
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-3">
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {/* <div className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm ₫{
                      activeCategory === category 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div> */}
            </div>
          </div>
        )}
        
        {/* Category navigation - desktop */}
        {/* <div className="hidden md:block border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-8 h-12">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`text-sm ₫{
                    activeCategory === category 
                      ? 'font-medium text-blue-600 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div> */}
      </header>

      {/* Shopping Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => setIsCartOpen(false)}
            ></div>
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-md">
                <div className="h-full flex flex-col bg-white shadow-xl">
                  <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-medium text-gray-900">Shopping cart</h2>
                      <button
                        type="button"
                        className="ml-3 h-7 flex items-center justify-center"
                        onClick={() => setIsCartOpen(false)}
                      >
                        <X className="h-6 w-6 text-gray-400" />
                      </button>
                    </div>

                    <div className="mt-8">
                      {cartItems.length === 0 ? (
                        <div className="text-center py-12">
                          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
                          <p className="mt-1 text-sm text-gray-500">Start shopping to add items to your cart</p>
                        </div>
                      ) : (
                        <div className="flow-root">
                          <ul className="-my-6 divide-y divide-gray-200">
                            {cartItems.map((item) => (
                              <li key={item.id} className="py-6 flex">
                                <div className="flex-shrink-0 w-24 h-24 border border-gray-200 rounded-md overflow-hidden">
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="ml-4 flex-1 flex flex-col">
                                  <div>
                                    <div className="flex justify-between text-base font-medium text-gray-900">
                                      <h3>{item.name}</h3>
                                      <p className="ml-4">{item.price.toLocaleString("vi-VN")} ₫</p>
                                    </div>
                                  </div>
                                  <div className="flex-1 flex items-end justify-between text-sm">
                                    <div className="flex items-center border rounded">
                                      <button 
                                        className="px-2 py-1 border-r"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      >
                                        -
                                      </button>
                                      <span className="px-4 py-1">{item.quantity}</span>
                                      <button 
                                        className="px-2 py-1 border-l"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      >
                                        +
                                      </button>
                                    </div>

                                    <button 
                                      type="button" 
                                      className="font-medium text-blue-600 hover:text-blue-500"
                                      onClick={() => removeFromCart(item.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                    <div className="flex justify-between text-base font-medium text-gray-900">
                      <p>Subtotal</p>
                      {/* <p>{cartTotal.toLocaleString("vi-VN")} ₫</p> */}
                      <p>{Number(cartTotal).toLocaleString("vi-VN")} ₫</p>

                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout.</p>
                    <div className="mt-6">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        Checkout
                      </Button>
                    </div>
                    <div className="mt-6 flex justify-center text-sm text-center text-gray-500">
                      <p>
                        or{" "}
                        <button
                          type="button"
                          className="text-blue-600 font-medium hover:text-blue-500"
                          onClick={() => setIsCartOpen(false)}
                        >
                          Continue Shopping<span aria-hidden="true"> &rarr;</span>
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Products Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeCategory === "All" ? "Tat ca san pham" : activeCategory}
              </h2>
              {/* <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Sort by:</span>
                <div className="relative">
                  <select className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>Newest</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Best Rating</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div> */}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="absolute top-4 right-4 bg-white/80 hover:bg-white"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      {product.originalPrice > product.price && (
                        <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                        {/* <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-600 ml-1">{product.rating} ({product.reviews})</span>
                        </div> */}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-gray-900">{product.price.toLocaleString("vi-VN")} ₫</span>
                          {product.originalPrice > product.price && (
                            <span className="text-sm text-gray-500 line-through">{product.originalPrice.toLocaleString("vi-VN")} ₫</span>
                          )}
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => addToCart(product)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* <h3 className="text-lg font-medium text-gray-900 mb-2">Neo2Hand</h3>
            <p className="text-gray-500 text-sm mb-6">Your trusted source for quality second-hand products</p> */}
            <p className="text-gray-400 text-xs">&copy; 2024 Neo2Hand. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
