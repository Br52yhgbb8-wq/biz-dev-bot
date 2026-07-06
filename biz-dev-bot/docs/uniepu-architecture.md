# Uniepu + Mercury 智能获客架构

## 双系统设计

```
Uniepu 官网 (客户前端)             Mercury 后台 (内部管理)
   ├─ /uniepu                        ├─ /dashboard
   ├─ 产品展示                        ├─ /contacts
   ├─ 获客表单                        ├─ /leads (Agent 控制台)
   └─ Agent 数据采集                  ├─ /pipelines
                                      └─ /email, /linkedin, etc.
              │                            │
              └─────────── API ────────────┘
                          (共享后端)
```

## Agent 工作流 (LeadGenAgent)

| 步骤 | 名称 | 功能 | 技术实现 |
|------|------|------|----------|
| 1 | Eyes | 全网扫街寻客 | Gemini + 网页抓取, 关键词/地区搜索 |
| 2 | Brain | 意向深度过滤 | 读取官网 → LLM判断(是否HVAC/太阳能) |
| 3 | Mouth | 千人千面话术 | 个性化生成邮件/LinkedIn/WhatsApp文案 |
| 4 | Hands | 自动触达 | Gmail API / 通知队列 |

## API 端点

### Lead Gen (已存在)
- `POST /api/leads/discover` — Gemini 线索发现
- `POST /api/leads/score` — 批量评分
- `POST /api/leads/enrich` — 深度丰富
- `POST /api/leads/outreach` — 触达文案生成
- `POST /api/leads/convert` — 转化为联系人

### Agent (新增)
- `POST /api/leads/agent/run` — 运行完整 Agent 管线
- `POST /api/leads/agent/eyes` — 步骤1: 线索发现
- `POST /api/leads/agent/brain` — 步骤2: 意向过滤
- `POST /api/leads/agent/mouth` — 步骤3: 话术生成
- `POST /api/leads/agent/hands` — 步骤4: 自动发送
- `GET /api/leads/agent/stats` — Agent 统计

## 部署架构

```
nginx
  ├─ uniepu.com → /uniepu (客户前端)
  └─ mercury.com → /dashboard (内部后台)
        └─ 共用 FastAPI 后端 :8000
```

## 配置 (.env)
```env
GEMINI_API_KEY="your-gemini-key"
GEMINI_MODEL="gemini-2.0-flash"
LEAD_GEN_ENABLED=true
```
