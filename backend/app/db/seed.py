import uuid
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import Business, Location, ReviewRequest, ReviewRequestStatus, BusinessPlan, BusinessStatus, CrmType

BUSINESS_ID = "b1111111-1111-1111-1111-111111111111"

def seed_db():
    print("Starting database seeding...")
    session: Session = SyncSessionLocal()
    try:
        # 1. Create or get Business
        business = session.get(Business, uuid.UUID(BUSINESS_ID))
        if not business:
            business = Business(
                id=uuid.UUID(BUSINESS_ID),
                name="BeautyLab Almaty",
                category="Салон красоты",
                phone="+77011234567",
                plan=BusinessPlan.STANDARD,
                status=BusinessStatus.TRIAL,
                gis_2gis_url="https://2gis.kz/almaty/firm/70000001018652431",
                yandex_maps_url="https://yandex.kz/maps/162/almaty/house/dostyk_avenue_105/Y08Yfg9mSUcDQFppfX13cXhrbQ==",
                telegram_chat_id="123456789",
                crm_type=CrmType.YCLIENTS,
                crm_webhook_secret="super-secret-key-123",
            )
            session.add(business)
            session.commit()
            print(f"Created test business: {business.name}")
        else:
            print(f"Test business '{business.name}' already exists.")

        # 2. Create or get Locations
        locations = session.query(Location).filter_by(business_id=business.id).all()
        if not locations:
            loc1 = Location(
                id=uuid.uuid4(),
                business_id=business.id,
                name="Филиал на Достык",
                redirect_slug="beauty-dostyk",
                gis_2gis_url="https://2gis.kz/almaty/firm/70000001018652431",
                yandex_maps_url="https://yandex.kz/maps/162/almaty/house/dostyk_avenue_105/Y08Yfg9mSUcDQFppfX13cXhrbQ==",
            )
            loc2 = Location(
                id=uuid.uuid4(),
                business_id=business.id,
                name="Филиал на Абая",
                redirect_slug="beauty-abay",
                gis_2gis_url="https://2gis.kz/almaty/firm/70000001018652432",
                yandex_maps_url="https://yandex.kz/maps/162/almaty/house/abay_avenue_50/Y08Yfg9mSUcDQFppfX13cXhrbQ==",
            )
            session.add_all([loc1, loc2])
            session.commit()
            locations = [loc1, loc2]
            print("Created test locations.")
        else:
            print(f"Locations already exist ({len(locations)} found).")

        # 3. Create Review Requests if count is low
        req_count = session.query(ReviewRequest).filter_by(business_id=business.id).count()
        if req_count < 10:
            print("Generating mock review requests...")
            
            names = ["Алия", "Мадина", "Данияр", "Руслан", "Айгерим", "Сабина", "Нурлан", "Тимур", "Алихан", "Жанель", "Диана", "Ерлан"]
            services = ["Стрижка женская", "Маникюр", "Педикюр", "Окрашивание волос", "Массаж лица", "Стрижка мужская", "Укладка"]
            masters = ["Елена", "Айгуль", "Алексей", "Ольга", "Светлана", "Мария", "Кайрат"]
            feedbacks_low = [
                "Мастер опоздал на 15 минут.",
                "Не понравилось отношение администратора.",
                "Сделали не то, что я просила.",
                "Было больно во время процедуры маникюра.",
                "Грязно в кабинете.",
                "Слишком завышена цена для такого уровня.",
            ]
            reviews_high = [
                "Отличный сервис! Мастер Айгуль сделала шикарный маникюр, очень аккуратно и быстро.",
                "Очень довольна стрижкой. Обязательно вернусь сюда снова.",
                "Приятная атмосфера, вежливый персонал и отличный кофе. Рекомендую филиал на Достык!",
                "Мастер Алексей профессионал своего дела. Стрижка супер!",
                "Хороший салон, чисто, аккуратно, приветливый администратор.",
            ]

            now = datetime.now(timezone.utc)
            
            # Generate requests spread over the last 10 days
            for i in range(40):
                days_ago = random.randint(0, 8)
                created_time = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
                
                loc = random.choice(locations)
                client_name = random.choice(names)
                service = random.choice(services)
                master = random.choice(masters)
                
                # Determine status and rating
                rand_val = random.random()
                if rand_val < 0.15:
                    # PENDING
                    status = ReviewRequestStatus.PENDING
                    rating = None
                    generated_review = None
                    owner_feedback = None
                    sent_at = None
                    responded_at = None
                    completed_at = None
                elif rand_val < 0.30:
                    # SENT
                    status = ReviewRequestStatus.SENT
                    rating = None
                    generated_review = None
                    owner_feedback = None
                    sent_at = created_time + timedelta(minutes=15)
                    responded_at = None
                    completed_at = None
                elif rand_val < 0.75:
                    # COMPLETED High Rating (4 or 5)
                    status = ReviewRequestStatus.COMPLETED
                    rating = random.choice([4, 5])
                    generated_review = random.choice(reviews_high)
                    owner_feedback = None
                    sent_at = created_time + timedelta(minutes=15)
                    responded_at = sent_at + timedelta(minutes=random.randint(5, 60))
                    completed_at = responded_at + timedelta(seconds=5)
                elif rand_val < 0.90:
                    # COMPLETED Low Rating (1-3) with owner feedback
                    status = ReviewRequestStatus.COMPLETED
                    rating = random.choice([1, 2, 3])
                    generated_review = None
                    owner_feedback = random.choice(feedbacks_low)
                    sent_at = created_time + timedelta(minutes=15)
                    responded_at = sent_at + timedelta(minutes=random.randint(5, 60))
                    completed_at = responded_at + timedelta(minutes=random.randint(10, 120))
                else:
                    # AWAITING_FEEDBACK Low Rating (1-3), waiting for customer details
                    status = ReviewRequestStatus.AWAITING_FEEDBACK
                    rating = random.choice([1, 2, 3])
                    generated_review = None
                    owner_feedback = None
                    sent_at = created_time + timedelta(minutes=15)
                    responded_at = sent_at + timedelta(minutes=random.randint(5, 60))
                    completed_at = None

                req = ReviewRequest(
                    id=uuid.uuid4(),
                    business_id=business.id,
                    location_id=loc.id,
                    client_phone=f"+7707{random.randint(1000000, 9999999)}",
                    client_name=client_name,
                    service_name=service,
                    master_name=master,
                    status=status,
                    rating=rating,
                    generated_review=generated_review,
                    owner_feedback=owner_feedback,
                    sent_at=sent_at,
                    responded_at=responded_at,
                    completed_at=completed_at,
                    created_at=created_time,
                )
                session.add(req)
                
            session.commit()
            print("Successfully seeded database with mock review requests.")
        else:
            print(f"Review requests already exist ({req_count} found).")

    except Exception as e:
        session.rollback()
        print(f"An error occurred: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_db()
