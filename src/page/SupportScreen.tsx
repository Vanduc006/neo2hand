"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { supabase, type Database } from "@/lib/supabase"

type Message = Database['public']['Tables']['messages']['Row']

export default function SupportScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chatRooms, setChatRooms] = useState<string[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supporterId = "support-1"
  const supporterName = "Support Agent"

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadChatRooms()
    
    const cleanup = subscribeToMessages()
    
    return cleanup
  }, [selectedRoom])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom)
    }
  }, [selectedRoom])

  const loadChatRooms = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('chat_room_id')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const uniqueRooms = [...new Set(data.map(msg => msg.chat_room_id))]
      setChatRooms(uniqueRooms)
      if (uniqueRooms.length > 0 && !selectedRoom) {
        setSelectedRoom(uniqueRooms[0])
      }
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
          // Always update the chat rooms list
          loadChatRooms()
          
          // If this message is for the currently selected room, add it to messages
          if (newMessage.chat_room_id === selectedRoom) {
            setMessages(prev => {
              // Avoid duplicates
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
      sender_id: supporterId,
      supporter_name: supporterName,
      supporter_avatar: "/placeholder.svg",
      chat_room_id: selectedRoom,
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData)

    if (!error) {
      setNewMessage("")
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Support Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Chat Rooms */}
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-semibold mb-4">Active Chats</h2>
            <div className="space-y-2">
              {chatRooms.map((room) => (
                <button
                  key={room}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left p-2 rounded ${
                    selectedRoom === room ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="md:col-span-3 bg-white rounded-lg flex flex-col h-[600px]">
            {selectedRoom ? (
              <>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Chat: {selectedRoom}</h3>
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
                Select a chat room to start responding
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
