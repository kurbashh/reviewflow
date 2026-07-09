import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import uuid

from app.services.ai_review import generate_master_insight
from app.services.crud import get_business_masters, get_master_rating_timeseries


class MasterAnalyticsTests(unittest.IsolatedAsyncioTestCase):
    def test_generate_master_insight_fallback(self) -> None:
        # Если оценок < 3, ИИ не должен вызываться, возвращается заглушка
        insight = generate_master_insight(
            master_name="Данияр",
            total_rated=2,
            avg_rating=3.0,
            positive_count=0,
            negative_count=2,
            complaint_samples=["Опоздал"]
        )
        self.assertEqual(insight, "Пока недостаточно оценок для анализа.")

    @patch("app.services.ai_review._get_client")
    def test_generate_master_insight_success(self, mock_get_client: MagicMock) -> None:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="У мастера Света хорошие отзывы."))]
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        insight = generate_master_insight(
            master_name="Света",
            total_rated=5,
            avg_rating=4.8,
            positive_count=5,
            negative_count=0,
            complaint_samples=[]
        )
        
        self.assertEqual(insight, "У мастера Света хорошие отзывы.")
        mock_client.chat.completions.create.assert_called_once()
        call_args = mock_client.chat.completions.create.call_args[1]
        self.assertIn("Света", call_args["messages"][0]["content"])
        self.assertIn("5", call_args["messages"][0]["content"])

    async def test_get_business_masters_db_mock(self) -> None:
        mock_session = AsyncMock()
        mock_result = MagicMock()
        
        # Мокаем строки, возвращаемые из БД
        row1 = MagicMock(name="Света", review_count=10, avg_rating=4.5, negative_count=1)
        row1.name = "Света"
        row2 = MagicMock(name="Данияр", review_count=5, avg_rating=3.0, negative_count=3)
        row2.name = "Данияр"
        
        mock_result.all.return_value = [row1, row2]
        mock_session.execute.return_value = mock_result
        
        business_id = uuid.uuid4()
        masters = await get_business_masters(mock_session, business_id)
        
        self.assertEqual(len(masters), 2)
        self.assertEqual(masters[0]["name"], "Света")
        self.assertEqual(masters[0]["review_count"], 10)
        self.assertEqual(masters[1]["name"], "Данияр")
        self.assertEqual(masters[1]["negative_count"], 3)


if __name__ == "__main__":
    unittest.main()
