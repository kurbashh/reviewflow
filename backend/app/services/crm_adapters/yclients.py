from __future__ import annotations

from typing import Any


def map_yclients_payload(payload: dict[str, Any], business_id: str) -> dict[str, Any]:
    """Map YClients webhook payload into the internal intake format."""
    data = payload.get("data") or {}
    client = data.get("client") or {}
    service = data.get("service") or {}
    master = data.get("master") or {}
    location = data.get("location") or {}

    return {
        "business_id": business_id,
        "client_phone": client.get("phone") or client.get("mobile") or "",
        "client_name": client.get("name"),
        "service_name": service.get("name"),
        "master_name": master.get("name"),
        "location_id": location.get("id"),
        "secret": payload.get("secret"),
    }
