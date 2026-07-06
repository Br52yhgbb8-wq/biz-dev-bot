# UNIEPU + Mercury 生产部署

## 前置条件

- 一台 Linux VPS（推荐 Ubuntu 22.04，最低配置 1C2G）
- 一个域名（DNS 已指向 VPS 的公网 IP）
- DeepSeek API Key（可选，不开也能用规则回退）

## 快速部署

```bash
# 1. SSH 登录 VPS

# 2. 安装 git 并拉取代码
git clone <你的仓库地址> /opt/uniepu-source
cd /opt/uniepu-source

# 3. 运行部署脚本
export DEEPSEEK_API_KEY="sk-你的Key"
bash scripts/deploy/deploy.sh
# 按提示输入域名，等待完成

# 4. 访问 https://你的域名/ 确认生效
# 5. 首次使用访问 /setup 初始化
```

## 手动部署

如果自动脚本不适用，可以手动执行：

```bash
# 1. 系统依赖
sudo apt install nginx certbot python3-pip nodejs

# 2. 构建前端
cd frontend
npm install && npm run build

# 3. 安装后端
cd ../backend
pip3 install -r requirements.txt

# 4. 配置 nginx + SSL
sudo cp scripts/deploy/nginx-uniepu.conf /etc/nginx/sites-available/uniepu
# 修改域名后启用
sudo certbot --nginx -d 你的域名

# 5. 启动
nohup uvicorn app.main:app --host 127.0.0.1 --port 9000 --workers 2 &
nohup npx next start -p 3000 &
```

## 服务管理

```bash
# 查看状态
sudo systemctl status uniepu-backend
sudo systemctl status uniepu-frontend

# 重启
sudo systemctl restart uniepu-backend

# 查看日志
journalctl -u uniepu-backend -f
tail -f /opt/uniepu/logs/backend.log
tail -f /var/log/nginx/uniepu-access.log
```

## 架构

```
用户 ──► Cloudflare ──► nginx (443) ──► / → Next.js (3000)
                               └──► /api/* → FastAPI (9000)
                                              └── SQLite
```

## 安全检查清单

- [ ] DEEPSEEK_API_KEY 已配置
- [ ] HERMES_ALLOWED_ORIGINS 已包含域名
- [ ] DEV_MODE=false
- [ ] SECRET_KEY 已更换
- [ ] HTTPS 已启用
- [ ] .env 不在 git 中
