-- Create supporters table
CREATE TABLE supporters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  status TEXT CHECK (status IN ('online', 'busy', 'away')) DEFAULT 'online',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT,
  sender_type TEXT CHECK (sender_type IN ('user', 'support')) NOT NULL,
  sender_id TEXT NOT NULL,
  supporter_name TEXT,
  supporter_avatar TEXT,
  chat_room_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to supporters" ON supporters FOR SELECT USING (true);
CREATE POLICY "Allow read access to messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow insert messages" ON messages FOR INSERT WITH CHECK (true);

-- Insert sample supporters
INSERT INTO supporters (name, avatar, status) VALUES
  ('Duc', '/placeholder.svg?height=32&width=32', 'online'),
  ('Hoa', '/placeholder.svg?height=32&width=32', 'online'),
  ('Tanno', '/placeholder.svg?height=32&width=32', 'busy');
