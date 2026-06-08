"""
Unified Seed Script
Auth + SCADA seed data
Çalıştır:
python seed.py
"""

import asyncio

from sqlalchemy import select

from app.database.database import AsyncSessionLocal
from app.database.database import engine
from app.database.database import Base

from app.core.security import hash_password

from app.models.user import User
from app.models.user import UserRole

from app.models.turbine import Turbine
from app.models.sensor import Sensor
from app.models.water_gate import WaterGate
from app.services.water_gate_seed import DEFAULT_WATER_GATES
from app.services.water_gate_seed import ensure_default_water_gates


# =========================
# AUTH USERS
# =========================

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


# =========================
# TURBINES
# =========================

SEED_TURBINES = [
    {
        "turbine_name": "Turbine-1",
        "status": "ACTIVE",
        "rpm": 1450,
        "temperature": 67.5,
        "power_output": 120.4,
    },
    {
        "turbine_name": "Turbine-2",
        "status": "WARNING",
        "rpm": 1510,
        "temperature": 71.2,
        "power_output": 132.8,
    },
]


# =========================
# SENSORS
# =========================

SEED_SENSORS = [
    {
        "sensor_name": "Temperature Sensor T1",
        "sensor_type": "TEMPERATURE",
        "current_value": 67.5,
        "status": "ACTIVE",
        "turbine_name": "Turbine-1",
    },
    {
        "sensor_name": "RPM Sensor T1",
        "sensor_type": "RPM",
        "current_value": 1450,
        "status": "ACTIVE",
        "turbine_name": "Turbine-1",
    },
    {
        "sensor_name": "Vibration Sensor T2",
        "sensor_type": "VIBRATION",
        "current_value": 91.4,
        "status": "WARNING",
        "turbine_name": "Turbine-2",
    },
]


# =========================
# WATER GATES
# =========================

SEED_WATER_GATES = DEFAULT_WATER_GATES


async def seed():

    # =========================
    # CREATE TABLES
    # =========================

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:

        # =========================
        # USERS
        # =========================

        for u in SEED_USERS:

            result = await db.execute(
                select(User).where(
                    User.username == u["username"]
                )
            )

            if result.scalar_one_or_none():
                print(f"⏭ {u['username']} zaten var.")
                continue

            user = User(
                username=u["username"],
                email=u["email"],
                hashed_password=hash_password(
                    u["password"]
                ),
                role=u["role"],
            )

            db.add(user)

            print(
                f"✅ User oluşturuldu: {u['username']}"
            )
            
        await db.commit()

        print("✅ Users committed")

        # =========================
        # TURBINES
        # =========================

        for t in SEED_TURBINES:

            result = await db.execute(
                select(Turbine).where(
                    Turbine.turbine_name
                    == t["turbine_name"]
                )
            )

            if result.scalars().first():
                print(
                    f"⏭ {t['turbine_name']} zaten var."
                )
                continue

            turbine = Turbine(
                turbine_name=t["turbine_name"],
                status=t["status"],
                rpm=t["rpm"],
                temperature=t["temperature"],
                power_output=t["power_output"],
            )

            db.add(turbine)

            print(
                f"✅ Turbine oluşturuldu: "
                f"{t['turbine_name']}"
            )

        await db.commit()

        # =========================
        # WATER GATES
        # =========================

        await ensure_default_water_gates(db)

        for g in SEED_WATER_GATES:

            result = await db.execute(
                select(WaterGate).where(
                    WaterGate.gate_name == g["gate_name"]
                )
            )

            if result.scalar_one_or_none():
                print(
                    f"â­ {g['gate_name']} zaten var."
                )
                continue

            gate = WaterGate(
                gate_name=g["gate_name"],
                open_percentage=g["open_percentage"],
                status=g["status"],
            )

            db.add(gate)

            print(
                f"âœ… Water gate oluÅŸturuldu: "
                f"{g['gate_name']}"
            )

        await db.commit()

        # =========================
        # SENSORS
        # =========================

        for s in SEED_SENSORS:

            turbine_result = await db.execute(
                select(Turbine).where(
                    Turbine.turbine_name
                    == s["turbine_name"]
                )
            )

            turbine = turbine_result.scalars().first()

            result = await db.execute(
                select(Sensor).where(
                    Sensor.sensor_name
                    == s["sensor_name"]
                )
            )

            if result.scalar_one_or_none():
                print(
                    f"⏭ {s['sensor_name']} zaten var."
                )
                continue

            sensor = Sensor(
                sensor_name=s["sensor_name"],
                sensor_type=s["sensor_type"],
                current_value=s["current_value"],
                status=s["status"],
                turbine_id=turbine.id,
            )

            db.add(sensor)

            print(
                f"✅ Sensor oluşturuldu: "
                f"{s['sensor_name']}"
            )

        await db.commit()

    print("\n🎉 Seed tamamlandı!")

    print("\n👤 Test kullanıcıları (şifreler güvenlik için gösterilmiyor):")

    for u in SEED_USERS:
        print(
            f"{u['role']:12} → "
            f"{u['username']}"
        )


if __name__ == "__main__":
    asyncio.run(seed())
