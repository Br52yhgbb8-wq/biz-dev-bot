"""AI-powered smart lead generation service (DeepSeek / Gemini).

Capabilities
------------
1. **Lead Discovery** — Gemini analyses industry/criteria and produces
   structured lead suggestions (company names, key contacts, rationale).
2. **Lead Scoring** — Batch-scoring leads using firmographic + intent signals.
3. **Lead Enrichment** — Deep-dive enrichment (technologies, funding, hiring).
4. **Smart Outreach** — Personalized email/LinkedIn draft generation.
"""

import json
import logging
import uuid
from datetime import date, datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.lead import Lead
from app.models.contact import Contact
from app.models.pipeline import Pipeline
from app.models.activity import Activity
from app.schemas.lead import (
    LeadCreate,
    LeadUpdate,
    LeadDiscoveryResponse,
    LeadScoringResponse,
)
from app.rate_limiter.retry import retry_with_backoff

logger = logging.getLogger(__name__)


# ── Prompt templates ────────────────────────────────────────────────

LEAD_DISCOVERY_PROMPT = """你是一个资深的B2B智能获客专家。请根据以下条件，发现潜在的客户线索。

行业: {industry}
地区: {region}
附加条件: {criteria}
数量: {count}

请以JSON格式返回结果，格式如下:
{{
  "leads": [
    {{
      "name": "联系人姓名（真实的中文或英文名，不要虚构）",
      "company": "公司名称",
      "title": "职位",
      "email": "邮箱（如果知道）",
      "linkedin_url": "LinkedIn链接（如果知道）",
      "website": "公司官网",
      "summary": "为什么这个公司/联系人是潜在客户（1-2句话）"
    }}
  ],
  "reasoning": "整体的分析思路和筛选逻辑（中文，3-5句话说明你为何选择这些公司）"
}}

要求:
1. 每个线索必须有姓名、公司、职位
2. 优先选择真实存在的中小型企业
3. 考虑行业趋势和业务匹配度
4. 对于每个发现给出合理的商业理由
5. 如果指定了数量，尽量提供完整的数量
"""

LEAD_SCORING_PROMPT = """你是一个B2B销售智能评分专家。请根据以下线索信息，评估每个线索的转化可能性。

线索列表:
{leads_json}

请以JSON格式返回评分结果:
{{
  "results": [
    {{
      "name": "联系人姓名",
      "company": "公司名称",
      "score": 0-100的整数分数,
      "reasoning": "评分的具体理由（20-50字，中文）",
      "recommendation": "建议动作: 立即联系/跟进观察/暂缓"
    }}
  ]
}}

评分标准:
- 80-100: 高价值线索 — 高度匹配，建议立即联系
- 60-79: 有价值线索 — 良好匹配，包含联系人信息
- 40-59: 中等线索 — 部分匹配，需进一步了解
- 0-39: 低价值 — 匹配度低，可暂缓

考虑因素: 行业匹配度、职位决策力、公司规模、联系人信息完整度、业务协同性
"""

LEAD_ENRICHMENT_PROMPT = """你是一个商业情报分析师。请对以下线索进行深度信息挖掘，提供详细的背景信息。

公司: {company}
联系人: {name}
职位: {title}
行业: 根据公司名称推断

返回JSON格式:
{{
  "company_info": {{
    "full_name": "公司全称",
    "description": "公司业务描述（2-3句话）",
    "estimated_size": "预估规模（团队人数范围）",
    "headquarters": "总部所在地",
    "industry": "细分行业",
    "founded_year": "成立年份（如果知道）"
  }},
  "technologies": ["使用的技术栈（如已知）"],
  "funding_info": "融资信息（如已知）",
  "recent_news": "近期动态（产品发布、融资、扩张等）",
  "hiring_signals": "招聘信号（是否有扩张迹象）",
  "relevance_to_business": "与我们业务的关联度分析（中文，2-3句话）"
}}

如果你不确定某些信息，请基于公开信息做合理推测并标注"推测"。
"""

LEAD_OUTREACH_PROMPT = """你是一个专业的业务开发文案专家。请为以下线索生成个性化的触达信息。

联系人: {name}
公司: {company}
职位: {title}
渠道: {channel}
语气: {tone}
上下文: {context}

核心价值:
{summary}

请生成一封个性化的{channel}消息/邮件:
- {channel}模式: {"LinkedIn消息不超过300字符" if channel == "linkedin" else "正式邮件格式"}
- 语气: {tone}
- 要个性化引用对方的公司/职位背景
- 要有清晰的行动号召（CTA）
- 不要过于销售化，以建立关系为目标

返回JSON格式:
{{
  "subject": "邮件主题行（仅email模式需要）",
  "body": "完整的消息正文",
  "cta": "建议的下一步行动",
  "personalization_notes": "个性化要点说明"
}}
"""


