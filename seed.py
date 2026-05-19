"""
Seed script — başlangıç kullanıcılarını oluşturur.
Çalıştır: python seed.py
"""
import asyncio
from sqlalchemy import select
from core.database import AsyncSessionLocal, engine, Base
from core.security import hash_password
from models.user import User, UserRole


SEED_USERS = [
    {
        "username": "admin",
        "email": "admin@hestest.com",
        "password": "Admin123!",
        "role": UserRole.ADMIN,
    },
    {
        "username": "operator1",
        "email": "operator1@hestest.com",
        "password": "Operator123!",
        "role": UserRole.OPERATOR,
    },
    {
        "username": "engineer1",
        "email": "engineer1@hestest.com",
        "password": "Engineer123!",
        "role": UserRole.ENGINEER,
    },
    {
        "username": "technician1",
        "email": "technician1@hestest.com",
        "password": "Tech123!",
        "role": UserRole.TECHNICIAN,
    },
    {
        "username": "manager1",
        "email": "manager1@hestest.com",
        "password": "Manager123!",
        "role": UserRole.MANAGER,
    },
]


async def seed():
    # Tabloları oluştur
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        for u in SEED_USERS:
            # Zaten varsa geç
            result = await db.execute(
                select(User).where(User.username == u["username"])
            )
            if result.scalar_one_or_none():
                print(f"⏭  {u['username']} zaten var, geçiliyor.")
                continue

            user = User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
            )
            db.add(user)
            print(f"✅ {u['username']} ({u['role']}) oluşturuldu.")

        await db.commit()

    print("\n🎉 Seed tamamlandı!")
    print("\nTest kullanıcıları:")
    for u in SEED_USERS:
        print(f"  {u['role']:12} → {u['username']} / {u['password']}")


if __name__ == "__main__":
    asyncio.run(seed())
