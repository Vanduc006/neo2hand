-- Update price columns to handle larger VND amounts
ALTER TABLE products 
ALTER COLUMN price TYPE DECIMAL(12,2),
ALTER COLUMN original_price TYPE DECIMAL(12,2);