class LeadGenService:
    """AI-powered lead generation service backed by Google Gemini."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._http_client: Optional[httpx.AsyncClient] = None

    # ── Properties ───────────────────────────────────────────────

    @property
    def enabled(self) -> bool:
        return bool(
            settings.LEAD_GEN_ENABLED
            and (settings.DEEPSEEK_API_KEY or settings.GEMINI_API_KEY)
        )

    @property
    def _client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=90.0,
                headers={"Content-Type": "application/json"},
            )
        return self._http_client

    async def close(self):
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    # ── Gemini API call (structured output) ──────────────────────

    async def _call_llm(self, prompt: str) -> dict:
        """Call the configured LLM (DeepSeek preferred, Gemini fallback) with a prompt."""
        if not self.enabled:
            return {}
        from app.services.ai_caller import call_llm as _call
        try:
            return await _call(prompt, temperature=0.3, max_tokens=8192)
        except Exception as exc:
            logger.error("LLM call failed: %s", exc)
            raise

    # ── Lead Discovery ───────────────────────────────────────────

    async def discover_leads(
        self,
        industry: str,
        region: str = "",
        criteria: str = "",
        count: int = 10,
        auto_enrich: bool = True,
        current_user: str = "",
    ) -> LeadDiscoveryResponse:
        """Use Gemini to discover new leads and persist them."""
        if not self.enabled:
            raise RuntimeError(
                "Lead Gen is not enabled. Set LEAD_GEN_ENABLED=true "
                "or set LLM_ENABLED=true + DEEPSEEK_API_KEY or GEMINI_API_KEY in your .env file."
            )

        prompt = LEAD_DISCOVERY_PROMPT.format(
            industry=industry,
            region=region or "全球",
            criteria=criteria or "无特殊条件",
            count=count,
        )

        result = await self._call_llm(prompt)
        raw_leads = result.get("leads", [])
        reasoning = result.get("reasoning", "")
        discovered = []

        for raw in raw_leads:
            lead = Lead(
                name=raw.get("name", "").strip(),
                company=raw.get("company", "").strip() or None,
                title=raw.get("title", "").strip() or None,
                email=raw.get("email", "").strip() or None,
                linkedin_url=raw.get("linkedin_url", "").strip() or None,
                website=raw.get("website", "").strip() or None,
                summary=raw.get("summary", "").strip() or None,
                source="gemini_discovery",
                source_url=None,
                status="discovered",
                score=None,
                tags=[industry],
                discovery_attempts=1,
                last_discovered_at=datetime.now(timezone.utc),
            )
            self.db.add(lead)
            discovered.append(lead)

        await self.db.commit()
        for lead in discovered:
            await self.db.refresh(lead)

        # Auto-enrich all discovered leads in background
        if auto_enrich and discovered:
            for lead in discovered[:5]:  # limit enrichments per batch
                try:
                    enriched = await self._enrich_lead(lead)
                    if enriched:
                        lead.enrichment_data = enriched
                        lead.score = self._calculate_score(lead, enriched)
                except Exception as exc:
                    logger.warning(
                        "Enrichment failed for lead %s: %s", lead.id, exc
                    )
            await self.db.commit()

        items = [
            LeadCreate(
                name=l.name,
                company=l.company,
                title=l.title,
                email=l.email,
                linkedin_url=l.linkedin_url,
                website=l.website,
                source=l.source,
                tags=l.tags or [],
                notes=l.summary,
            )
            for l in discovered
        ]

        return LeadDiscoveryResponse(
            leads=items,
            total_discovered=len(items),
            conversation=reasoning,
        )

    # ── Lead Scoring ─────────────────────────────────────────────

    async def score_leads(
        self, lead_ids: list[uuid.UUID]
    ) -> LeadScoringResponse:
        """Batch-score leads using Gemini."""
        leads = []
        for lid in lead_ids:
            result = await self.db.execute(
                select(Lead).where(Lead.id == lid)
            )
            lead = result.scalar_one_or_none()
            if lead:
                leads.append(lead)

        if not leads:
            return LeadScoringResponse(results=[])

        leads_json = json.dumps(
            [
                {
                    "name": l.name,
                    "company": l.company or "",
                    "title": l.title or "",
                    "email": l.email or "",
                    "source": l.source,
                    "tags": l.tags or [],
                }
                for l in leads
            ],
            ensure_ascii=False,
            indent=2,
        )

        prompt = LEAD_SCORING_PROMPT.format(leads_json=leads_json)
        result = await self._call_llm(prompt)
        raw_results = result.get("results", [])

        results = []
        for raw in raw_results:
            name = raw.get("name", "")
            score_val = raw.get("score", 50)
            if isinstance(score_val, (int, float)):
                score_val = max(0, min(100, float(score_val)))
            else:
                score_val = 50.0

            reasoning = raw.get("reasoning", "")
            recommendation = raw.get("recommendation", "")

            # Update lead in DB
            matched = None
            for lead in leads:
                if lead.name == name or (
                    lead.company and lead.company == raw.get("company", "")
                ):
                    matched = lead
                    break

            if matched:
                matched.score = score_val
                if recommendation:
                    matched.notes = (
                        f"[评分] {reasoning}\n[建议] {recommendation}"
                    )

            results.append(
                {
                    "lead_id": str(matched.id) if matched else "",
                    "name": name,
                    "company": raw.get("company", ""),
                    "score": score_val,
                    "reasoning": reasoning,
                    "recommendation": recommendation,
                }
            )

        await self.db.commit()
        return LeadScoringResponse(results=results)

    # ── Lead Enrichment ──────────────────────────────────────────

    async def enrich_lead(self, lead_id: uuid.UUID) -> dict:
        """Enrich a single lead."""
        result = await self.db.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")

        enriched = await self._enrich_lead(lead)
        if enriched:
            lead.enrichment_data = enriched
            lead.score = self._calculate_score(lead, enriched)
            await self.db.commit()
            await self.db.refresh(lead)

        return lead.enrichment_data or {}

    async def _enrich_lead(self, lead: Lead) -> Optional[dict]:
        """Internal: call Gemini to enrich a lead."""
        prompt = LEAD_ENRICHMENT_PROMPT.format(
            company=lead.company or "未知公司",
            name=lead.name,
            title=lead.title or "未知职位",
        )
        try:
            result = await self._call_llm(prompt)
            return result
        except Exception as exc:
            logger.warning("Enrichment error for %s: %s", lead.id, exc)
            return None

    def _calculate_score(self, lead: Lead, enriched: dict = None) -> float:
        """Calculate lead score based on enrichment and signals."""
        score = 50.0  # baseline

        if lead.email:
            score += 10
        if lead.linkedin_url:
            score += 5
        if lead.phone:
            score += 5
        if lead.title:
            # Decision-maker titles get bonus
            decision_keywords = [
                "CEO", "CTO", "VP", "Director", "Head", "President",
                "创始人", "CEO", "CTO", "总监", "VP", "总裁",
            ]
            if any(kw in (lead.title or "") for kw in decision_keywords):
                score += 10

        if enriched:
            signals = 0
            if enriched.get("hiring_signals"):
                signals += 5
            if enriched.get("funding_info"):
                signals += 5
            if enriched.get("recent_news"):
                signals += 3
            score += signals

        return round(min(score, 100), 1)

    # ── Smart Outreach ───────────────────────────────────────────

    async def generate_outreach(
        self,
        lead_id: uuid.UUID,
        channel: str = "email",
        tone: str = "professional",
        context: str = "",
    ) -> dict:
        """Generate a personalized outreach message for a lead."""
        result = await self.db.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")

        prompt = LEAD_OUTREACH_PROMPT.format(
            name=lead.name,
            company=lead.company or "",
            title=lead.title or "",
            channel=channel,
            tone=tone,
            context=context,
            summary=lead.summary or lead.enrichment_data.get(
                "relevance_to_business", ""
            )
            if lead.enrichment_data
            else "自动化业务拓展",
        )

        llm_result = await self._call_llm(prompt)
        return llm_result

    # ── Convert Lead → Contact + Pipeline ────────────────────────

    async def convert_to_contact(
        self,
        lead_id: uuid.UUID,
        deal_value: Optional[float] = None,
        pipeline_stage: str = "discovery",
    ) -> dict:
        """Promote a qualified lead into a real Contact + Pipeline entry."""
        result = await self.db.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")

        contact = Contact(
            name=lead.name,
            company=lead.company,
            title=lead.title,
            email=lead.email,
            phone=lead.phone,
            linkedin_url=lead.linkedin_url,
            source=f"lead_gen_{lead.source}",
            tags=(lead.tags or []) + ["lead_gen_converted"],
            notes=lead.summary,
        )
        self.db.add(contact)
        await self.db.flush()
        await self.db.refresh(contact)

        # Create pipeline entry
        pipeline = Pipeline(
            contact_id=contact.id,
            stage=pipeline_stage,
            deal_value=deal_value,
            probability=lead.score if lead.score else None,
            owner_id=None,
        )
        self.db.add(pipeline)

        # Create activity record
        activity = Activity(
            contact_id=contact.id,
            pipeline_id=pipeline.id,
            type="lead_conversion",
            description=f"AI 智能获客转化: {lead.name} / {lead.company or ''}",
            outcome=f"线索评分: {lead.score or 'N/A'}",
            created_by="ai_lead_gen",
        )
        self.db.add(activity)

        # Mark lead as converted
        lead.status = "converted"
        lead.linked_contact_id = str(contact.id)

        await self.db.commit()

        return {
            "contact_id": str(contact.id),
            "pipeline_id": str(pipeline.id),
            "name": lead.name,
            "company": lead.company,
        }

    # ── Statistics ───────────────────────────────────────────────

    async def get_stats(self) -> dict:
        """Return lead generation stats for dashboard."""
        total = (
            await self.db.execute(select(func.count(Lead.id)))
        ).scalar() or 0

        # By status
        status_rows = (
            await self.db.execute(
                select(Lead.status, func.count(Lead.id))
                .group_by(Lead.status)
            )
        ).all()
        by_status = {row[0]: row[1] for row in status_rows}

        # Average score
        avg = (
            await self.db.execute(
                select(func.avg(Lead.score)).where(Lead.score.isnot(None))
            )
        ).scalar() or 0.0

        # High value
        high_value = (
            await self.db.execute(
                select(func.count(Lead.id)).where(Lead.score >= 80)
            )
        ).scalar() or 0

        # Contacted
        contacted = (
            await self.db.execute(
                select(func.count(Lead.id)).where(
                    Lead.status == "contacted"
                )
            )
        ).scalar() or 0

        # Converted
        converted = (
            await self.db.execute(
                select(func.count(Lead.id)).where(
                    Lead.status == "converted"
                )
            )
        ).scalar() or 0

        # Today's discoveries
        today = (
            await self.db.execute(
                select(func.count(Lead.id)).where(
                    cast(Lead.last_discovered_at, Date) == date.today()
                )
            )
        ).scalar() or 0

        return {
            "total_leads": total,
            "by_status": by_status,
            "avg_score": round(float(avg), 1),
            "high_value": high_value,
            "contacted": contacted,
            "converted": converted,
            "discovery_today": today,
            "daily_quota_remaining": max(
                0, settings.LEAD_MAX_DAILY_DISCOVERY - today
            ),
            "enabled": self.enabled, "provider": "DeepSeek" if settings.DEEPSEEK_API_KEY else "Gemini",
            "model": settings.DEEPSEEK_MODEL or settings.GEMINI_MODEL,
        }

    # ── Lead CRUD ────────────────────────────────────────────────

    async def create_lead(self, data: LeadCreate) -> Lead:
        """Manually create a lead."""
        lead = Lead(**data.model_dump())
        self.db.add(lead)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def get_lead(self, lead_id: uuid.UUID) -> Optional[Lead]:
        result = await self.db.execute(select(Lead).where(Lead.id == lead_id))
        return result.scalar_one_or_none()

    async def list_leads(
        self,
        status: str = "",
        source: str = "",
        min_score: float = 0.0,
        search: str = "",
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Lead], int]:
        """List leads with optional filters."""
        query = select(Lead)
        count_query = select(func.count(Lead.id))

        if status:
            query = query.where(Lead.status == status)
            count_query = count_query.where(Lead.status == status)
        if source:
            query = query.where(Lead.source == source)
            count_query = count_query.where(Lead.source == source)
        if min_score > 0:
            query = query.where(Lead.score >= min_score)
            count_query = count_query.where(Lead.score >= min_score)
        if search:
            pattern = f"%{search}%"
            query = query.where(
                Lead.name.ilike(pattern)
                | Lead.company.ilike(pattern)
                | Lead.email.ilike(pattern)
            )
            count_query = count_query.where(
                Lead.name.ilike(pattern)
                | Lead.company.ilike(pattern)
                | Lead.email.ilike(pattern)
            )

        total = (await self.db.execute(count_query)).scalar() or 0
        result = await self.db.execute(
            query.order_by(Lead.score.desc().nullslast())
            .order_by(Lead.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), total

    async def update_lead(
        self, lead_id: uuid.UUID, data: LeadUpdate
    ) -> Optional[Lead]:
        lead = await self.get_lead(lead_id)
        if not lead:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(lead, key, value)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def delete_lead(self, lead_id: uuid.UUID) -> bool:
        lead = await self.get_lead(lead_id)
        if not lead:
            return False
        await self.db.delete(lead)
        await self.db.commit()
        return True
