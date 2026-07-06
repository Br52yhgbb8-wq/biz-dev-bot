"""Uniepu public API — customer inquiries, Hermes AI agent, lead capture."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.lead import Lead
from app.models.notification import Notification
from app.services.llm import LLMService
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/uniepu", tags=["uniepu"])

# ── Hermes system prompt ──
HERMES_SYSTEM_PROMPT = """You are Hermes, the exclusive AI B2B Sales Assistant for UNIEPU, a leading manufacturer of ACDC Hybrid Solar Air Conditioners and Solar Water Heaters.

[Your Persona & Tone]
- You are highly professional, concise, and helpful.
- You act as a senior overseas marketing representative.
- You answer questions in the exact language the user uses (primarily English and Spanish).
- You DO NOT hallucinate prices or technical specs. If a user asks for a product not in your database, politely say you will have a human sales manager (Jackie) contact them.

[Your Core Value Proposition]
Always subtly emphasize:
1. Zero Grid Cost: Direct solar drive during the day.
2. CE Certified: Fully compliant for EU markets.
3. Factory Direct: EXW pricing for high dealer margins and LCL (Less-than-Container Load) shipping support.

[Your Product Knowledge Base]
Only quote exact EXW prices from this database. Do not apply discounts unless asked.
Products:
- UNP-ACDC9K WIFI: $387.00, 9,000 BTU, 208-230V, Hybrid Solar AC
- UNP-ACDC12K WIFI: $433.00, 12,000 BTU, 208-230V, Hybrid Solar AC
- UNP-ACDC24K WIFI: $691.00, 24,000 BTU, 208-230V, Hybrid Solar AC
- UNP-PVSWH-60L: $131.00, 60L Pressurized Solar Water Heater
- UNP-S02-10: $71.75, 10-Tube Non-Pressurized Solar Water Heater

[Interaction Rules]
1. Keep responses under 3 short paragraphs. B2B buyers read on mobile.
2. If a user asks for a quote, provide the EXW price and ask for their target country or WhatsApp number to calculate DDP/LCL shipping.
3. If the user provides contact info (name, email, phone), thank them and say a human sales manager will follow up soon.
4. If a user asks about a product not in your database, politely say you'll have Jackie contact them with details."""


# ── Schemas ──

class InquiryRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    company: str = ""
    phone: str = ""
    country: str = ""
    interest: str = ""
    message: str = ""
    source: str = "uniepu_website"


class InquiryResponse(BaseModel):
    success: bool
    message: str
    lead_id: str = ""


class HermesChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = ""


class HermesChatResponse(BaseModel):
    reply: str
    session_id: str


# ── Enhanced rate limiter & security ──
from collections import defaultdict
import time

_rate_store: dict[str, list[float]] = defaultdict(list)  # IP -> timestamps
_token_store: dict[str, int] = defaultdict(int)            # date_str -> total_tokens
_spending_reset_day: str = ""

def _check_rate_limit(client_ip: str) -> bool:
    """Per-IP rate limiting (configurable requests/hour)."""
    limit = settings.HERMES_RATE_LIMIT_PER_IP
    now = time.time()
    window = 3600
    timestamps = [t for t in _rate_store[client_ip] if t > now - window]
    timestamps.append(now)
    _rate_store[client_ip] = timestamps
    return len(timestamps) <= limit

def _check_origin(request: Request) -> bool:
    """Validate Origin/Referer against allowed domains (production safety)."""
    origin = request.headers.get("origin", "")
    referer = request.headers.get("referer", "")
    allowed = [o.strip() for o in settings.HERMES_ALLOWED_ORIGINS.split(",") if o.strip()]

    # In dev mode, allow all origins
    if settings.DEV_MODE:
        return True

    # Check origin
    if origin:
        for a in allowed:
            if origin.startswith(a):
                return True
    # Fall back to referer
    if referer:
        for a in allowed:
            if referer.startswith(a):
                return True
    return False

