#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=${BACKUP_DIR:-/opt/huao/storage/backups}
POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-huao-postgres}
POSTGRES_DB=${POSTGRES_DB:-huao}
POSTGRES_USER=${POSTGRES_USER:-huao_user}

mkdir -p "$BACKUP_DIR"

DB_DUMP="$BACKUP_DIR/db-$TIMESTAMP.sql"
FILES_ARCHIVE="$BACKUP_DIR/storage-$TIMESTAMP.tar.gz"

echo "[backup] Dumping database..."
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$DB_DUMP"

echo "[backup] Archiving storage directories..."
tar czf "$FILES_ARCHIVE" -C /opt/huao/storage auth_info sessions uploads logs

echo "[backup] Removing backups older than 30 days..."
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DB_DUMP, $FILES_ARCHIVE"
