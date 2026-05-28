"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "editor", "viewer", "owner", name="userrole"), nullable=False, server_default="viewer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.Enum("youtube", "instagram", "tiktok", name="accounttype"), nullable=False),
        sa.Column("platform_account_id", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "niches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("content_pillars", sa.Text(), nullable=True),
        sa.Column("audience_persona", sa.Text(), nullable=True),
        sa.Column("hook_formulas", sa.Text(), nullable=True),
        sa.Column("visual_style_guide", sa.Text(), nullable=True),
        sa.Column("caption_style", sa.Text(), nullable=True),
        sa.Column("hashtag_style", sa.Text(), nullable=True),
        sa.Column("monetization_angle", sa.Text(), nullable=True),
        sa.Column("content_safety_rules", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "platform_credentials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True),
        sa.Column("platform", sa.Enum("youtube", "instagram", "tiktok", name="platformtype"), nullable=False),
        sa.Column("credential_data", sa.Text(), nullable=False),
        sa.Column("is_expired", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "trends",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("niche_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("niches.id", ondelete="SET NULL"), nullable=True),
        sa.Column("trend_name", sa.String(500), nullable=False),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("audience_emotion", sa.String(255), nullable=True),
        sa.Column("virality_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("competition_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("originality_angle", sa.Text(), nullable=True),
        sa.Column("suggested_hook", sa.Text(), nullable=True),
        sa.Column("suggested_title", sa.String(500), nullable=True),
        sa.Column("suggested_hashtags", sa.Text(), nullable=True),
        sa.Column("risk_notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "ideas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("niche_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("niches.id", ondelete="SET NULL"), nullable=True),
        sa.Column("trend_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trends.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.Enum("draft", "approved", "rejected", "in_production", "completed", name="ideastatus"), nullable=False, server_default="draft"),
        sa.Column("video_title", sa.String(500), nullable=False),
        sa.Column("hook_1s", sa.String(500), nullable=True),
        sa.Column("hook_3s", sa.String(500), nullable=True),
        sa.Column("full_script", sa.Text(), nullable=True),
        sa.Column("storyboard", sa.Text(), nullable=True),
        sa.Column("voiceover_text", sa.Text(), nullable=True),
        sa.Column("on_screen_text", sa.Text(), nullable=True),
        sa.Column("broll_prompt", sa.Text(), nullable=True),
        sa.Column("motion_graphics_prompt", sa.Text(), nullable=True),
        sa.Column("caption_text", sa.Text(), nullable=True),
        sa.Column("hashtags", sa.Text(), nullable=True),
        sa.Column("call_to_action", sa.String(500), nullable=True),
        sa.Column("estimated_duration", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("target_audience", sa.String(500), nullable=True),
        sa.Column("platform_adjustments", sa.Text(), nullable=True),
        sa.Column("monetization_potential", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("risk_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "scripts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("idea_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hook_type", sa.String(100), nullable=True),
        sa.Column("hook_text", sa.String(500), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("payoff_text", sa.String(500), nullable=True),
        sa.Column("call_to_action", sa.String(500), nullable=True),
        sa.Column("full_script", sa.Text(), nullable=False),
        sa.Column("estimated_duration_seconds", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("scene_breakdown", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "videos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("idea_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ideas.id", ondelete="SET NULL"), nullable=True),
        sa.Column("script_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("scripts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.Enum("draft", "generating", "completed", "failed", "queued_for_review", "approved", "rejected", name="videostatus"), nullable=False, server_default="draft"),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_path", sa.String(500), nullable=True),
        sa.Column("thumbnail_path", sa.String(500), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("resolution_width", sa.Integer(), nullable=False, server_default=sa.text("1080")),
        sa.Column("resolution_height", sa.Integer(), nullable=False, server_default=sa.text("1920")),
        sa.Column("fps", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("video_codec", sa.String(50), nullable=False, server_default="h264"),
        sa.Column("audio_codec", sa.String(50), nullable=False, server_default="aac"),
        sa.Column("render_log", sa.Text(), nullable=True),
        sa.Column("is_duplicate", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("duplicate_of", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="SET NULL"), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=True),
        sa.Column("asset_type", sa.Enum("image", "video", "audio", "font", "thumbnail", name="assettype"), nullable=False),
        sa.Column("source", sa.Enum("generated", "stock", "uploaded", "local", name="assetsource"), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("local_path", sa.String(500), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("license_type", sa.String(100), nullable=True),
        sa.Column("attribution", sa.Text(), nullable=True),
        sa.Column("checksum", sa.String(64), nullable=True),
        sa.Column("is_processed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "quality_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("hook_strength", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("retention_potential", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("visual_quality", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("audio_quality", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("originality", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("platform_compliance", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("caption_readability", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("trend_relevance", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("shareability", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("saveability", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("brand_safety", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("monetization_suitability", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("overall_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("details_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "compliance_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("is_script_original", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("uses_copyrighted_clips", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("music_licensed", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("reuploads_others_content", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_repetitive", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claims_verified", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_misleading", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_advertiser_friendly", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_safe_for_teens", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("avoids_harmful_content", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("overall_compliance_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("risk_flags", sa.Text(), nullable=True),
        sa.Column("source_notes", sa.Text(), nullable=True),
        sa.Column("is_pass", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "publishing_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=True),
        sa.Column("action", sa.Enum("publish_youtube", "publish_instagram", "generate_video", "research_trends", "generate_ideas", "score_quality", "check_compliance", name="jobaction"), nullable=False),
        sa.Column("status", sa.Enum("pending", "processing", "completed", "failed", "retrying", "cancelled", name="jobstatus"), nullable=False, server_default="pending"),
        sa.Column("platform", sa.String(50), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default=sa.text("3")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("result_data", sa.Text(), nullable=True),
        sa.Column("queue_name", sa.String(100), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "published_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="SET NULL"), nullable=True),
        sa.Column("platform", sa.Enum("youtube", "instagram", name="postplatform"), nullable=False),
        sa.Column("platform_post_id", sa.String(255), nullable=False),
        sa.Column("platform_url", sa.Text(), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("hashtags", sa.Text(), nullable=True),
        sa.Column("privacy_status", sa.String(50), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_processed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("platform_data", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "analytics_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("published_post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("published_posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("views", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("watch_time_seconds", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("average_view_duration_seconds", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("retention_percentage", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("likes", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("comments", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("shares", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("saves", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("subscribers_gained", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("click_through_rate", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("revenue_amount", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("revenue_currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("impressions", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("reach", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("data_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "experiments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("niche_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("niches.id", ondelete="SET NULL"), nullable=True),
        sa.Column("experiment_type", sa.Enum("hook", "title", "caption", "hashtag", "thumbnail", "video_length", "voice_style", "caption_style", "music_mood", "posting_time", name="experimenttype"), nullable=False),
        sa.Column("status", sa.Enum("draft", "running", "completed", "cancelled", name="experimentstatus"), nullable=False, server_default="draft"),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("variant_a_data", sa.Text(), nullable=True),
        sa.Column("variant_b_data", sa.Text(), nullable=True),
        sa.Column("winner", sa.String(10), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("min_sample_size", sa.Integer(), nullable=False, server_default=sa.text("100")),
        sa.Column("results_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "revenue_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("published_post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("published_posts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source", sa.Enum("youtube_ads", "youtube_shorts", "affiliate", "sponsorship", "digital_product", "newsletter", "other", name="revenuesource"), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_estimated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("platform_data", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("publishing_jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("level", sa.Enum("debug", "info", "warning", "error", "critical", name="loglevel"), nullable=False),
        sa.Column("action", sa.Enum("trend_research", "idea_generation", "script_writing", "video_rendering", "quality_score", "compliance_check", "publishing", "analytics_collection", "experiment_run", "system", "auth", "settings_change", name="logaction"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key", sa.String(255), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_encrypted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "brand_kits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("channel_name", sa.String(255), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("primary_color", sa.String(7), nullable=False, server_default="#FF0000"),
        sa.Column("secondary_color", sa.String(7), nullable=False, server_default="#000000"),
        sa.Column("font_family", sa.String(255), nullable=False, server_default="Inter"),
        sa.Column("font_url", sa.Text(), nullable=True),
        sa.Column("voice_style", sa.String(100), nullable=True),
        sa.Column("caption_style", sa.String(100), nullable=True),
        sa.Column("tone", sa.String(100), nullable=True),
        sa.Column("cta_style", sa.String(100), nullable=True),
        sa.Column("watermark_enabled", sa.String(10), nullable=True),
        sa.Column("watermark_url", sa.Text(), nullable=True),
        sa.Column("intro_clip_path", sa.String(500), nullable=True),
        sa.Column("outro_clip_path", sa.String(500), nullable=True),
        sa.Column("target_audience", sa.Text(), nullable=True),
        sa.Column("brand_guidelines", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("brand_kits")
    op.drop_table("settings")
    op.drop_table("logs")
    op.drop_table("revenue_records")
    op.drop_table("experiments")
    op.drop_table("analytics_snapshots")
    op.drop_table("published_posts")
    op.drop_table("publishing_jobs")
    op.drop_table("compliance_reports")
    op.drop_table("quality_scores")
    op.drop_table("assets")
    op.drop_table("videos")
    op.drop_table("scripts")
    op.drop_table("ideas")
    op.drop_table("trends")
    op.drop_table("platform_credentials")
    op.drop_table("niches")
    op.drop_table("accounts")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS accounttype")
    op.execute("DROP TYPE IF EXISTS platformtype")
    op.execute("DROP TYPE IF EXISTS ideastatus")
    op.execute("DROP TYPE IF EXISTS videostatus")
    op.execute("DROP TYPE IF EXISTS assettype")
    op.execute("DROP TYPE IF EXISTS assetsource")
    op.execute("DROP TYPE IF EXISTS jobaction")
    op.execute("DROP TYPE IF EXISTS jobstatus")
    op.execute("DROP TYPE IF EXISTS postplatform")
    op.execute("DROP TYPE IF EXISTS experimenttype")
    op.execute("DROP TYPE IF EXISTS experimentstatus")
    op.execute("DROP TYPE IF EXISTS revenuesource")
    op.execute("DROP TYPE IF EXISTS loglevel")
    op.execute("DROP TYPE IF EXISTS logaction")
