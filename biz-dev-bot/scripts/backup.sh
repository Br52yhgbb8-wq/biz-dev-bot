#!/usr/bin/env bash
#
# backup.sh — PostgreSQL backup script for Biz Dev Bot.
#
# Usage:
#   ./backup.sh                          # dump to default dir
#   ./backup.sh /path/to/backups         # dump to custom dir
#   ./backup.sh /backups s3://my-bucket  # dump + upload to S3
#
# Environment variables (required when run outside docker-compose):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#
# Docker compose defaults:
#   PGHOST=localhost  PGPORT=5432
#   PGUSER=bizdev     PGDATABASE=bizdev

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
AWS_DEST="${2:-}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="${BACKUP_DIR}/bizdev_${TIMESTAMP}.sql.gz"
PREV_SYMLINK="${BACKUP_DIR}/bizdev_latest.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] Dumping database -> ${DUMP_FILE}"
pg_dump \
  --host="${PGHOST:-localhost}" \
  --port="${PGPORT:-5432}" \
  --username="${PGUSER:-bizdev}" \
  --dbname="${PGDATABASE:-bizdev}" \
  --no-owner \
  --no-privileges \
  --format=custom \
  --compress=9 \
  --file="${DUMP_FILE}"

echo "[backup] Updating latest symlink"
ln -sf "$(basename "${DUMP_FILE}")" "${PREV_SYMLINK}"

echo "[backup] Dump size: $(du -h "${DUMP_FILE}" | cut -f1)"

# Optional: upload to S3-compatible storage
if [ -n "${AWS_DEST}" ]; then
  if command -v aws &>/dev/null; then
    echo "[backup] Uploading to ${AWS_DEST}"
    aws s3 cp "${DUMP_FILE}" "${AWS_DEST}/"
    echo "[backup] Upload complete"
  else
    echo "[backup] WARNING: aws CLI not found, skipping upload" >&2
  fi
fi

echo "[backup] Done"
