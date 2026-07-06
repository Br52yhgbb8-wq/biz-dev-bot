"""Auth router — database-backed user registration, login, and token verification.

Includes invite-code protection for registration and rate limiting on login.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, decode_access_token, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.rate_limiter import rate_limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()


class RegisterRequest(BaseModel):
    username: str
    password: str
    invite_code: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _parse_rate_limit(rule: str) -> tuple[int, int]:
    """Parse a rate-limit rule like '5/minute' into (max_requests, window_seconds)."""
    parts = rule.split("/")
    max_req = int(parts[0])
    unit = parts[1] if len(parts) > 1 else "minute"
    window = {"minute": 60, "second": 1, "hour": 3600}.get(unit, 60)
    return max_req, window


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user. Username must be unique.

    If INVITE_CODE is configured in environment, the invite_code field is
    required and must match.
    """
    # Check invite code if configured
    if settings.INVITE_CODE and req.invite_code != settings.INVITE_CODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid invite code. Registration is invite-only.",
        )

    result = await db.execute(select(User).where(User.username == req.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    user = User(
        username=req.username,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return a JWT token.

    Rate-limited to prevent brute-force attacks.
    """
    # Rate limiting by client IP
    client_ip = request.client.host if request.client else "unknown"
    max_req, window = _parse_rate_limit(settings.RATE_LIMIT_LOGIN)
    if not rate_limiter.check(f"login:{client_ip}", max_req, window):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again later.",
        )

    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token({"sub": user.username})
    return TokenResponse(access_token=token)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> str:
    """FastAPI dependency: validate the Bearer token and return the username.

    Verifies that the user still exists in the database and that the token
    is well-formed and not expired.
    """
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    username = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Confirm the user exists in the database
    result = await db.execute(select(User).where(User.username == username))
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return username


class UserProfileResponse(BaseModel):
    username: str
    role: str


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == current_user))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfileResponse(username=user.username, role=user.role.value)
