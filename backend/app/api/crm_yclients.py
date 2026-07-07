from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.webhooks import webhook_intake
from app.db.session import get_session
from app.services.crm_adapters.yclients import map_yclients_payload

router = APIRouter()


@router.post("/webhook/crm/yclients/{business_id}")
async def yclients_webhook(
    business_id: str,
    payload: dict,
    session: AsyncSession = Depends(get_session),
):
    normalized = map_yclients_payload(payload, business_id)
    return await webhook_intake(normalized, session)
