"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Send, Users, Circle, Minimize2, File } from "lucide-react"
import { supabase, type Database } from "@/lib/supabase"
import { useMobile } from "@/hooks/use-mobile"
import { ChatStorage } from "@/lib/chat-storage"
import FileUpload, { type UploadedFile, type FileUploadRef } from "@/components/FileUpload"

type Message = Database['public']['Tables']['messages']['Row']
type Supporter = Database['public']['Tables']['supporters']['Row']

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  console.log(setIsTyping)
  const [isMinimized, setIsMinimized] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])
  const fileUploadRef = useRef<FileUploadRef>(null)
  
  // Get or create persistent user session
  const [userId] = useState(() => {
    const existingSession = ChatStorage.getCurrentSession()
    
    if (existingSession && !ChatStorage.isSessionExpired()) {
      return existingSession.userId
    }
    
    // Create new session
    const newUserId = `user-${Math.random().toString(36).substr(2, 9)}`
    const newRoomId = `room-${Date.now()}`
    ChatStorage.saveSession(newUserId, newRoomId)
    return newUserId
  })
  
  const [chatRoomId] = useState(() => {
    const existingSession = ChatStorage.getCurrentSession()
    
    if (existingSession && !ChatStorage.isSessionExpired()) {
      return existingSession.chatRoomId
    }
    
    return `room-${Date.now()}`
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadSupporters()
    loadMessages()
    
    const messagesSubscription = subscribeToMessages()
    const supportersSubscription = subscribeToSupporters()

    return () => {
      messagesSubscription()
      supportersSubscription()
    }
  }, [chatRoomId])

  const loadSupporters = async () => {
    const { data, error } = await supabase
      .from('supporters')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading supporters:', error)
    } else {
      setSupporters(data || [])
    }
  }

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
    } else {
      setMessages(data || [])
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(msg => msg.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const subscribeToSupporters = () => {
    const channel = supabase
      .channel('supporters-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supporters'
        },
        () => {
          loadSupporters()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachedFiles.length === 0) return

    try {
      const messageData = {
        content: newMessage.trim() || null,
        sender_type: 'user' as const,
        sender_id: userId,
        chat_room_id: chatRoomId,
        files: attachedFiles.length > 0 ? JSON.stringify(attachedFiles) : null,
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData)

      if (error) {
        console.error('Error sending message:', error)
      } else {
        setNewMessage("")
        setAttachedFiles([])
        // Clear files in FileUpload component
        if (fileUploadRef.current) {
          fileUploadRef.current.clearFiles()
        }
        ChatStorage.updateActivity()
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error)
    }
  }

  const handleFilesSelected = (files: UploadedFile[]) => {
    setAttachedFiles(files)
  }

  const onlineSupporers = supporters.filter((s) => s.status === "online")
  const busySupporers = supporters.filter((s) => s.status === "busy")

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case "online":
  //       return "text-green-500"
  //     case "busy":
  //       return "text-yellow-500"
  //     case "away":
  //       return "text-gray-400"
  //     default:
  //       return "text-gray-400"
  //   }
  // }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        

        <Button
          onClick={() => setIsMinimized(false)}
          className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg"
        >
          <Users className="h-5 w-5" />
          <Badge className="ml-2 bg-green-500 text-white">{onlineSupporers.length}</Badge>
        </Button>

      </div>
    )
  }

  return (
        <div
      className={`fixed z-50 bg-white border border-gray-200 shadow-xl flex flex-col ${
        isMobile ? "inset-0 rounded-none" : "bottom-4 right-4 w-96 h-[600px] rounded-lg"
      }`}
    >
      {/* Header */}
      <CardHeader className="bg-blue-600 text-white md:rounded-t-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* <Users className="h-5 w-5" /> */}
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://mrqpfnwmldgthasfzqdc.supabase.co/storage/v1/object/public/product-images//TkXKNk62.jpeg" alt="Support" />
              <AvatarFallback>
                SC
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold">Support Chat</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-blue-700 p-1"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Support Status */}
        <div className="flex items-center justify-between text-sm mt-2">
          <div className="flex items-center space-x-1">
            <Circle className="h-2 w-2 fill-green-400 text-green-400" />
            <span>{onlineSupporers.length} supporters online</span>
          </div>
          <div className="flex items-center space-x-1">
            <Circle className="h-2 w-2 fill-yellow-400 text-yellow-400" />
            <span>{busySupporers.length} busy</span>
          </div>
        </div>
      </CardHeader>

      {/* Online Supporters
      <div className="p-3 bg-gray-50 border-b">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xs font-medium text-gray-600">Available Support Team:</span>
        </div>
        <div className="flex space-x-2 overflow-x-auto">
          {supporters.map((supporter) => (
            <div key={supporter.id} className="flex flex-col items-center space-y-1 min-w-fit">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={supporter.avatar || "/placeholder.svg"} alt={supporter.name} />
                  <AvatarFallback>
                    {supporter.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <Circle
                  className={`absolute -bottom-1 -right-1 h-3 w-3 fill-current ${getStatusColor(supporter.status)}`}
                />
              </div>
              <span className="text-xs text-gray-600 text-center">{supporter.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div> */}

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-8">
            <p>Start a conversation with our support team!</p>
            <p className="text-xs mt-1">We're here to help you.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender_type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex space-x-2 max-w-[80%] ${message.sender_type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
              >
                {message.sender_type === "support" && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={message.supporter_avatar} alt={message.supporter_name || "Support"} />
                    <AvatarFallback>
                      {message.supporter_name ? 
                        message.supporter_name.split(" ").map(n => n[0]).join("") : 
                        "SC"
                      }
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  {message.sender_type === "support" && message.supporter_name && (
                    <div className="text-xs text-gray-500 mb-1">{message.supporter_name}</div>
                  )}
                  {message.sender_type === "user" && (
                    <div className="text-xs text-gray-500 mb-1 text-right">You</div>
                  )}
                  
                  {/* Message Content */}
                  {message.content && (
                    <div
                      className={`rounded-lg p-3 ${
                        message.sender_type === "user" 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {message.content}
                    </div>
                  )}
                  
                  {/* Files */}
                  {message.files && (
                    <div className="space-y-2 mt-2">
                      {(typeof message.files === 'string' ? JSON.parse(message.files) : message.files).map((file: UploadedFile, index: number) => (
                        <div key={index}>
                          {file.type.startsWith('image/') ? (
                            <img 
                              src={file.url} 
                              alt={file.name}
                              className="max-w-48 rounded-lg cursor-pointer"
                              onClick={() => window.open(file.url, '_blank')}
                            />
                          ) : file.type.startsWith('video/') ? (
                            <video 
                              src={file.url} 
                              controls
                              className="max-w-48 rounded-lg"
                            />
                          ) : (
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 p-2 rounded border ${
                                message.sender_type === "user" 
                                  ? "bg-blue-500 text-white border-blue-400" 
                                  : "bg-white border-gray-300"
                              }`}
                            >
                              <File className="h-4 w-4" />
                              <span className="text-sm">{file.name}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className={`text-xs text-gray-400 mt-1 ${message.sender_type === "user" ? "text-right" : ""}`}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt="Support" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xs text-gray-500 mb-1">Support is typing...</div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      <div className={`border-t ${isMobile ? "p-3" : "p-4"}`}>
        <FileUpload 
          ref={fileUploadRef}
          onFilesSelected={handleFilesSelected}
          maxFiles={5}
          maxFileSize={10}
        />
        
        <div className="flex space-x-2 mt-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() && attachedFiles.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 text-center">
          {onlineSupporers.length > 0 ? "Typically replies in a few minutes" : "No supporters online"}
        </div>
      </div>
    </div>
  )
}