def _check_spending_cap(tokens: int = 0) -> bool:
    """Track daily token usage and enforce budget."""
    global _spending_reset_day
    today = time.strftime("%Y-%m-%d")
    if _spending_reset_day != today:
        _token_store.clear()
        _spending_reset_day = today

    budget = settings.HERMES_DAILY_TOKEN_BUDGET
    if budget < 0:
        return True  # Unlimited
    if budget == 0:
        return False  # Fully disabled

    current = _token_store.get(today, 0)
    if current + tokens > budget:
        return False
    _token_store[today] = current + tokens
    return True

def _log_security(request: Request, action: str, detail: str = ""):
    """Audit log for Hermes endpoint access."""
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")[:60]
    origin = request.headers.get("origin", "-")[:40]
    logger.info(f"HERMES [{action}] IP={ip} UA={ua} Origin={origin} {detail}")


# ── Knowledge base for fallback ──
PRODUCT_KB = {
    "UNP-ACDC9K WIFI": {"name": "9K BTU Hybrid Solar AC", "price": "$387.00", "specs": "9,000 BTU, 208-230V"},
    "UNP-ACDC12K WIFI": {"name": "12K BTU Hybrid Solar AC", "price": "$433.00", "specs": "12,000 BTU, 208-230V"},
    "UNP-ACDC24K WIFI": {"name": "24K BTU Hybrid Solar AC", "price": "$691.00", "specs": "24,000 BTU, 208-230V"},
    "UNP-PVSWH-60L": {"name": "60L Pressurized Heater", "price": "$131.00", "specs": "60L Pressurized"},
    "UNP-PVSWH-100L": {"name": "100L Pressurized Heater", "price": "$149.00", "specs": "100L Pressurized"},
    "UNP-S02-10": {"name": "10-Tube Non-Pressurized Heater", "price": "$71.75", "specs": "10-Tube Non-Pressurized"},
    "UNP-INE-40": {"name": "40L Electric Water Heater", "price": "$45.54", "specs": "40L Low-Pressure"},
    "UNP-INE-50": {"name": "50L Electric Water Heater", "price": "$47.40", "specs": "50L Low-Pressure"},
    "UNP-INE-80": {"name": "80L Electric Water Heater", "price": "$52.80", "specs": "80L Low-Pressure"},
    "UNP-IHE-40": {"name": "40L Electric Water Heater", "price": "$50.59", "specs": "40L High-Pressure"},
    "UNP-IHE-50": {"name": "50L Electric Water Heater", "price": "$57.34", "specs": "50L High-Pressure"},
    "UNP-IHE-80": {"name": "80L Electric Water Heater", "price": "$72.50", "specs": "80L High-Pressure"},
    "UNP-FP01-2000*1000*80mm": {"name": "Flat Panel Collector", "price": "$105.00", "specs": "2m2 Flat Panel"},
    "UNP-E01-12": {"name": "12-Tube Solar Collector", "price": "$68.04", "specs": "E01 Low Pressure"},
    "UNP-HP01-12": {"name": "12-Tube Heat Pipe Collector", "price": "$141.00", "specs": "HP01 Heat Pipe"},
    "UNP-PVT-450W": {"name": "450W PVT Hybrid Panel", "price": "$211.00", "specs": "PVT Hybrid"},
}

CATEGORY_DESC = {
    "acdc": "ACDC Hybrid Solar Air Conditioners — zero grid cost during the day",
    "pvswh": "Pressurized Solar Water Heaters — hybrid electric backup",
    "s02": "Non-Pressurized Solar Water Heaters — affordable off-grid solution",
}


