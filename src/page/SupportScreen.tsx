"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Tag, User, ShoppingCart, HelpCircle, CheckCircle, X } from "lucide-react"
import { supabase, type Database } from "@/lib/supabase"
import SupporterLoginScreen from "./SupporterLoginScreen"

type Message = Database['public']['Tables']['messages']['Row']
type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
type Supporter = Database['public']['Tables']['supporters']['Row']

const statusConfig = {
  'active': { label: 'Dang hoat dong', color: 'bg-green-500', icon: User },
  'in-order': { label: 'Dang mua', color: 'bg-blue-500', icon: ShoppingCart },
  'not-buy': { label: 'Khong mua', color: 'bg-red-500', icon: X },
  'wonder': { label: 'Phan van', color: 'bg-yellow-500', icon: HelpCircle },
  'resolved': { label: 'Da xu li xong', color: 'bg-purple-500', icon: CheckCircle },
  'closed': { label: 'Hoan thanh', color: 'bg-gray-500', icon: X }
}

export default function SupportScreen() {
  const [currentSupporter, setCurrentSupporter] = useState<Supporter | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [notes, setNotes] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (currentSupporter) {
      scrollToBottom()
    }
  }, [messages, currentSupporter])

  useEffect(() => {
    if (currentSupporter) {
      loadChatSessions()
      const cleanup = subscribeToMessages()
      return cleanup
    }
  }, [selectedRoom, currentSupporter])

  useEffect(() => {
    if (selectedRoom && currentSupporter) {
      loadMessages(selectedRoom)
      loadSessionDetails(selectedRoom)
    }
  }, [selectedRoom, currentSupporter])

  // Show login screen if no supporter selected
  if (!currentSupporter) {
    return <SupporterLoginScreen onSupporterSelect={setCurrentSupporter} />
  }

  const loadChatSessions = async () => {
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('chat_room_id')
      .order('created_at', { ascending: false })

    if (messagesError) return

    const uniqueRooms = [...new Set(messagesData.map(msg => msg.chat_room_id))]

    const { data: sessionsData, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .in('chat_room_id', uniqueRooms)

    if (sessionsError) return

    const existingRooms = sessionsData.map(s => s.chat_room_id)
    const newRooms = uniqueRooms.filter(room => !existingRooms.includes(room))

    if (newRooms.length > 0) {
      const newSessions = newRooms.map(room => ({
        chat_room_id: room,
        status: 'active' as const
      }))

      await supabase.from('chat_sessions').insert(newSessions)
      
      const { data: updatedSessions } = await supabase
        .from('chat_sessions')
        .select('*')
        .in('chat_room_id', uniqueRooms)
        .order('updated_at', { ascending: false })

      setChatSessions(updatedSessions || [])
    } else {
      setChatSessions(sessionsData.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ))
    }

    if (uniqueRooms.length > 0 && !selectedRoom) {
      setSelectedRoom(uniqueRooms[0])
    }
  }

  const loadSessionDetails = async (roomId: string) => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('chat_room_id', roomId)
      .single()

    if (!error && data) {
      setSelectedSession(data)
      setNotes(data.notes || "")
    }
  }

  const loadMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', roomId)
      .order('created_at', { ascending: true })

    if (!error) {
      setMessages(data || [])
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('support-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message
          loadChatSessions()
          
          if (newMessage.chat_room_id === selectedRoom) {
            setMessages(prev => {
              if (prev.find(msg => msg.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return

    const messageData = {
      content: newMessage.trim(),
      sender_type: 'support' as const,
      sender_id: currentSupporter.id,
      supporter_name: currentSupporter.name,
      supporter_avatar: currentSupporter.avatar,
      chat_room_id: selectedRoom,
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData)

    if (!error) {
      setNewMessage("")
    }
  }

  const updateSessionStatus = async (status: ChatSession['status']) => {
    if (!selectedSession) return

    const { error } = await supabase
      .from('chat_sessions')
      .update({ status })
      .eq('id', selectedSession.id)

    if (!error) {
      setSelectedSession({ ...selectedSession, status })
      loadChatSessions()
    }
  }

  const updateNotes = async () => {
    if (!selectedSession) return

    const { error } = await supabase
      .from('chat_sessions')
      .update({ notes })
      .eq('id', selectedSession.id)

    if (!error) {
      setSelectedSession({ ...selectedSession, notes })
    }
  }

  const getStatusBadge = (status: ChatSession['status']) => {
    const config = statusConfig[status]
    const Icon = config.icon
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const handleLogout = () => {
    setCurrentSupporter(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Support Dashboard</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {currentSupporter.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{currentSupporter.name}</span>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Chat Sessions */}
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-semibold mb-4">Chat Sessions</h2>
            <div className="space-y-2">
              {chatSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedRoom(session.chat_room_id)}
                  className={`w-full text-left p-3 rounded border ${
                    selectedRoom === session.chat_room_id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="items-center justify-between mb-1">
                    {getStatusBadge(session.status)}
                    <span className="text-sm font-medium truncate">{session.chat_room_id}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(session.updated_at).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3 bg-white rounded-lg flex flex-col h-[600px]">
            {selectedRoom ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Chat: {selectedRoom}</h3>
                    {selectedSession && getStatusBadge(selectedSession.status)}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.sender_type === "support" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex space-x-2 max-w-[80%] ${message.sender_type === "support" ? "flex-row-reverse space-x-reverse" : ""}`}>
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback>
                            {message.sender_type === "user" ? "U" : "S"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            {message.sender_type === "user" ? "Customer" : message.supporter_name}
                          </div>
                          <div className={`rounded-lg p-3 ${
                            message.sender_type === "support" 
                              ? "bg-blue-600 text-white" 
                              : "bg-gray-100 text-gray-900"
                          }`}>
                            {message.content}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a chat session to start responding
              </div>
            )}
          </div>

          {/* Session Management */}
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-semibold mb-4 flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Session Management
            </h2>
            
            {selectedSession ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                  <div className="space-y-2">
                    {Object.entries(statusConfig).map(([status, config]) => {
                      const Icon = config.icon
                      return (
                        <button
                          key={status}
                          onClick={() => updateSessionStatus(status as ChatSession['status'])}
                          className={`w-full flex items-center p-2 rounded text-sm ${
                            selectedSession.status === status
                              ? `${config.color} text-white`
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {config.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={updateNotes}
                    placeholder="Add notes about this session..."
                    className="w-full p-2 border rounded-md text-sm h-24 resize-none"
                  />
                </div>

                <div className="text-xs text-gray-500">
                  <div>Created: {new Date(selectedSession.created_at).toLocaleString()}</div>
                  <div>Updated: {new Date(selectedSession.updated_at).toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                Select a session to manage its status and add notes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
