#!/bin/bash
set -euo pipefail

# ── UNIEPU + Mercury Docker 部署脚本 ──
# 用法:
#   export DEEPSEEK_API_KEY="sk-xxx"
#   bash scripts/deploy/docker-deploy.sh
#
# 前置条件: Docker + docker compose 已安装

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
err()   { echo -e "${RED}[ERR]${NC} $1"; }

BASE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$BASE_DIR"

# 检查 Docker
command -v docker &>/dev/null || { err "请先安装 Docker: https://docs.docker.com/engine/install/"; exit 1; }

# 获取域名
DOMAIN="${DOMAIN:-}"
while [ -z "$DOMAIN" ]; do
  echo -n "请输入域名（例如 uniepu-solar.com）: "
  read -r DOMAIN
done

# 创建 .env（如果不存在）
if [ ! -f .env ]; then
  info "创建 .env 文件..."
  cat > .env << ENVEOF
SECRET_KEY=$(openssl rand -hex 32)
DB_PASSWORD=bizdev
POSTGRES_USER=bizdev
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
LLM_ENABLED=true
HERMES_ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
HERMES_DAILY_TOKEN_BUDGET=1000000
HERMES_RATE_LIMIT_PER_IP=30
INVITE_CODE=
DISABLE_DOCS=true
ENVEOF
  ok ".env 已创建"
fi

# 确认配置
echo ""
echo "域名:     $DOMAIN"
echo "DeepSeek: $(grep -c 'DEEPSEEK_API_KEY=sk-' .env || true)"
read -p "继续部署？[Y/n]: " confirm
[[ "$confirm" =~ ^[Nn] ]] && { err "已取消"; exit 1; }

# 构建并启动
info "构建 Docker 镜像..."
docker compose build --pull

info "启动服务..."
docker compose up -d

info "等待服务就绪..."
sleep 5
curl -sf http://localhost/api/uniepu/hermes-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hi"}' > /dev/null && ok "API 正常" || warn "API 尚未就绪，等待中..."

echo ""
echo "═══════════════════════════════════════════"
echo -e "  ${GREEN}Docker 部署完成!${NC}"
echo ""
echo "  http://$DOMAIN           → 展厅"
echo "  http://$DOMAIN/uniepu    → 产品目录"
echo "  http://$DOMAIN/login     → Mercury 登录"
echo ""
echo -e "  ${YELLOW}后续:${NC}"
echo "  1. 配置 DNS 指向本机 IP"
echo "  2. 确保 80/443 端口开放"
echo "  3. 配置 SSL（推荐 Cloudflare 或 certbot）"
echo "  4. 管理: docker compose logs -f"
echo "═══════════════════════════════════════════"

# 注意：HTTPS 需要额外配置
info "HTTPS 提示:"
echo "  方案 A (推荐): 使用 Cloudflare 的 Full (Strict) SSL"
echo "    1. 在 Cloudflare DNS 设置中开启 Proxy (橙色云)"
echo "    2. 在 SSL/TLS 中选择 Full (Strict)"
echo "    3. 无需修改 nginx 配置"
echo ""
echo "  方案 B: 使用 certbot 自动证书"
echo "    1. 确保 80 端口可以从外网访问"
echo "    2. 取消注释 nginx.conf 中 HTTPS 块的注释"
echo "    3. 运行: docker compose run --rm certbot certonly --webroot -w /var/www/html -d $DOMAIN"
