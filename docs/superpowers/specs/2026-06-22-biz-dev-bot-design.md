# Biz Dev Bot — 业务开发自动化引擎

## Overview

独立运行的业务开发自动化引擎：集成 CRM、Gmail API、LinkedIn Playwright 自动化。
独立 Web 界面操作，后台定时任务驱动。

**技术栈：**
- 后端：FastAPI (Python) + PostgreSQL + APScheduler
- 前端：Next.js + Tailwind CSS + shadcn/ui
- 认证：JWT
- 部署：Docker Compose

---

## 数据模型

### Contact (联系人)
- id, name, company, title, email, phone
- linkedin_url, linkedin_profile (JSON)
- source: manual / linkedin / import
- tags[], notes
- created_at, updated_at

### Pipeline (管道项)
- id, contact_id (FK)
- stage: discovery / proposal / negotiation / closed_won / closed_lost
- deal_value, probability
- expected_close_date
- owner_id

### Activity (活动记录)
- id, contact_id (FK), pipeline_id (FK nullable)
- type: email / call / meeting / note / linkedin
- description, outcome
- scheduled_at, completed_at
- created_by
- metadata (JSON)

### Campaign (触达活动)
- id, name, status: draft / running / paused / completed
- target_filter (JSON)
- email_template_id (FK)
- sequence (JSON)
- started_at, completed_at

### EmailMessage (邮件记录)
- id, thread_id, campaign_id (FK nullable)
- from_addr, to_addrs[], cc[], bcc[]
- subject, body_text, body_html
- sent_at, read_at
- direction: outbound / inbound
- gmail_message_id

### ScheduledTask (定时任务)
- id, type: follow_up / campaign_step / data_refresh
- status: pending / running / completed / failed
- payload (JSON)
- scheduled_for, completed_at
- result (JSON)

---

## API 接口

### Contacts
- `POST   /api/contacts` — 创建
- `GET    /api/contacts` — 列表 + 搜索
- `GET    /api/contacts/:id` — 详情（含 pipeline + activity）
- `PUT    /api/contacts/:id` — 更新
- `DELETE /api/contacts/:id` — 删除

### Pipelines
- `POST   /api/pipelines` — 创建
- `GET    /api/pipelines` — 列表（按阶段分组）
- `PUT    /api/pipelines/:id/stage` — 推进阶段
- `PUT    /api/pipelines/:id` — 更新金额/概率

### Activities
- `GET    /api/contacts/:id/activities` — 某人全部活动
- `POST   /api/activities` — 记录活动
- `GET    /api/activities` — 时间线搜索

### Emails
- `POST   /api/email/send` — 发送（单发/批量）
- `GET    /api/email/threads` — 收件箱
- `GET    /api/email/threads/:id` — 单条详情
- `POST   /api/email/sync` — 手动同步 Gmail

### Campaigns
- `POST   /api/campaigns` — 创建
- `GET    /api/campaigns` — 列表
- `POST   /api/campaigns/:id/start` — 启动
- `POST   /api/campaigns/:id/pause` — 暂停
- `GET    /api/campaigns/:id/stats` — 效果统计

### LinkedIn
- `POST   /api/linkedin/search` — 搜索潜在客户
- `POST   /api/linkedin/profile` — 获取某人资料
- `POST   /api/linkedin/export-to-crm` — 批量导入联系人

### Dashboard
- `GET    /api/dashboard/pipeline-overview` — 管道总览
- `GET    /api/dashboard/activity-trend` — 活动趋势
- `GET    /api/dashboard/campaign-stats` — 活动效果汇总

---

## 前端页面

| 路由 | 内容 |
|-------|--------|
| `/dashboard` | Pipeline Kanban 看板 + 数字总览 |
| `/contacts` | 联系人表格 + 搜索 + 标签筛选 |
| `/contacts/:id` | 单联系人详情 + 时间线 + 编辑 |
| `/email` | 收件箱（Gmail 同步） |
| `/campaigns` | 触达活动管理 |
| `/campaigns/:id` | 单活动详情 + 序列 + 效果 |
| `/settings` | Gmail/LinkedIn 认证 + 定时任务 |

---

## Gmail API 集成

- Google OAuth 2.0 (Desktop app 类型)
  发送: Gmail API `users.messages.send`
  同步: Gmail API `users.messages.list`（定时每15分钟）
  自动匹配发件人到 Contact 表
  Token 本地持久化 + 自动刷新

---

## LinkedIn Playwright 自动化

- Playwright persistent context，保存登录态
- 首次手动登录，之后 headless 可运行
- 核心操作：搜索 → 提取结果 → 获取详情 → 批量导入 CRM
- 数据字段：name, title, company, location, profile_url

---

## 部署架构

- Docker Compose (backend + frontend + PostgreSQL)
- 开发：本地运行
- 生产：轻量 VPS (2C4G) 或 Supabase PostgreSQL

---

## 分阶段实施计划

### Phase 1: 后端骨架
1. 项目初始化 + Docker Compose 配置
2. 数据模型 (SQLAlchemy) + 迁移
3. Contacts + Pipelines CRUD API
4. JWT 认证

### Phase 2: 前端骨架
5. Next.js 项目初始化
6. 登录页 + 认证流程
7. Contacts 列表 + 详情页
8. Pipeline Kanban 看板

### Phase 3: Gmail 集成
9. Google OAuth 认证流程
10. 邮件发送 API
11. 邮件同步（收件箱）
12. 邮件关联联系人

### Phase 4: LinkedIn 集成
13. Playwright 浏览器管理 + 登录
14. 搜索 + 资料提取 API
15. 批量导入 CRM

### Phase 5: 自动化调度
16. APScheduler + ScheduledTask 表
17. 定时跟进提醒
18. Campaign 管理 + 批量触达

### Phase 6: 数据看板 + 完善
19. Dashboard API + 图表
20. 活动时间线
21. 搜索/筛选/标签系统
22. Docker Compose 生产部署
