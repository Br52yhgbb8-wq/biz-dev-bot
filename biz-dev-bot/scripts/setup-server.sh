#!/usr/bin/env bash
# Server setup script for Biz Dev Bot
# Run this once on a fresh Ubuntu/Debian VPS before the first deploy.
#
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USER/REPO/main/biz-dev-bot/scripts/setup-server.sh | bash

set -euo pipefail

echo "=== Installing Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | bash
  sudo usermod -aG docker "$USER"
fi

echo "=== Installing Docker Compose plugin ==="
if ! docker compose version &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -yqq docker-compose-plugin
fi

echo "=== Setting up project directory ==="
PROJECT_DIR="/opt/biz-dev-bot"
sudo mkdir -p "$PROJECT_DIR"
sudo chown "$USER:$USER" "$PROJECT_DIR"

echo "=== Configuring firewall ==="
if command -v ufw &>/dev/null; then
  sudo ufw allow ssh
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
fi

echo ""
echo "=== Server setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone the repo:"
echo "     git clone https://github.com/YOUR_USER/REPO.git $PROJECT_DIR"
echo ""
echo "  2. Create a .env file:"
echo "     echo 'SECRET_KEY=$(openssl rand -hex 32)' > $PROJECT_DIR/backend/.env"
echo ""
echo "  3. Start services:"
echo "     cd $PROJECT_DIR && docker compose up --build -d"
echo ""
echo "  4. Verify:"
echo "     curl http://localhost:8000/health"
echo "     curl http://localhost:3000"
echo ""
echo "  5. Set up GitHub Actions secrets:"
echo "     DEPLOY_HOST    = server IP"
echo "     DEPLOY_USER    = $USER"
echo "     DEPLOY_SSH_KEY = your SSH private key"
echo "     DEPLOY_PATH    = $PROJECT_DIR"
