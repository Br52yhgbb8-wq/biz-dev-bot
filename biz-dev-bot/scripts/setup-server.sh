#!/usr/bin/env bash
# Server setup script for Mercury
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
echo "  2. Create a .env file with a strong SECRET_KEY:"
echo "     cd $PROJECT_DIR"
echo "     echo 'SECRET_KEY=$(openssl rand -hex 32)' > .env"
echo ""
echo "  3. (Optional) Set an invite code to restrict registration:"
echo "     echo 'INVITE_CODE=your-invite-code' >> .env"
echo ""
echo "  4. Start services:"
echo "     cd $PROJECT_DIR && docker compose up --build -d"
echo ""
echo "  5. Set up HTTPS (optional but recommended):"
echo "     sudo apt install -y certbot python3-certbot-nginx"
echo "     sudo certbot certonly --nginx -d your-domain.com"
echo "     # Then update nginx.conf with your domain and uncomment the HTTPS block"
echo ""
echo "  6. Verify:"
echo "     curl http://localhost:8000/health"
echo ""
echo "  7. Set up GitHub Actions secrets:"
echo "     DEPLOY_HOST    = server IP"
echo "     DEPLOY_USER    = $USER"
echo "     DEPLOY_SSH_KEY = your SSH private key"
echo "     DEPLOY_PATH    = $PROJECT_DIR"
echo "     SECRET_KEY     = the generated key"
echo "     INVITE_CODE    = (optional)"

echo ""
echo "=== Setting up SSL auto-renewal ==="
echo ""
echo "To set up SSL with automatic renewal:"
echo ""
echo "  1. Point your domain's DNS A record to this server's IP"
echo ""
echo "  2. Obtain the initial certificate:"
echo "     cd /opt/biz-dev-bot"
echo "     DOMAIN=your-domain.com EMAIL=you@example.com ./scripts/certbot-renew.sh --first"
echo ""
echo "  3. Uncomment the HTTPS server block in nginx.conf:"
echo "     - Replace 'your-domain.com' with your actual domain"
echo "     - Change the HTTP server block to redirect to HTTPS:"
echo "       return 301 https://\$host\$request_uri;"
echo ""
echo "  4. Restart nginx: docker compose restart nginx"
echo ""
echo "  5. Verify: curl -I https://your-domain.com"
echo ""
echo "  6. Certificates auto-renew via the certbot Docker service (every 12h)"
echo "     Manual renewal: ./scripts/certbot-renew.sh --renew"
echo ""
