CREATE TABLE book_plans (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL UNIQUE REFERENCES books(id) ON DELETE CASCADE,
  genre TEXT DEFAULT '',
  target_audience TEXT DEFAULT '',
  writing_style TEXT DEFAULT '',
  generation_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);