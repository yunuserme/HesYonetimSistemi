from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.water_gate import WaterGate


DEFAULT_WATER_GATES = [
    {
        "gate_name": "Savak Kapagi 1",
        "legacy_gate_name": "Kapak-1",
        "open_percentage": 0,
        "status": "CLOSED",
    },
    {
        "gate_name": "Savak Kapagi 2",
        "legacy_gate_name": "Kapak-2",
        "open_percentage": 45,
        "status": "PARTIAL",
    },
    {
        "gate_name": "Savak Kapagi 3",
        "legacy_gate_name": "Kapak-3",
        "open_percentage": 80,
        "status": "PARTIAL",
    },
]


async def ensure_default_water_gates(db: AsyncSession) -> None:
    for gate_data in DEFAULT_WATER_GATES:
        result = await db.execute(
            select(WaterGate).where(
                WaterGate.gate_name.in_([
                    gate_data["gate_name"],
                    gate_data["legacy_gate_name"],
                ])
            )
        )

        gate = result.scalar_one_or_none()

        if gate:
            gate.gate_name = gate_data["gate_name"]
            gate.open_percentage = gate_data["open_percentage"]
            gate.status = gate_data["status"]
            continue

        db.add(
            WaterGate(
                gate_name=gate_data["gate_name"],
                open_percentage=gate_data["open_percentage"],
                status=gate_data["status"],
            )
        )

    await db.commit()
