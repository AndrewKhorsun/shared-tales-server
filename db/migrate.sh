#!/bin/bash

set -e

if [ -f "../.env" ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

echo "=== Running migrations ==="

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-shared_tails_db}
DB_USER=${DB_USER:-shared_tails}
DB_PASSWORD=${DB_PASSWORD:-}

export PGPASSWORD=$DB_PASSWORD

# Table to track applied migrations
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"

# Check and apply each migration in order
SCRIPT_DIR=$(dirname "$0")
for file in $(ls $SCRIPT_DIR/migrations/*.sql | sort); do
    filename=$(basename $file)
    
    # Check if the migration has already been applied
    already_applied=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc \
        "SELECT COUNT(*) FROM migrations WHERE filename='$filename'")
    
    if [ "$already_applied" -eq "0" ]; then
        echo "--- Applying: $filename ---"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $file
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
            "INSERT INTO migrations (filename) VALUES ('$filename');"
        echo "✅ Applied: $filename"
    else
        echo "⏭️  Skipping: $filename (already applied)"
    fi
done

echo "=== Migrations completed ==="