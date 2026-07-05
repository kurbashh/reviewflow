"""
Supabase server-side clients for FastAPI handlers.

Python equivalent of @supabase/server: admin client (service role) and
user-scoped client from the inbound Bearer JWT.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


def _require_supabase_config() -> None:
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env"
        )


@lru_cache
def get_supabase_admin() -> Client:
    """Service-role client — bypasses RLS; use only in trusted server code."""
    _require_supabase_config()
    return create_client(settings.supabase_url, settings.supabase_secret_key)


def get_supabase_for_user(access_token: str) -> Client:
    """User-scoped client — RLS applies using the caller's JWT."""
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env"
        )
    client = create_client(settings.supabase_url, settings.supabase_publishable_key)
    client.postgrest.auth(access_token)
    return client
