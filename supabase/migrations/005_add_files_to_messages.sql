-- Add files column to messages table
ALTER TABLE messages ADD COLUMN files JSONB;

-- Update the type definition to include files
COMMENT ON COLUMN messages.files IS 'Array of file objects with url, name, type, size';