-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

-- Create storage policies for chat files
CREATE POLICY "Allow public read access on chat files" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-files');

CREATE POLICY "Allow authenticated upload of chat files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Allow authenticated update of chat files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'chat-files');

CREATE POLICY "Allow authenticated delete of chat files" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat-files');