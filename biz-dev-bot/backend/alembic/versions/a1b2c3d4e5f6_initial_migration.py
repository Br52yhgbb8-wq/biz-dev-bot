"""initial migration

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-24 13:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.engine import reflection

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _is_sqlite() -> bool:
    """Check if the migration is running against SQLite."""
    bind = op.get_bind()
    return bind.dialect.name == "sqlite"


def _uuid_type():
    if _is_sqlite():
        return sa.String(32)
    return UUID(as_uuid=True)


def _json_type():
    if _is_sqlite():
        return sa.JSON()
    return JSONB()


def _uuid_default():
    if _is_sqlite():
        return sa.text("(lower(hex(randomblob(16))))")
    return sa.text("gen_random_uuid()")


def _jsonb_default(expr: str) -> sa.TextClause:
    if _is_sqlite():
        return sa.text(f"'{expr}'")
    return sa.text(f"'{expr}'::jsonb")


def _now_default():
    return sa.func.now()


def _bool_false():
    if _is_sqlite():
        return sa.text("0")
    return sa.text("false")


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("username", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("admin", "manager", "member", name="user_role", create_constraint=False),
            nullable=False,
            server_default="member",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- contacts ---
    op.create_table(
        "contacts",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("company", sa.String(255), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), nullable=True, index=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("linkedin_url", sa.String(500), nullable=True),
        sa.Column("linkedin_profile", _json_type(), nullable=True, server_default=_jsonb_default("{}")),
        sa.Column("source", sa.String(50), nullable=False, server_default="manual"),
        sa.Column("tags", _json_type(), nullable=True, server_default=_jsonb_default("[]")),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- pipelines ---
    op.create_table(
        "pipelines",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("contact_id", _uuid_type(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage", sa.String(50), nullable=False, server_default="discovery"),
        sa.Column("deal_value", sa.Numeric(12, 2), nullable=True),
        sa.Column("probability", sa.Integer, nullable=True),
        sa.Column("expected_close_date", sa.Date, nullable=True),
        sa.Column("owner_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- email_templates ---
    op.create_table(
        "email_templates",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("body_text", sa.Text, nullable=False),
        sa.Column("body_html", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- campaigns ---
    op.create_table(
        "campaigns",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("target_filter", _json_type(), nullable=True),
        sa.Column("email_template_id", _uuid_type(), sa.ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sequence", _json_type(), nullable=True, server_default=_jsonb_default("[]")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- email_messages ---
    op.create_table(
        "email_messages",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("contact_id", _uuid_type(), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("campaign_id", _uuid_type(), sa.ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True),
        sa.Column("thread_id", sa.String(255), nullable=True),
        sa.Column("gmail_message_id", sa.String(255), nullable=True),
        sa.Column("from_addr", sa.String(500), nullable=False),
        sa.Column("to_addrs", _json_type(), nullable=False, server_default=_jsonb_default("[]")),
        sa.Column("cc", _json_type(), nullable=True, server_default=_jsonb_default("[]")),
        sa.Column("bcc", _json_type(), nullable=True, server_default=_jsonb_default("[]")),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("body_text", sa.Text, nullable=True),
        sa.Column("body_html", sa.Text, nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("direction", sa.String(20), nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=_bool_false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- activities ---
    op.create_table(
        "activities",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("contact_id", _uuid_type(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pipeline_id", _uuid_type(), sa.ForeignKey("pipelines.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("outcome", sa.Text, nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("meta", _json_type(), nullable=True, server_default=_jsonb_default("{}")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- scheduled_tasks ---
    op.create_table(
        "scheduled_tasks",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("payload", _json_type(), nullable=True, server_default=_jsonb_default("{}")),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result", _json_type(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("notification_type", sa.String(50), nullable=False, server_default="info"),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=_bool_false()),
        sa.Column("link_url", sa.String(1000), nullable=True),
        sa.Column("username", sa.String(255), nullable=True, index=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- attachments ---
    op.create_table(
        "attachments",
        sa.Column("id", _uuid_type(), primary_key=True, server_default=_uuid_default()),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("original_name", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(200), nullable=False, server_default="application/octet-stream"),
        sa.Column("file_size", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("storage_path", sa.String(1000), nullable=False),
        sa.Column("contact_id", _uuid_type(), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("email_message_id", _uuid_type(), sa.ForeignKey("email_messages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("uploaded_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=_now_default()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=_now_default()),
    )

    # --- indexes for foreign-key columns not already covered ---
    op.create_index("ix_pipelines_contact_id", "pipelines", ["contact_id"])
    op.create_index("ix_activities_contact_id", "activities", ["contact_id"])
    op.create_index("ix_activities_pipeline_id", "activities", ["pipeline_id"])
    op.create_index("ix_email_messages_contact_id", "email_messages", ["contact_id"])
    op.create_index("ix_email_messages_campaign_id", "email_messages", ["campaign_id"])
    op.create_index("ix_attachments_contact_id", "attachments", ["contact_id"])
    op.create_index("ix_attachments_email_message_id", "attachments", ["email_message_id"])


def downgrade() -> None:
    op.drop_table("attachments")
    op.drop_table("notifications")
    op.drop_table("scheduled_tasks")
    op.drop_table("activities")
    op.drop_table("email_messages")
    op.drop_table("campaigns")
    op.drop_table("email_templates")
    op.drop_table("pipelines")
    op.drop_table("contacts")
    op.drop_table("users")
    if not _is_sqlite():
        op.execute("DROP TYPE IF EXISTS user_role")
