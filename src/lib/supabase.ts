import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          original_price?: number
          images?: string[]
          category_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          original_price?: number
          images?: string[]
          category_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          price?: number
          original_price?: number
          images?: string[]
          category_id?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          content: string
          sender_type: 'user' | 'support'
          sender_id: string
          supporter_name?: string
          supporter_avatar?: string
          created_at: string
          chat_room_id: string
        }
        Insert: {
          id?: string
          content: string
          sender_type: 'user' | 'support'
          sender_id: string
          supporter_name?: string
          supporter_avatar?: string
          created_at?: string
          chat_room_id: string
        }
      }
      supporters: {
        Row: {
          id: string
          name: string
          avatar: string
          status: 'online' | 'busy' | 'away'
          created_at: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          chat_room_id: string
          status: 'active' | 'in-order' | 'not-buy' | 'wonder' | 'resolved' | 'closed'
          assigned_supporter_id?: string
          customer_info?: any
          notes?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_room_id: string
          status?: 'active' | 'in-order' | 'not-buy' | 'wonder' | 'resolved' | 'closed'
          assigned_supporter_id?: string
          customer_info?: any
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'active' | 'in-order' | 'not-buy' | 'wonder' | 'resolved' | 'closed'
          assigned_supporter_id?: string
          customer_info?: any
          notes?: string
          updated_at?: string
        }
      }
    }
  }
}
