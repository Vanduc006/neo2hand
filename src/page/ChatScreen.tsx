"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Send, Users, Circle, Minimize2, X } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: "user" | "support"
  timestamp: Date
  supporterName?: string
  supporterAvatar?: string
}

interface Supporter {
  id: string
  name: string
  avatar: string
  status: "online" | "busy" | "away"
}

const supporters: Supporter[] = [
  { id: "1", name: "Duc", avatar: "/placeholder.svg?height=32&width=32", status: "online" },
  { id: "2", name: "Hoa", avatar: "/placeholder.svg?height=32&width=32", status: "online" },
  { id: "3", name: "Tanno", avatar: "/placeholder.svg?height=32&width=32", status: "busy" },
//   { id: "4", name: "Alex Rodriguez", avatar: "/placeholder.svg?height=32&width=32", status: "online" },
]

const initialMessages: Message[] = [
  {
    id: "1",
    content: "Hello! Welcome to our support chat. How can I help you today?",
    sender: "support",
    timestamp: new Date(Date.now() - 300000),
    supporterName: "Sarah Chen",
    supporterAvatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: "2",
    content: "Hi! I'm having trouble with my account login. It keeps saying my password is incorrect.",
    sender: "user",
    timestamp: new Date(Date.now() - 240000),
  },

]

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: "user",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setNewMessage("")
      setIsTyping(true)

      // Simulate support response
      setTimeout(() => {
        const supportMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "chua lam xong :v",
          sender: "support",
          timestamp: new Date(),
          supporterName: "IDK",
          supporterAvatar: "/placeholder.svg?height=32&width=32",
        }
        setMessages((prev) => [...prev, supportMessage])
        setIsTyping(false)
      }, 2000)
    }
  }

  const onlineSupporers = supporters.filter((s) => s.status === "online")
  const busySupporers = supporters.filter((s) => s.status === "busy")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-500"
      case "busy":
        return "text-yellow-500"
      case "away":
        return "text-gray-400"
      default:
        return "text-gray-400"
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg"
        >
          <Users className="h-5 w-5" />
          <Badge className="ml-2 bg-green-500 text-white">{onlineSupporers.length}</Badge>
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <CardHeader className="bg-blue-600 text-white rounded-t-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
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
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700 p-1">
              <X className="h-4 w-4" />
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

      {/* Online Supporters */}
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
      </div>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`flex space-x-2 max-w-[80%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
            >
              {message.sender === "support" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={message.supporterAvatar || "/placeholder.svg"} alt={message.supporterName} />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
              )}
              <div>
                {message.sender === "support" && (
                  <div className="text-xs text-gray-500 mb-1">{message.supporterName}</div>
                )}
                <div
                  className={`rounded-lg p-3 ${
                    message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.content}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Sarah Chen" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xs text-gray-500 mb-1">Sarah Chen</div>
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
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-center">Typically replies in a few minutes</div>
      </div>
    </div>
  )
}
