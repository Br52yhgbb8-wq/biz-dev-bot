
import os
import pickle
import base64
import uuid
from datetime import datetime, timezone
from email.mime.text import MIMEText
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import settings


# OAuth scopes needed for Gmail API
SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.readonly",
]

# Paths for OAuth credential file and token cache
CREDENTIALS_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "gmail_credentials.json"
)
TOKEN_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "gmail_token.pickle"
)


class GmailService:
    """Service for interacting with Gmail API."""

    def __init__(self):
        self._creds: Optional[Credentials] = None

    @property
    def credentials_exist(self) -> bool:
        return os.path.exists(CREDENTIALS_PATH)

    @property
    def is_authenticated(self) -> bool:
        if self._creds:
            return self._creds.valid
        return os.path.exists(TOKEN_PATH)

    def get_auth_url(self, redirect_uri: str) -> str:
        """Generate Google OAuth authorization URL."""
        if not os.path.exists(CREDENTIALS_PATH):
            raise FileNotFoundError(
                "gmail_credentials.json not found. "
                "Download it from Google Cloud Console and place it in the backend/ directory."
            )
        flow = Flow.from_client_secrets_file(CREDENTIALS_PATH, scopes=SCOPES)
        flow.redirect_uri = redirect_uri
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        return auth_url

    def handle_callback(self, auth_code: str, redirect_uri: str) -> dict:
        """Exchange authorization code for tokens."""
        flow = Flow.from_client_secrets_file(CREDENTIALS_PATH, scopes=SCOPES)
        flow.redirect_uri = redirect_uri
        flow.fetch_token(code=auth_code)
        self._creds = flow.credentials
        self._save_token()
        return {"email": self._get_user_email()}

    def _load_token(self):
        if os.path.exists(TOKEN_PATH):
            with open(TOKEN_PATH, "rb") as f:
                self._creds = pickle.load(f)

    def _save_token(self):
        with open(TOKEN_PATH, "wb") as f:
            pickle.dump(self._creds, f)

    def _ensure_authenticated(self):
        """Refresh token if needed."""
        if not self._creds:
            self._load_token()
        if not self._creds:
            raise RuntimeError("Not authenticated. Run Gmail OAuth flow first.")
        if self._creds.expired and self._creds.refresh_token:
            self._creds.refresh(Request())
            self._save_token()

    def _get_user_email(self) -> str:
        """Get the authenticated user's email address."""
        self._ensure_authenticated()
        service = build("gmail", "v1", credentials=self._creds)
        profile = service.users().getProfile(userId="me").execute()
        return profile.get("emailAddress", "")

    def _build_service(self):
        self._ensure_authenticated()
        return build("gmail", "v1", credentials=self._creds)

    def send_email(self, to: list[str], subject: str, body_text: str,
                   cc: Optional[list[str]] = None, body_html: Optional[str] = None) -> dict:
        """Send an email via Gmail API."""
        service = self._build_service()
        message = MIMEText(body_text, "plain" if not body_html else "html", "utf-8")
        message["To"] = ", ".join(to)
        message["Subject"] = subject
        if cc:
            message["Cc"] = ", ".join(cc)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        sent = service.users().messages().send(
            userId="me", body={"raw": raw}
        ).execute()
        return {
            "id": sent["id"],
            "thread_id": sent["threadId"],
            "label_ids": sent.get("labelIds", []),
        }

    def list_threads(self, max_results: int = 20, query: str = "") -> list[dict]:
        """List Gmail threads (inbox)."""
        service = self._build_service()
        results = service.users().threads().list(
            userId="me", maxResults=max_results, q=query
        ).execute()
        threads = results.get("threads", [])
        result = []
        for t in threads:
            detail = service.users().threads().get(userId="me", id=t["id"]).execute()
            messages = detail.get("messages", [])
            if not messages:
                continue
            first = messages[0]
            payload = first.get("payload", {})
            headers = {h["name"]: h["value"] for h in payload.get("headers", [])}
            result.append({
                "id": t["id"],
                "subject": headers.get("Subject", "(No Subject)"),
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "date": headers.get("Date", ""),
                "snippet": first.get("snippet", ""),
                "message_count": len(messages),
                "label_ids": first.get("labelIds", []),
            })
        return result

    def get_thread(self, thread_id: str) -> dict:
        """Get full thread details including all messages."""
        service = self._build_service()
        thread = service.users().threads().get(userId="me", id=thread_id).execute()
        messages = []
        for msg in thread.get("messages", []):
            payload = msg.get("payload", {})
            headers = {h["name"]: h["value"] for h in payload.get("headers", [])}
            body = ""
            if "parts" in payload:
                for part in payload["parts"]:
                    if part.get("mimeType") == "text/plain" and "data" in part.get("body", {}):
                        body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
                        break
            elif "data" in payload.get("body", {}):
                body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
            messages.append({
                "id": msg["id"],
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "subject": headers.get("Subject", "(No Subject)"),
                "date": headers.get("Date", ""),
                "body": body[:10000],  # truncate for API
                "label_ids": msg.get("labelIds", []),
            })
        return {"id": thread_id, "messages": messages}

    def sync_inbox(self, db: AsyncSession, max_results: int = 50) -> dict:
        """Sync Gmail inbox to local database.

        This is a stub - full implementation requires async execution.
        For now, returns threads that would be synced.
        """
        threads = self.list_threads(max_results=max_results, query="in:inbox")
        return {"synced": len(threads), "threads": threads}
