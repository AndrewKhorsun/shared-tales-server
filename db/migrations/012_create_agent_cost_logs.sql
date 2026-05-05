CREATE TABLE agent_cost_logs (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  chapter_number INTEGER,
  agent_node VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  input_cost_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
  output_cost_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_cost_logs_book_id ON agent_cost_logs(book_id);
CREATE INDEX idx_agent_cost_logs_created_at ON agent_cost_logs(created_at);
