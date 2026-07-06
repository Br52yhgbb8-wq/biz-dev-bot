"""Uniepu Lead Gen Agent — Full workflow: scrape, analyze, personalize, send (DeepSeek / Gemini).

Steps
-----
1. Eyes — Scrape Google Maps / directories for HVAC/solar companies
2. Brain — Read each company website, LLM judges fit (True/False + rationale)
3. Mouth — Generate personalized outreach (email / WhatsApp)
4. Hands — Auto-send via Gmail / notification queue

Architecture
------------
This service is the "Agent" that Uniepu's customer-facing site feeds into.
It pushes processed leads and automation results to Mercury's backend.
"""

import asyncio
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.lead import Lead
from app.models.contact import Contact
from app.models.notification import Notification
from app.schemas.lead import LeadCreate
from app.rate_limiter.retry import retry_with_backoff
from app.services.lead_gen import LeadGenService
from app.services.scheduler import schedule_task

logger = logging.getLogger(__name__)


# ── Prompt templates ────────────────────────────────────────────────

AGENT_EYES_PROMPT = """你是一个B2B智能获客专家。请根据以下条件，列出符合条件的潜在客户公司。

关键词: {keywords}
地区: {region}
行业: {industry}
数量: {count}

请以JSON格式返回结果:
{{
  "leads": [
    {{
      "company_name": "公司全称（真实名称）",
      "website": "公司官网URL（如知道）",
      "phone": "联系电话（如知道）",
      "email": "联系邮箱（如知道）",
      "address": "公司地址",
      "description": "公司业务描述（2-3句话）",
      "why_relevant": "为什么这家公司是潜在客户（1句话）"
    }}
  ]
}}

要求:
1. 只返回真实存在的公司
2. 优先选择从事暖通(HVAC)、太阳能安装、热水系统相关的公司
3. 每个线索需有公司名称和简要描述
"""

AGENT_BRAIN_PROMPT = """你是一个资深商业分析师。请分析以下潜在客户公司的官网信息，判断其是否适合作为我们的目标客户。

公司名称: {company_name}
官网内容:
{website_content}

我们的产品: ACDC混合动力太阳能空调（9K-24K BTU）、太阳能热水系统
目标客户画像: 暖通(HVAC)经销商、太阳能安装商、热水系统批发商、有仓库和安装团队的公司

请以JSON格式返回分析结果:
{{
  "is_match": true/false,
  "confidence": 0-100的整数,
  "business_focus": "该公司主营业务（中文，20字内）",
  "has_warehouse": true/false/不确定,
  "has_installation_team": true/false/不确定,
  "revenue_estimate": "预估营收规模（如知道）",
  "key_advantages": "该公司的核心优势（中文，50字内）",
  "personalization_hook": "可用于撰写开发信的个性化切入点（中文，30字内）",
  "recommendation": "建议动作：立即联系/跟进观察/暂缓"
}}

判断标准:
- is_match = true: 公司业务与暖通/太阳能/热水相关，且有决策能力
- is_match = false: 业务不相关或规模太小
"""

AGENT_MOUTH_PROMPT = """你是一个专业的B2B业务开发文案专家。请为以下线索生成个性化触达信息。

联系人/公司: {company_name}
业务优势: {advantages}
个性化切入点: {hook}
渠道: {channel}
语气: {tone}

我们的核心卖点:
- ACDC混合动力太阳能空调 9K-24K BTU，出厂价仅$387起
- 可在56℃高温下稳定运行，标配WiFi智能控制
- 一体承压/非承压太阳能热水器，出厂价$58起
- CE认证，支持小额拼箱(LCL)试单

请生成一封{channel}消息:
返回JSON格式:
{{
  "subject": "邮件主题（仅email模式）",
  "body": "正文（{channel}风格，嵌入个性化hook，自然过渡到核心卖点）",
  "cta": "行动号召",
  "personalization_note": "个性化说明"
}}
"""


