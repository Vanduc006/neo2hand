export interface ChatSession {
  userId: string
  chatRoomId: string
  lastActivity: string
  isActive: boolean
}

export const ChatStorage = {
  // Get current chat session
  getCurrentSession(): ChatSession | null {
    try {
      const userId = localStorage.getItem('chat_user_id')
      const chatRoomId = localStorage.getItem('chat_room_id')
      const lastActivity = localStorage.getItem('chat_last_activity')
      const isActive = localStorage.getItem('chat_session_active') === 'true'

      if (!userId || !chatRoomId) return null

      return {
        userId,
        chatRoomId,
        lastActivity: lastActivity || new Date().toISOString(),
        isActive
      }
    } catch {
      return null
    }
  },

  // Save chat session
  saveSession(userId: string, chatRoomId: string): void {
    try {
      localStorage.setItem('chat_user_id', userId)
      localStorage.setItem('chat_room_id', chatRoomId)
      localStorage.setItem('chat_last_activity', new Date().toISOString())
      localStorage.setItem('chat_session_active', 'true')
    } catch (error) {
      console.error('Failed to save chat session:', error)
    }
  },

  // Update last activity
  updateActivity(): void {
    try {
      localStorage.setItem('chat_last_activity', new Date().toISOString())
    } catch (error) {
      console.error('Failed to update activity:', error)
    }
  },

  // Clear session (when chat is ended)
  clearSession(): void {
    try {
      localStorage.removeItem('chat_user_id')
      localStorage.removeItem('chat_room_id')
      localStorage.removeItem('chat_last_activity')
      localStorage.setItem('chat_session_active', 'false')
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  },

  // Check if session is expired (older than 24 hours)
  isSessionExpired(): boolean {
    try {
      const lastActivity = localStorage.getItem('chat_last_activity')
      if (!lastActivity) return true

      const lastTime = new Date(lastActivity).getTime()
      const now = new Date().getTime()
      const hoursDiff = (now - lastTime) / (1000 * 60 * 60)

      return hoursDiff > 24 // Expire after 24 hours
    } catch {
      return true
    }
  }
}