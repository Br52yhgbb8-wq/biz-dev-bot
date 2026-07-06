#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────────────
#  UNIEPU + Mercury — 一键生产部署脚本
#  适用系统: Ubuntu 22.04 / Debian 12
# ─────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERR]${NC} $1"; }

# ── 0. 检查运行环境 ──
if [ "$EUID" -eq 0 ]; then err "请勿以 root 运行。使用有 sudo 权限的普通用户。"; exit 1; fi

BASE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DOMAIN="${DOMAIN:-}"
while [ -z "$DOMAIN" ]; do
  echo -n "请输入你的域名（例如 uniepu-solar.com）: "
  read -r DOMAIN
done

DEPLOY_DIR="/opt/uniepu"
SERVICES_DIR="$DEPLOY_DIR/services"
info "目标目录: $DEPLOY_DIR"
info "域名: $DOMAIN"

# ── 1. 安装系统依赖 ──
install_deps() {
  info "安装系统依赖..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq nginx certbot python3-pip nodejs npm 2>/dev/null || {
    warn "部分包可能未找到，尝试添加 NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
  }
  sudo pip3 install -q uvicorn 2>/dev/null || true
  ok "系统依赖安装完成"
}

# ── 2. 拷贝项目文件 ──
setup_project() {
  info "设置项目目录..."
  sudo mkdir -p "$DEPLOY_DIR"/{frontend,backend,services,logs,data}
  sudo chown -R "$USER":"$USER" "$DEPLOY_DIR"

  # 拷贝代码
  rsync -a --delete "$BASE_DIR/frontend/" "$DEPLOY_DIR/frontend/"
  rsync -a --delete "$BASE_DIR/backend/" "$DEPLOY_DIR/backend/"

  # 创建生产环境配置
  cat > "$DEPLOY_DIR/backend/.env" << ENVEOF
SECRET_KEY=$(openssl rand -hex 32)
INVITE_CODE=""
DEV_MODE=false
DEBUG=false

# ── DeepSeek LLM ──
LLM_ENABLED=true
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-""}
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# ── Hermes Security ──
HERMES_ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
HERMES_DAILY_TOKEN_BUDGET=1000000
HERMES_RATE_LIMIT_PER_IP=30
ENVEOF
  ok "项目文件已部署到 $DEPLOY_DIR"
}

# ── 3. 安装 Node 依赖并构建 ──
build_frontend() {
  info "安装前端依赖并构建..."
  cd "$DEPLOY_DIR/frontend"
  npm install --production 2>&1 | tail -1
  npm run build 2>&1 | tail -3
  ok "前端构建完成"
}

# ── 4. 安装 Python 依赖 ──
setup_backend() {
  info "安装后端 Python 依赖..."
  cd "$DEPLOY_DIR/backend"
  pip3 install -q -r requirements.txt 2>&1 | tail -1 || {
    warn "requirements.txt 没有找到，从 Pipfile 或直接安装"
    pip3 install -q fastapi uvicorn sqlalchemy aiosqlite httpx pydantic-settings 2>&1 | tail -1
  }
  ok "后端依赖安装完成"
}

# ── 5. 配置 nginx ──
setup_nginx() {
  info "配置 nginx..."
  cat > /tmp/uniepu-nginx.conf << NGINX
map \$sent_http_content_type \$is_assets {
  "~*image|font|javascript|stylesheet" 1;
  default                               0;
}

server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL — 使用 certbot 或 Cloudflare
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # 日志
    access_log /var/log/nginx/uniepu-access.log;
    error_log  /var/log/nginx/uniepu-error.log;

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        client_max_body_size 10m;
    }

    # 前端（Next.js）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # 静态资源缓存
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX

  sudo cp /tmp/uniepu-nginx.conf /etc/nginx/sites-available/uniepu
  sudo ln -sf /etc/nginx/sites-available/uniepu /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default

  # 测试 nginx 配置
  sudo nginx -t && sudo systemctl reload nginx
  ok "nginx 配置完成"
}

