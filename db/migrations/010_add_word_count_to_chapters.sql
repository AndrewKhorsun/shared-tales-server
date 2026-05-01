-- Add word_count column to chapters table
ALTER TABLE chapters ADD COLUMN word_count INTEGER DEFAULT 0;

-- Create index for faster aggregations
CREATE INDEX idx_chapters_word_count ON chapters(book_id, word_count);
