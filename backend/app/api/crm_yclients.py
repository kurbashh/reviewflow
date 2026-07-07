from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel
from typing import Any

from app.api.webhooks import webhook_intake, WebhookIntakePayload
from app.db.session import get_session
from app.services.crm_adapters.yclients import map_yclients_payload

router = APIRouter()


class YClientsWebhookPayload(BaseModel):
    data: dict[str, Any] | None = None
    secret: str | None = None
    
    model_config = {"extra": "ignore"}


@router.post("/webhook/crm/yclients/{business_id}")
async def yclients_webhook(
    business_id: str,
    payload: YClientsWebhookPayload,
    session: AsyncSession = Depends(get_session),
):
    normalized = map_yclients_payload(payload.model_dump(), business_id)
    # Ensure location_id is string if present, as WebhookIntakePayload expects str
    if normalized.get("location_id") is not None:
        normalized["location_id"] = str(normalized["location_id"])
    return await webhook_intake(WebhookIntakePayload(**normalized), session)
