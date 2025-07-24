-- Add updated_at column to supporters table
ALTER TABLE supporters ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to update updated_at
CREATE TRIGGER update_supporters_updated_at BEFORE UPDATE
    ON supporters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing records
UPDATE supporters SET updated_at = NOW();