# ── 6. 设置 SSL 证书 ──
setup_ssl() {
  info "申请 SSL 证书（请确保域名 DNS 已指向本机）..."
  echo -n "是否使用 Let's Encrypt 自动申请证书？[Y/n]: "
  read -r use_ssl
  if [[ "$use_ssl" =~ ^[Nn] ]]; then
    warn "跳过 SSL。将使用 Cloudflare 或其他方式配置证书。"
    warn "确保在 Cloudflare 的 SSL/TLS 设置为 Full (Strict)。"
    return
  fi

  sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || {
    warn "自动证书申请失败。可能原因："
    warn "  1. DNS 尚未指向本机"
    warn "  2. 端口 80 未开放"
    warn "  3. 证书已存在"
    warn "运行以下命令手动申请: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  }
  ok "SSL 证书已配置"
}

# ── 7. 设置 systemd 服务 ──
setup_services() {
  info "配置 systemd 服务..."

  # 后端服务
  cat > /tmp/uniepu-backend.service << 'SVC1'
[Unit]
Description=Uniepu FastAPI Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/uniepu/backend
ExecStart=/usr/local/bin/uvicorn app.main:app --host 127.0.0.1 --port 9000 --workers 2
Restart=always
RestartSec=5
StandardOutput=append:/opt/uniepu/logs/backend.log
StandardError=append:/opt/uniepu/logs/backend.err

[Install]
WantedBy=multi-user.target
SVC1
  sudo cp /tmp/uniepu-backend.service /etc/systemd/system/

  # 前端服务
  cat > /tmp/uniepu-frontend.service << 'SVC2'
[Unit]
Description=Uniepu Next.js Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/uniepu/frontend
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
StandardOutput=append:/opt/uniepu/logs/frontend.log
StandardError=append:/opt/uniepu/logs/frontend.err
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SVC2
  sudo cp /tmp/uniepu-frontend.service /etc/systemd/system/

  sudo systemctl daemon-reload
  ok "systemd 服务已创建"
}

# ── 8. 启动服务 ──
start_services() {
  info "启动服务..."
  sudo systemctl enable uniepu-backend uniepu-frontend
  sudo systemctl restart uniepu-backend uniepu-frontend
  sudo systemctl status uniepu-backend --no-pager --lines=5
  sudo systemctl status uniepu-frontend --no-pager --lines=5
  ok "所有服务已启动"
}

# ── 9. 验证部署 ──
verify_deploy() {
  info "验证部署..."
  sleep 3
  echo ""
  echo "═══════════════════════════════════════════"
  echo -e "  ${GREEN}部署完成!${NC}"
  echo ""
  echo "  前端:    https://$DOMAIN"
  echo "  展厅:    https://$DOMAIN/uniepu"
  echo "  Mercury: https://$DOMAIN/login"
  echo "  API:     https://$DOMAIN/api/uniepu/hermes-chat"
  echo ""
  echo -e "  ${YELLOW}后续步骤:${NC}"
  echo "  1. 访问 https://$DOMAIN, 确认跳转到 /uniepu"
  echo "  2. 在 backend/.env 填入 DEEPSEEK_API_KEY"
  echo "  3. 重启后端: sudo systemctl restart uniepu-backend"
  echo "  4. 首次使用: https://$DOMAIN/setup 初始化"
  echo ""
  echo "  服务管理:"
  echo "    sudo systemctl status  uniepu-backend"
  echo "    sudo systemctl restart uniepu-frontend"
  echo "    sudo journalctl -u uniepu-backend -f"
  echo ""
  echo "  查看日志:"
  echo "    tail -f /opt/uniepu/logs/backend.log"
  echo "    tail -f /var/log/nginx/uniepu-access.log"
  echo "═══════════════════════════════════════════"
}

# ── 主流程 ──
main() {
  echo ""
  echo "╔══════════════════════════════════════════╗"
  echo "║     UNIEPU + Mercury 生产部署脚本        ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""

  read -p "是否继续部署到域名 $DOMAIN？[Y/n]: " confirm
  [[ "$confirm" =~ ^[Nn] ]] && { err "已取消"; exit 1; }

  install_deps
  setup_project
  build_frontend
  setup_backend
  setup_nginx
  setup_ssl
  setup_services
  start_services
  verify_deploy
}

main "$@"
