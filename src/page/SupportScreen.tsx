"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Tag, User, ShoppingCart, HelpCircle, CheckCircle, X, LogOut, Clock, File } from "lucide-react"
import { supabase, type Database } from "@/lib/supabase"
import { supporterStorage } from "@/lib/supporter-storage"
import { useSupporterStatus } from "@/hooks/use-supporter-status"
import SupporterLoginScreen from "./SupporterLoginScreen"
import FileUpload, { type UploadedFile } from "@/components/FileUpload"
import { convertUrlsToLinks } from "@/lib/utils"

type Message = Database['public']['Tables']['messages']['Row']
type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
type Supporter = Database['public']['Tables']['supporters']['Row']

const statusConfig = {
  'active': { label: 'San sang', color: 'bg-indigo-500', icon: User },
  'in-order': { label: 'Da gui tong hop', color: 'bg-red-500', icon: ShoppingCart },
  'not-buy': { label: 'Khach da dat don', color: 'bg-purple-500', icon: X },
  'wonder': { label: 'Chot tren live', color: 'bg-yellow-500', icon: HelpCircle },
  'resolved': { label: 'Hoan thanh', color: 'bg-green-500', icon: CheckCircle },
  'closed': { label: 'Da gui di', color: 'bg-blue-500', icon: X }
}