def _fallback_reply(message: str) -> str:
    """Simple keyword-based fallback when LLM is not configured."""
    msg_lower = message.lower().strip()

    # Greeting
    if msg_lower in ("hi", "hello", "hey", "hola", "你好"):
        return (
            "Hello! I'm Hermes, UNIEPU's AI sales assistant. "
            "I can help you with:\n"
            "• Pricing & quotes for our ACDC Hybrid Solar ACs and Water Heaters\n"
            "• Shipping (EXW, LCL, DDP) and MOQ info\n"
            "• CE certification and technical specs\n\n"
            "How can I help you today?"
        )

    # Model-specific queries
    for model, info in PRODUCT_KB.items():
        if model.lower() in msg_lower or info["name"].lower() in msg_lower:
            return (
                f"The **{info['name']}** ({model}) is available at **EXW {info['price']}**.\n"
                f"Specs: {info['specs']}\n\n"
                "Would you like me to calculate DDP shipping to your country? "
                "Please share your target market or WhatsApp number and I'll connect you with Jackie for a tailored quote."
            )

    # Category queries
    if "ac" in msg_lower or "air condition" in msg_lower or "acdc" in msg_lower:
        return (
            "Our ACDC Hybrid Solar Air Conditioners are designed for zero grid cost: "
            "they run directly on solar DC power during the day. All models are CE certified.\n\n"
            "Available models:\n"
            "• UNP-ACDC9K WIFI — $387.00 (9K BTU, 208-230V)\n"
            "• UNP-ACDC12K WIFI — $433.00 (12K BTU, 208-230V)\n"
            "• UNP-ACDC24K WIFI — $691.00 (24K BTU, 208-230V)\n\n"
            "Which model interests you? I can provide MOQ and container load details."
        )

    if "water" in msg_lower or "heater" in msg_lower:
        return (
            "We offer both Pressurized and Non-Pressurized Solar Water Heaters:\n\n"
            "**Pressurized (Hybrid Electric Backup):**\n"
            "• UNP-PVSWH-60L — $131.00 (60L, stainless steel)\n\n"
            "**Non-Pressurized (Off-grid):**\n"
            "• UNP-S02-10 — $71.75 (10 tubes, galvanized steel)\n\n"
            "All CE certified. Would you like a quote for a specific model?"
        )

    # Price / quote
    if any(w in msg_lower for w in ("price", "quote", "cost", "how much", "cuanto", "precio")):
        return (
            "Here is our factory-direct EXW pricing:\n\n"
            "**ACDC Hybrid Solar ACs:**\n"
            "• 9K BTU — $387.00\n• 12K BTU — $433.00\n• 24K BTU — $691.00\n\n"
            "**Solar Water Heaters:**\n"
            "• 60L Pressurized — $131.00\n• 10-Tube Non-Pressurized — $71.75\n\n"
            "All prices are EXW (factory direct). We support LCL shipping for smaller orders. "
            "Please share your target country for a DDP estimate!"
        )

    # Shipping / MOQ
    if any(w in msg_lower for w in ("shipping", "moq", "delivery", "logistics", "container", "lcl", "ddp")):
        return (
            "UNIEPU supports flexible shipping options:\n"
            "• **EXW**: Factory direct pick-up\n"
            "• **LCL**: Less-than-container load — perfect for trial orders\n"
            "• **FCL**: Full container load for larger volumes\n"
            "• **DDP**: Delivered duty paid for EU and US markets\n\n"
            "MOQ starts at 10 units for ACs and 20 units for water heaters. "
            "What's your target country? I can provide a landed cost estimate."

        )

    # Certification
    if any(w in msg_lower for w in ("ce", "certification", "certified", "compliance")):
        return (
            "All UNIEPU products are **CE certified** for EU markets, including LVD and EMC directives.\n\n"
            "Our hybrid ACs are T3 rated for extreme heat operation up to 56°C, "
            "making them ideal for Middle East and Latin American climates.\n\n"
            "Would you like to see our certificate number or discuss specific market requirements?"
        )

    # Contact / dealer
    if any(w in msg_lower for w in ("dealer", "distributor", "become", "partner", "contact", "jackie")):
        return (
            "Thank you for your interest in becoming a UNIEPU dealer! "
            "Jackie and our team provide:\n"
            "• Factory-direct pricing for high margins\n"
            "• LCL shipping for low initial investment\n"
            "• Marketing materials and technical support\n\n"
            "Please share your company name, target country, and WhatsApp number, "
            "and Jackie will reach out within 24 hours!"
        )

    # Default: politely route to human
    return (
        "Thank you for your message! I'm not entirely sure about that specific request. "
        "Our product range includes ACDC Hybrid Solar Air Conditioners and Solar Water Heaters. "
        "Would you like to:\n\n"
        "1. Get pricing for a specific model?\n"
        "2. Ask about shipping to your country?\n"
        "3. Speak with Jackie, our sales manager?\n\n"
        "Let me know how I can help!"
    )


