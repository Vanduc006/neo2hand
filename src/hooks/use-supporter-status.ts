import { useEffect, useRef } from "react"
import { supabase, type Database } from "@/lib/supabase"

type Supporter = Database['public']['Tables']['supporters']['Row']

export function useSupporterStatus(supporter: Supporter | null) {
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)
  const lastActivity = useRef<number>(Date.now())

  useEffect(() => {
    if (!supporter) {
      // Clean up if no supporter
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
        heartbeatInterval.current = null
      }
      return
    }

    // Update last activity on user interactions
    const updateActivity = () => {
      lastActivity.current = Date.now()
    }

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    // Heartbeat to update status
    const startHeartbeat = () => {
      heartbeatInterval.current = setInterval(async () => {
        const now = Date.now()
        const timeSinceActivity = now - lastActivity.current
        
        let newStatus: 'online' | 'away' = 'online'
        
        // Set to away if inactive for 5 minutes
        if (timeSinceActivity > 5 * 60 * 1000) {
          newStatus = 'away'
        }

        // Update status in database
        await supabase
          .from('supporters')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', supporter.id)

      }, 30000) // Check every 30 seconds
    }

    startHeartbeat()

    // Cleanup on unmount or when supporter changes
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }
      
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })

      // Set status to away when leaving
      if (supporter) {
        supabase
          .from('supporters')
          .update({ status: 'away' })
          .eq('id', supporter.id)
      }
    }
  }, [supporter])

  // Manual status update function
  const updateStatus = async (status: 'online' | 'busy' | 'away') => {
    if (!supporter) return

    const { error } = await supabase
      .from('supporters')
      .update({ status })
      .eq('id', supporter.id)

    if (error) {
      console.error('Error updating status:', error)
    }
  }

  return { updateStatus }
}
