#!/usr/bin/env bash
#
# certbot-renew.sh — SSL certificate renewal for Biz Dev Bot.
#
# Designed to run as a cron job or systemd timer. Uses docker to run
# certbot with the shared SSL volume from docker-compose.
#
# Usage:
#   ./certbot-renew.sh                  # dry-run (check + report)
#   ./certbot-renew.sh --renew          # actually renew
#   ./certbot-renew.sh --first          # initial request (requires nginx running with HTTP)
#
# Environment:
#   DOMAIN       — your domain (required for --first)
#   EMAIL        — email for Let's Encrypt notifications (required for --first)

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f "${PROJECT_DIR}/docker-compose.yml""
CERTS_VOLUME="biz-dev-bot_nginx_ssl"  # Docker volume name

case "${1:-}" in
  --renew)
    echo "[certbot] Renewing certificates..."
    $COMPOSE run --rm certbot renew --quiet
    echo "[certbot] Reloading nginx..."
    $COMPOSE exec nginx nginx -s reload
    echo "[certbot] Renewal complete"
    ;;

  --first)
    DOMAIN="${DOMAIN:?DOMAIN is required for --first}"
    EMAIL="${EMAIL:?EMAIL is required for --first}"
    echo "[certbot] Requesting initial certificate for ${DOMAIN}..."
    $COMPOSE run --rm -p 80:80 certbot certonly --standalone \
      --non-interactive --agree-tos \
      --email "${EMAIL}" \
      --domain "${DOMAIN}"
    echo "[certbot] Initial certificate obtained"
    echo "[certbot] Restarting nginx to pick up the new certificate..."
    $COMPOSE restart nginx
    echo "[certbot] Done"
    ;;

  *)
    echo "[certbot] Checking expiration..."
    $COMPOSE run --rm certbot certificates 2>&1 || true
    echo ""
    echo "To actually renew:  $0 --renew"
    echo "First-time setup:   DOMAIN=example.com EMAIL=you@example.com $0 --first"
    ;;
esac
