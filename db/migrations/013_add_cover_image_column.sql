-- Add cover_image_url column to books table
ALTER TABLE books ADD COLUMN cover_image_url TEXT;

-- Create index for faster aggregations
CREATE INDEX idx_books_cover_image_url ON books(cover_image_url);
