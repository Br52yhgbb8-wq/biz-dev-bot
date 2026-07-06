from .user import User, UserRole
from .base import Base
from .contact import Contact
from .pipeline import Pipeline
from .activity import Activity
from .campaign import Campaign
from .email_message import EmailMessage, EmailTemplate
from .scheduled_task import ScheduledTask
from .notification import Notification
from .attachment import Attachment
from .conversation import Conversation, Message
from .lead import Lead

__all__ = [
    "Base", "Contact", "Pipeline", "Activity",
    "Campaign", "EmailMessage", "EmailTemplate",
    "ScheduledTask", "User", "UserRole",
    "Notification", "Attachment",
    "Conversation", "Message",
    "Lead",
]