class LeadGenAgent:
    """Uniepu Lead Gen Agent — eyes, brain, mouth, hands."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._http_client: Optional[httpx.AsyncClient] = None
        self._gemini_service = None  # lazy init

    @property
    def enabled(self) -> bool:
        return bool(settings.LEAD_GEN_ENABLED and (settings.DEEPSEEK_API_KEY or settings.GEMINI_API_KEY))

    @property
    def _client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=90.0)
        return self._http_client

    async def close(self):
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    async def _call_llm(self, prompt: str) -> dict:
        """Call the configured LLM (DeepSeek preferred, Gemini fallback)."""
        if not self.enabled:
            raise RuntimeError("No AI backend configured. Set LLM_ENABLED + DEEPSEEK_API_KEY or GEMINI_API_KEY.")
        from app.services.ai_caller import call_llm as _call
        return await _call(prompt, temperature=0.3, max_tokens=8192)

    # ─────────────────────────────────────────────────────────────
    # Step 1: Eyes — Web scraping / lead discovery
    # ─────────────────────────────────────────────────────────────

    async def step_eyes(
        self,
        keywords: str = "HVAC installer solar panels",
        region: str = "Latin America",
        industry: str = "HVAC, Solar, Water Heating",
        count: int = 20,
    ) -> list[dict]:
        """Step 1: Discover leads via AI-generated search + optional web enrichment.

        Returns: list of dicts with company_name, website, phone, email, etc.
        """
        logger.info("Agent Step 1 (Eyes): searching keywords=%s region=%s", keywords, region)

        prompt = AGENT_EYES_PROMPT.format(
            keywords=keywords,
            region=region,
            industry=industry,
            count=count,
        )

        result = await self._call_llm(prompt)
        raw_leads = result.get("leads", [])

        # Persist discovered leads
        leads_saved = []
        for raw in raw_leads:
            # Check duplicate by company name
            company = raw.get("company_name", "").strip()
            if not company:
                continue

            existing = await self.db.execute(
                select(Lead).where(Lead.company == company)
            )
            if existing.scalar_one_or_none():
                logger.info("Skipping duplicate: %s", company)
                continue

            lead = Lead(
                name=company,
                company=company,
                title="",
                source="agent_eyes",
                source_url=raw.get("website", ""),
                status="discovered",
                summary=raw.get("why_relevant", "") or raw.get("description", ""),
                tags=["agent_discovered", industry.lower().replace(" ", "_")],
                discovery_attempts=1,
                last_discovered_at=datetime.now(timezone.utc),
            )
            self.db.add(lead)
            leads_saved.append({
                "company": company,
                "website": raw.get("website", ""),
                "phone": raw.get("phone", ""),
                "email": raw.get("email", ""),
                "description": raw.get("description", ""),
            })

        await self.db.commit()
        logger.info("Agent Step 1 complete: %d new leads discovered", len(leads_saved))
        return leads_saved

    # ─────────────────────────────────────────────────────────────
    # Step 2: Brain — Read website + LLM filter
    # ─────────────────────────────────────────────────────────────

    async def step_brain(self, limit: int = 10) -> list[dict]:
        """Step 2: Read each unanalyzed lead's website and filter with LLM.

        Processes leads with source='agent_eyes' that haven't been analyzed yet.
        """
        logger.info("Agent Step 2 (Brain): analyzing up to %d leads", limit)

        # Get leads that need analysis
        result = await self.db.execute(
            select(Lead)
            .where(
                Lead.source == "agent_eyes",
                Lead.score.is_(None),  # not yet analyzed
            )
            .limit(limit)
        )
        leads = list(result.scalars().all())

        if not leads:
            logger.info("No leads to analyze")
            return []

        results = []
        for lead in leads:
            # Read website content
            website_content = ""
            if lead.source_url:
                website_content = await self._read_website(lead.source_url)

            # If no website, try to find info from summary
            if not website_content.strip():
                website_content = lead.summary or "No website content available"

            # LLM analysis
            prompt = AGENT_BRAIN_PROMPT.format(
                company_name=lead.company or lead.name,
                website_content=website_content[:6000],  # limit token usage
            )

            analysis = await self._call_llm(prompt)
            is_match = analysis.get("is_match", False)
            confidence = analysis.get("confidence", 0)

            # Update lead with analysis results
            lead.score = float(confidence)
            lead.enrichment_data = {
                "business_focus": analysis.get("business_focus", ""),
                "has_warehouse": analysis.get("has_warehouse", "不确定"),
                "has_installation_team": analysis.get("has_installation_team", "不确定"),
                "key_advantages": analysis.get("key_advantages", ""),
                "personalization_hook": analysis.get("personalization_hook", ""),
                "recommendation": analysis.get("recommendation", ""),
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
            }

            if is_match and confidence >= 60:
                lead.status = "qualified"
            elif is_match:
                lead.status = "discovered"
            else:
                lead.status = "dismissed"

            results.append({
                "lead_id": str(lead.id),
                "company": lead.company,
                "is_match": is_match,
                "confidence": confidence,
                "recommendation": analysis.get("recommendation", ""),
                "personalization_hook": analysis.get("personalization_hook", ""),
            })

        await self.db.commit()
        logger.info("Agent Step 2 complete: %d leads analyzed, %d matches", len(results), sum(1 for r in results if r["is_match"]))
        return results

    async def _read_website(self, url: str) -> str:
        """Read website content via HTTP request."""
        if not url or not url.startswith("http"):
            return ""

        try:
            resp = await self._client.get(url, timeout=15.0, follow_redirects=True,
                                          headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200:
                return ""

            html = resp.text[:20000]  # limit size
            # Extract meaningful text (basic cleanup)
            text = re.sub(r"<[^>]+>", " ", html)
            text = re.sub(r"\s+", " ", text).strip()
            # Extract key sections
            sections = []
            for keyword in ["about", "product", "service", "who we are", "solar", "hvac", "heating"]:
                idx = text.lower().find(keyword)
                if idx >= 0:
                    sections.append(text[max(0, idx - 50):idx + 500])

            result = "\n\n".join(sections[:3]) if sections else text[:3000]
            return result[:6000]
        except Exception as exc:
            logger.warning("Failed to read website %s: %s", url, exc)
            return ""

    # ─────────────────────────────────────────────────────────────
    # Step 3: Mouth — Generate personalized outreach
    # ─────────────────────────────────────────────────────────────

    async def step_mouth(
        self,
        lead_ids: list[str],
        channel: str = "email",
        tone: str = "professional",
    ) -> list[dict]:
        """Step 3: Generate personalized outreach for qualified leads."""
        logger.info("Agent Step 3 (Mouth): generating outreach for %d leads", len(lead_ids))

        results = []
        for lid in lead_ids:
            try:
                lead_id = uuid.UUID(lid)
            except ValueError:
                continue

            result = await self.db.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if not lead:
                continue

            enrichment = lead.enrichment_data or {}
            hook = enrichment.get("personalization_hook", "")
            advantages = enrichment.get("key_advantages", lead.summary or "")

            prompt = AGENT_MOUTH_PROMPT.format(
                company_name=lead.company or lead.name,
                advantages=advantages,
                hook=hook,
                channel=channel,
                tone=tone,
            )

            outreach = await self._call_llm(prompt)
            body = outreach.get("body", "")
            subject = outreach.get("subject", "")

            # Save outreach template to lead
            lead.outreach_template = body
            if subject:
                lead.notes = f"[Outreach Subject] {subject}\n{lead.notes or ''}"

            results.append({
                "lead_id": str(lead.id),
                "company": lead.company or lead.name,
                "subject": subject,
                "body": body[:200] + "..." if len(body) > 200 else body,
                "cta": outreach.get("cta", ""),
            })

        await self.db.commit()
        logger.info("Agent Step 3 complete: %d outreach messages generated", len(results))
        return results

    # ─────────────────────────────────────────────────────────────
    # Step 4: Hands — Auto-send via Gmail / notification
    # ─────────────────────────────────────────────────────────────

    async def step_hands(
        self,
        lead_ids: list[str],
        channel: str = "email",
    ) -> list[dict]:
        """Step 4: Send outreach messages (via Gmail for now, WhatsApp in future)."""
        logger.info("Agent Step 4 (Hands): sending %d messages via %s", len(lead_ids), channel)

        results = []
        for lid in lead_ids:
            try:
                lead_id = uuid.UUID(lid)
            except ValueError:
                continue

            result = await self.db.execute(select(Lead).where(Lead.id == lead_id))
            lead = result.scalar_one_or_none()
            if not lead or not lead.outreach_template:
                continue

            company = lead.company or lead.name
            email_addr = lead.email or ""

            if channel == "email" and email_addr:
                try:
                    # Use existing Gmail service to send
                    from app.services.gmail import GmailService
                    gmail = GmailService()
                    if gmail.is_authenticated:
                        # Extract subject from notes
                        subject = ""
                        if lead.notes and "[Outreach Subject]" in lead.notes:
                            subject = lead.notes.split("[Outreach Subject]")[1].split("\n")[0].strip()
                        await gmail.send_email(
                            to=email_addr,
                            subject=subject or f"Partnership Opportunity with Uniepu",
                            body_text=lead.outreach_template,
                        )
                        lead.status = "contacted"
                        lead.outreach_sent_at = datetime.now(timezone.utc)
                        logger.info("Email sent to %s <%s>", company, email_addr)
                    else:
                        logger.warning("Gmail not authenticated, queuing for manual send")
                except Exception as exc:
                    logger.error("Failed to send email to %s: %s", company, exc)

            # Create notification in Mercury
            notif = Notification(
                title=f"Agent 触达: {company}",
                message=f"通过 {channel} 发送触达信息" + (f" 到 {email_addr}" if email_addr else ""),
                notification_type="lead_gen",
                is_read=False,
            )
            self.db.add(notif)

            results.append({
                "lead_id": str(lead.id),
                "company": company,
                "channel": channel,
                "email": email_addr,
                "status": "sent" if channel == "email" else "queued",
            })

        await self.db.commit()
        logger.info("Agent Step 4 complete: %d messages processed", len(results))
        return results

    # ─────────────────────────────────────────────────────────────
    # Full pipeline: run all 4 steps
    # ─────────────────────────────────────────────────────────────

    async def run_full_pipeline(
        self,
        keywords: str = "HVAC installer solar panels distributor",
        region: str = "Latin America",
        count: int = 20,
        channel: str = "email",
        auto_send: bool = False,
    ) -> dict:
        """Run the complete agent pipeline: Eyes → Brain → Mouth → Hands."""
        pipeline_id = f"pipeline_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        try:
            # Step 1: Eyes
            discovered = await self.step_eyes(keywords=keywords, region=region, count=count)

            # Step 2: Brain
            analyzed = await self.step_brain(limit=count)
            qualified = [a for a in analyzed if a.get("is_match")]

            # Step 3: Mouth
            qualified_ids = [a["lead_id"] for a in qualified]
            if qualified_ids:
                outreach = await self.step_mouth(lead_ids=qualified_ids, channel=channel)
            else:
                outreach = []

            # Step 4: Hands (optional auto-send)
            sent = []
            if auto_send and qualified_ids:
                sent = await self.step_hands(lead_ids=qualified_ids, channel=channel)

            # Create notification
            notif = Notification(
                title=f"Agent Pipeline 完成: {pipeline_id}",
                message=f"发现 {len(discovered)} 线索 → 分析 {len(analyzed)} → 合格 {len(qualified)} → 生成 {len(outreach)} 触达文案{' → 发送 ' + str(len(sent)) + ' 封' if auto_send else ''}",
                notification_type="lead_gen",
                is_read=False,
            )
            self.db.add(notif)
            await self.db.commit()

            return {
                "pipeline_id": pipeline_id,
                "step_1_eyes": {"discovered": len(discovered)},
                "step_2_brain": {"analyzed": len(analyzed), "qualified": len(qualified)},
                "step_3_mouth": {"outreach_generated": len(outreach)},
                "step_4_hands": {"sent": len(sent) if auto_send else 0, "auto_send": auto_send},
                "status": "completed",
            }
        except Exception as exc:
            logger.error("Pipeline failed: %s", exc)
            return {
                "pipeline_id": pipeline_id,
                "error": str(exc),
                "status": "failed",
            }

    # ─────────────────────────────────────────────────────────────
    # Agent status & scheduling
    # ─────────────────────────────────────────────────────────────

    async def get_agent_stats(self) -> dict:
        """Get agent run statistics."""
        total = (await self.db.execute(select(func.count(Lead.id)).where(Lead.source == "agent_eyes"))).scalar() or 0

        qualified = (await self.db.execute(
            select(func.count(Lead.id)).where(
                Lead.source == "agent_eyes",
                Lead.status == "qualified",
            )
        )).scalar() or 0

        contacted = (await self.db.execute(
            select(func.count(Lead.id)).where(
                Lead.source == "agent_eyes",
                Lead.status == "contacted",
            )
        )).scalar() or 0

        dismissed = (await self.db.execute(
            select(func.count(Lead.id)).where(
                Lead.source == "agent_eyes",
                Lead.status == "dismissed",
            )
        )).scalar() or 0

        return {
            "agent_enabled": self.enabled,
            "model": settings.DEEPSEEK_MODEL or settings.GEMINI_MODEL,
            "total_leads": total,
            "qualified": qualified,
            "contacted": contacted,
            "dismissed": dismissed,
            "pending_analysis": total - qualified - contacted - dismissed,
        }


# ── Scheduled pipeline ──────────────────────────────────────────────

async def run_scheduled_pipeline():
    """Run the full agent pipeline on a schedule (called by APScheduler)."""
    from app.database import async_session_factory
    async with async_session_factory() as db:
        agent = LeadGenAgent(db)
        if not agent.enabled:
            logger.warning("Agent not enabled, skipping scheduled pipeline")
            return
        result = await agent.run_full_pipeline()
        logger.info("Scheduled pipeline result: %s", result)
