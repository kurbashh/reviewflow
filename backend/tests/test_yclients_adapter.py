import unittest

from app.services.crm_adapters.yclients import map_yclients_payload


class YClientsAdapterTests(unittest.TestCase):
    def test_maps_nested_payload_to_intake_shape(self) -> None:
        payload = {
            "event": "visit.completed",
            "secret": "crm-secret",
            "data": {
                "client": {"name": "Алия", "phone": "+77011234567"},
                "service": {"name": "Маникюр"},
                "master": {"name": "Света"},
                "location": {"id": "location-123"},
            },
        }

        normalized = map_yclients_payload(payload, "business-1")

        self.assertEqual(normalized["business_id"], "business-1")
        self.assertEqual(normalized["client_phone"], "+77011234567")
        self.assertEqual(normalized["client_name"], "Алия")
        self.assertEqual(normalized["service_name"], "Маникюр")
        self.assertEqual(normalized["master_name"], "Света")
        self.assertEqual(normalized["location_id"], "location-123")
        self.assertEqual(normalized["secret"], "crm-secret")


if __name__ == "__main__":
    unittest.main()
