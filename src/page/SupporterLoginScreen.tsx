"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Circle, User, Clock, RefreshCw } from "lucide-react"
import { supabase, type Database } from "@/lib/supabase"
import { supporterStorage } from "@/lib/supporter-storage"

type Supporter = Database['public']['Tables']['supporters']['Row']

interface SupporterLoginScreenProps {
  onSupporterSelect: (supporter: Supporter) => void
}

export default function SupporterLoginScreen({ onSupporterSelect }: SupporterLoginScreenProps) {
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSession, setLastSession] = useState<string>("")

  useEffect(() => {
    loadSupporters()
    checkLastSession()
  }, [])

  const checkLastSession = () => {
    const session = supporterStorage.loadSupporterFromLocalStorage()
    if (session && !supporterStorage.isSessionExpired(session)) {
      setLastSession(`Last login: ${new Date(session.loginTime).toLocaleString()}`)
    }
  }

  const loadSupporters = async () => {
    const { data, error } = await supabase
      .from('supporters')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading supporters:', error)
    } else {
      setSupporters(data || [])
    }
    setLoading(false)
  }

  const handleSupporterSelect = async (supporter: Supporter) => {
    // Update supporter status to online
    const { error } = await supabase
      .from('supporters')
      .update({ status: 'online' })
      .eq('id', supporter.id)

    if (!error) {
      const updatedSupporter = { ...supporter, status: 'online' as const }
      
      // Save to storage
      await supporterStorage.saveSupporter(updatedSupporter)
      
      onSupporterSelect(updatedSupporter)
    }
  }

  const clearStoredSession = async () => {
    await supporterStorage.clearSupporter()
    setLastSession("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supporters...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <User className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Support Dashboard</h1>
          <p className="text-gray-600">Ban la ai ?</p>
          
          {lastSession && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center text-sm text-blue-700">
                <Clock className="h-4 w-4 mr-2" />
                {lastSession}
              </div>
              <button
                onClick={clearStoredSession}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear session data
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supporters.map((supporter) => (
            <button
              key={supporter.id}
              onClick={() => handleSupporterSelect(supporter)}
              className="flex items-center p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors text-left"
            >
              <div className="relative mr-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={supporter.avatar || "/placeholder.svg"} alt={supporter.name} />
                  <AvatarFallback>
                    {supporter.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <Circle
                  className={`absolute -bottom-1 -right-1 h-4 w-4 fill-current ${
                    supporter.status === 'online' ? 'text-green-500' :
                    supporter.status === 'busy' ? 'text-yellow-500' : 'text-gray-400'
                  }`}
                />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{supporter.name}</h3>
                <div className="flex items-center mt-1">
                  <Badge className={`${
                    supporter.status === 'online' ? 'bg-green-500' :
                    supporter.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                  } text-white text-xs`}>
                    {supporter.status}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={loadSupporters}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh supporter list
          </button>
        </div>

        {/* <div className="mt-6 text-center text-sm text-gray-500">
          <p>💾 Your session will be automatically saved for quick access</p>
          <p className="mt-1">Sessions expire after 8 hours of inactivity</p>
        </div> */}
      </div>
    </div>
  )
}
