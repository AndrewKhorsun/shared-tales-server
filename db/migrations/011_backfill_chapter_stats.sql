-- Backfill word_count for existing chapters based on content
-- Uses formula consistent with JavaScript routes: TRIM(content).split(' ').length
-- Split on single space after trimming, matching the runtime calculation
UPDATE chapters
SET word_count = CASE
  WHEN TRIM(content) = '' THEN 0
  ELSE ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(content), ' '), 1)
END
WHERE word_count = 0;

-- Set status to 'published' for chapters with content (they were already written)
UPDATE chapters
SET status = 'published'
WHERE status = 'draft' AND LENGTH(TRIM(content)) > 0;
