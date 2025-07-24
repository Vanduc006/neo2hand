-- Create chat_sessions table
CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('active', 'in-order', 'not-buy', 'wonder', 'resolved', 'closed')) DEFAULT 'active',
  assigned_supporter_id UUID REFERENCES supporters(id),
  customer_info JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to chat_sessions" ON chat_sessions FOR SELECT USING (true);
CREATE POLICY "Allow insert chat_sessions" ON chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update chat_sessions" ON chat_sessions FOR UPDATE USING (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE
    ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();