export default function SupportScreen() {
  const [currentSupporter, setCurrentSupporter] = useState<Supporter | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>("")
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [lastLoginTime, setLastLoginTime] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [unreadSessions, setUnreadSessions] = useState<Set<string>>(new Set())
  const [lastMessageTimes, setLastMessageTimes] = useState<Record<string, string>>({})
  const [sessionsWithNewMessages, setSessionsWithNewMessages] = useState<Set<string>>(new Set())
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])
  const fileUploadRef = useRef<any>(null)
  const [isSending, setIsSending] = useState(false)
  console.log(lastMessageTimes)
  // Use supporter status hook
  useSupporterStatus(currentSupporter)

  // Load supporter from storage on component mount
  useEffect(() => {
    const loadStoredSupporter = async () => {
      try {
        setIsLoading(true)
        const storedSupporter = await supporterStorage.getCurrentSupporter()
        
        if (storedSupporter) {
          setCurrentSupporter(storedSupporter)
          
          // Get session info for display
          const session = supporterStorage.loadSupporterFromLocalStorage()
          if (session) {
            setLastLoginTime(session.loginTime)
          }
        }
      } catch (error) {
        console.error('Error loading stored supporter:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStoredSupporter()
  }, [])

  // Update activity on user interactions
  useEffect(() => {
    if (!currentSupporter) return

    const updateActivity = () => {
      supporterStorage.updateActivity()
    }

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })
    }
  }, [currentSupporter])

  const handleSupporterSelect = async (supporter: Supporter) => {
    setCurrentSupporter(supporter)
    setLastLoginTime(new Date().toISOString())
    
    // Save to storage
    await supporterStorage.saveSupporter(supporter)
  }

  const handleLogout = async () => {
    if (currentSupporter) {
      // Update supporter status to away in database
      await supabase
        .from('supporters')
        .update({ status: 'away' })
        .eq('id', currentSupporter.id)
    }
    
    // Mark session as inactive and clear storage
    await supporterStorage.markInactive()
    setCurrentSupporter(null)
    setLastLoginTime("")
  }

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

  // Show loading screen while checking for stored supporter
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading support dashboard...</p>
        </div>
      </div>
    )
  }

  // Show login screen if no supporter selected
  if (!currentSupporter) {
    return <SupporterLoginScreen onSupporterSelect={handleSupporterSelect} />
  }

  const loadChatSessions = async () => {
    // Get all messages with their room IDs and timestamps
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('chat_room_id, created_at')
      .order('created_at', { ascending: false })

    if (messagesError) return

    // Get unique rooms and their latest message times
    const roomLastMessages: Record<string, string> = {}
    messagesData.forEach(msg => {
      if (!roomLastMessages[msg.chat_room_id]) {
        roomLastMessages[msg.chat_room_id] = msg.created_at
      }
    })

    setLastMessageTimes(roomLastMessages)
    const uniqueRooms = Object.keys(roomLastMessages)

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

      if (updatedSessions) {
        const sortedSessions = updatedSessions.sort((a, b) => {
          // Unread sessions first
          const aHasUnread = unreadSessions.has(a.chat_room_id)
          const bHasUnread = unreadSessions.has(b.chat_room_id)
          
          if (aHasUnread && !bHasUnread) return -1
          if (!aHasUnread && bHasUnread) return 1
          
          // Then sort by latest message time
          const aTime = roomLastMessages[a.chat_room_id] || a.updated_at
          const bTime = roomLastMessages[b.chat_room_id] || b.updated_at
          
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
        
        setChatSessions(sortedSessions)
      }
    } else {
      // Sort existing sessions
      const sortedSessions = sessionsData.sort((a, b) => {
        // Unread sessions first
        const aHasUnread = unreadSessions.has(a.chat_room_id)
        const bHasUnread = unreadSessions.has(b.chat_room_id)
        
        if (aHasUnread && !bHasUnread) return -1
        if (!aHasUnread && bHasUnread) return 1
        
        // Then sort by latest message time
        const aTime = roomLastMessages[a.chat_room_id] || a.updated_at
        const bTime = roomLastMessages[b.chat_room_id] || b.updated_at
        
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
      
      setChatSessions(sortedSessions)
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
          
          // Mark session as having new message if it's from a customer
          if (newMessage.sender_type === 'user') {
            setSessionsWithNewMessages(prev => new Set(prev).add(newMessage.chat_room_id))
          }
          
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
    if (!newMessage && attachedFiles.length === 0) return
    if (isSending) return

    try {
      setIsSending(true)
      const messageData = {
        content: newMessage || null,
        sender_type: 'support' as const,
        sender_id: currentSupporter.id,
        supporter_name: currentSupporter.name,
        supporter_avatar: 'https://mrqpfnwmldgthasfzqdc.supabase.co/storage/v1/object/public/product-images//TkXKNk62.jpeg',
        chat_room_id: selectedRoom,
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
        if (fileUploadRef.current) {
          fileUploadRef.current.clearFiles()
        }
        
        // Remove "new message" badge when supporter responds
        setSessionsWithNewMessages(prev => {
          const newSet = new Set(prev)
          newSet.delete(selectedRoom)
          return newSet
        })
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
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
    // const Icon = config.icon
    return (
      <Badge className={`${config.color} text-white`}>
        {/* <Icon className="h-3 w-3 mr-1" /> */}
        {config.label}
      </Badge>
    )
  }

  const handleFilesSelected = (files: UploadedFile[]) => {
    setAttachedFiles(files)
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
              <div className="flex flex-col">
                <span className="font-medium">{currentSupporter.name}</span>
                {lastLoginTime && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Logged in: {new Date(lastLoginTime).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
            <Badge className={`${
              currentSupporter.status === 'online' ? 'bg-green-500' :
              currentSupporter.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
            } text-white`}>
              {currentSupporter.status}
            </Badge>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Chat Sessions */}
          <div className="bg-white rounded-lg p-4">
            <h2 className="font-semibold mb-4">Chat Sessions</h2>
            <div className="space-y-2">
              {chatSessions.map((session) => {
                const hasUnread = unreadSessions.has(session.chat_room_id)
                const hasNewMessage = sessionsWithNewMessages.has(session.chat_room_id)
                const isSelected = selectedRoom === session.chat_room_id
                
                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      setSelectedRoom(session.chat_room_id)
                      setUnreadSessions(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(session.chat_room_id)
                        return newSet
                      })
                    }}
                    className={`w-full text-left p-3 rounded border ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : hasUnread 
                          ? 'bg-pink-500 border-pink-200 hover:bg-pink-100' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="items-center justify-between mb-1">
                        {hasNewMessage && (
                          <Badge className="bg-red-500 text-white text-xs px-2 py-1 my-1">
                            New Message
                          </Badge>
                        )}
                      <div className="flex items-center gap-2">
                        {getStatusBadge(session.status)}

                        {hasUnread && (
                          <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">{session.chat_room_id}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.updated_at).toLocaleString()}
                    </div>
                  </button>
                )
              })}
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
                          {message.sender_type !== "user" && (
                            <AvatarImage src={message.supporter_avatar} alt={message.supporter_name || "Support"} />
                          )}
                          <AvatarFallback>
                            {message.sender_type === "user" ? "U" : "S"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            {message.sender_type === "user" ? "Customer" : message.supporter_name}
                          </div>
                          
                          {/* Message Content */}
                          {message.content && (
                            <div className={`rounded-lg p-3 ${
                              message.sender_type === "support" 
                                ? "bg-blue-600 text-white" 
                                : "bg-gray-100 text-gray-900"
                            }`}
                            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            dangerouslySetInnerHTML={{ __html: convertUrlsToLinks(message.content) }}
                            />
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
                                        message.sender_type === "support" 
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
                  <FileUpload 
                    ref={fileUploadRef}
                    onFilesSelected={handleFilesSelected}
                    maxFiles={999} // No limit for supporters
                    maxFileSize={999} // No size limit for supporters
                  />
                  
                  <div className="flex space-x-2 mt-2">
                    <textarea
                      value={newMessage}
                      onChange={handleTextareaChange}
                      placeholder="Type your response..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-md resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'inherit'
                      }}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={(!newMessage && attachedFiles.length === 0) || isSending}
                    >
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
                      // const Icon = config.icon
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
                          {/* <Icon className="h-4 w-4 mr-2" /> */}
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