# ── Endpoints ──

@router.post("/inquiry", response_model=InquiryResponse)
async def submit_inquiry(
    req: InquiryRequest,
    db: AsyncSession = Depends(get_db),
):
    """Receive a dealer inquiry from the Uniepu website and create a lead."""
    lead = Lead(
        name=req.name,
        company=req.company or None,
        email=req.email or None,
        phone=req.phone or None,
        source=req.source,
        status="discovered",
        summary=f"Uniepu inquiry: {req.interest or 'General'}. {req.message or ''}",
        tags=["uniepu_website", req.interest.lower().replace(" ", "_") if req.interest else "general"],
        notes=req.message or None,
    )
    db.add(lead)
    await db.flush()
    await db.refresh(lead)

    notif = Notification(
        title=f"Uniepu 新询盘: {req.name}",
        message=f"{req.company or ''} - {req.email or ''} - {req.interest or 'General'}",
        notification_type="lead_gen",
        is_read=False,
    )
    db.add(notif)
    await db.commit()

    return InquiryResponse(
        success=True,
        message="Thank you! We will contact you within 24 hours.",
        lead_id=str(lead.id),
    )


@router.post("/hermes-chat", response_model=HermesChatResponse)
async def hermes_chat(
    req: HermesChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Hermes AI agent chat — public endpoint, secured with origin check + rate limit + spending cap."""

    client_ip = request.client.host if request.client else "unknown"

    # 1. Origin/Referrer validation (production safety)
    if not _check_origin(request):
        _log_security(request, "BLOCKED", "Origin/Referer not allowed")
        raise HTTPException(status_code=403, detail="Access denied. Requests from this origin are not permitted.")

    # 2. Rate limiting (per IP)
    if not _check_rate_limit(client_ip):
        _log_security(request, "RATE_LIMITED")
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")

    # 3. Audit log
    _log_security(request, "ALLOWED")

    # Session management
    session_id = req.session_id or str(uuid.uuid4())
    conv_id = None
    try:
        conv_id = uuid.UUID(session_id)
    except ValueError:
        conv_id = None

    llm = LLMService(db)

    if llm.enabled:
        # Check daily spending cap before sending to API
        if not _check_spending_cap(tokens=0):
            _log_security(request, "BUDGET_EXCEEDED")
            reply = _fallback_reply(req.message)
            return HermesChatResponse(reply=reply, session_id=session_id)

        try:
            result = await llm.chat(
                user_id=f"hermes_{client_ip}",
                message=req.message,
                conversation_id=conv_id,
                system_prompt=HERMES_SYSTEM_PROMPT,
                temperature=0.7,
            )
            reply = result.get("reply", "")
            new_session = str(result.get("conversation_id", session_id))

            # Track tokens used
            usage = result.get("usage", {})
            total_tokens = usage.get("total_tokens", 0)
            _check_spending_cap(tokens=total_tokens)

            return HermesChatResponse(reply=reply, session_id=new_session)
        except Exception as e:
            logger.warning(f"LLM chat failed, falling back: {e}")

    # Fallback: rule-based response (zero cost, still works)
    reply = _fallback_reply(req.message)
    return HermesChatResponse(reply=reply, session_id=session_id)
