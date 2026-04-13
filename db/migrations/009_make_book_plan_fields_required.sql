-- Make genre, target_audience, writing_style, language NOT NULL in book_plans
-- First update existing NULL/empty values to empty string as fallback
UPDATE book_plans SET genre = '' WHERE genre IS NULL;
UPDATE book_plans SET target_audience = '' WHERE target_audience IS NULL;
UPDATE book_plans SET writing_style = '' WHERE writing_style IS NULL;
UPDATE book_plans SET language = 'english' WHERE language IS NULL;

ALTER TABLE book_plans
  ALTER COLUMN genre SET NOT NULL,
  ALTER COLUMN genre DROP DEFAULT,
  ALTER COLUMN target_audience SET NOT NULL,
  ALTER COLUMN target_audience DROP DEFAULT,
  ALTER COLUMN writing_style SET NOT NULL,
  ALTER COLUMN writing_style DROP DEFAULT,
  ALTER COLUMN language SET NOT NULL;
