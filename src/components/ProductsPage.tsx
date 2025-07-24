import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Edit, Trash2, Save, X } from "lucide-react"
import { supabase, type Database } from "@/lib/supabase"
import ImageUpload from "./ImageUpload"

type Product = Database['public']['Tables']['products']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface FormData {
  name: string
  price: string
  originalPrice: string
  images: string[]
  categoryId: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    price: "",
    originalPrice: "",
    images: [],
    categoryId: ""
  })

  // Load data
  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProducts(data)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (!error && data) {
      setCategories(data)
    }
  }, [])

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])

  // Form handlers
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      price: "",
      originalPrice: "",
      images: [],
      categoryId: ""
    })
  }, [])

  const handleInputChange = useCallback((field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCreate = useCallback(async () => {
    if (!formData.name.trim() || !formData.price) return

    // Clean and validate price
    const cleanPrice = formData.price.replace(/[^\d.]/g, '') // Remove non-numeric chars
    const price = parseFloat(cleanPrice)
    const originalPrice = formData.originalPrice ? parseFloat(formData.originalPrice.replace(/[^\d.]/g, '')) : null

    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price')
      return
    }

    if (price >= 100000000) { // 100 million limit
      alert('Price must be less than 100,000,000')
      return
    }

    const { error } = await supabase
      .from('products')
      .insert({
        name: formData.name.trim(),
        price: price,
        original_price: originalPrice,
        images: formData.images.length > 0 ? formData.images : null,
        category_id: formData.categoryId || null
      })

    if (error) {
      console.error('Error creating product:', error)
      alert('Error creating product: ' + error.message)
      return
    }

    resetForm()
    setIsCreating(false)
    loadProducts()
  }, [formData, resetForm, loadProducts])

  const handleEdit = useCallback(async () => {
    if (!editingId || !formData.name.trim() || !formData.price) return

    // Clean and validate price
    const cleanPrice = formData.price.replace(/[^\d.]/g, '')
    const price = parseFloat(cleanPrice)
    const originalPrice = formData.originalPrice ? parseFloat(formData.originalPrice.replace(/[^\d.]/g, '')) : null

    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price')
      return
    }

    if (price >= 100000000) {
      alert('Price must be less than 100,000,000')
      return
    }

    const { error } = await supabase
      .from('products')
      .update({
        name: formData.name.trim(),
        price: price,
        original_price: originalPrice,
        images: formData.images.length > 0 ? formData.images : null,
        category_id: formData.categoryId || null
      })
      .eq('id', editingId)

    if (error) {
      console.error('Error updating product:', error)
      alert('Error updating product: ' + error.message)
      return
    }

    setEditingId(null)
    resetForm()
    loadProducts()
  }, [editingId, formData, resetForm, loadProducts])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this product?')) return

    const product = products.find(p => p.id === id)
    
    // Delete images from storage
    if (product?.images) {
      for (const imageUrl of product.images) {
        const filePath = imageUrl.split('/product-images/')[1]
        if (filePath) {
          await supabase.storage.from('product-images').remove([filePath])
        }
      }
    }

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) loadProducts()
  }, [products, loadProducts])

  const startEdit = useCallback((product: Product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      originalPrice: product.original_price?.toString() || "",
      images: product.images || [],
      categoryId: product.category_id || ""
    })
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    resetForm()
  }, [resetForm])

  const cancelCreate = useCallback(() => {
    setIsCreating(false)
    resetForm()
  }, [resetForm])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Button 
          onClick={() => setIsCreating(true)} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card className="mb-6 border-blue-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Product</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Product name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Price"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Original price (optional)"
                  value={formData.originalPrice}
                  onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>
                <ImageUpload
                  images={formData.images}
                  onImagesChange={(images) => handleInputChange('images', images)}
                  maxImages={5}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  Create Product
                </Button>
                <Button onClick={cancelCreate} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {editingId && (
        <Card className="mb-6 border-orange-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Edit Product</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Product name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Price"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Original price (optional)"
                  value={formData.originalPrice}
                  onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>
                <ImageUpload
                  images={formData.images}
                  onImagesChange={(images) => handleInputChange('images', images)}
                  maxImages={5}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleEdit} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="h-4 w-4 mr-2" />
                  Update Product
                </Button>
                <Button onClick={cancelEdit} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
              <p className="text-gray-500">Create your first product to get started.</p>
            </CardContent>
          </Card>
        ) : (
          products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-green-600">
                        {product.price.toLocaleString("vi-VN")} ₫
                      </span>
                      {product.original_price && (
                        <span className="text-lg text-gray-500 line-through">
                          {product.original_price.toLocaleString("vi-VN")} ₫
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-3">
                      Category: {(product as any).categories?.name || 'No category'}
                    </p>

                    {product.images && product.images.length > 0 && (
                      <div className="flex gap-2">
                        {product.images.slice(0, 4).map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt=""
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        ))}
                        {product.images.length > 4 && (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-sm font-medium text-gray-600">
                            +{product.images.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button 
                      onClick={() => startEdit(product)} 
                      variant="outline" 
                      size="sm"
                      disabled={editingId === product.id}
                      className={editingId === product.id ? "bg-orange-50 border-orange-200" : ""}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => handleDelete(product.id)} 
                      variant="destructive" 
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
