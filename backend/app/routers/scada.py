"""
HES Yönetim Sistemi - SCADA Router
====================================
Görev: SCADA ekranı için gerçek zamanlı veri endpointleri
Geliştiren: Semanur İmre & İsmihan Kırmızıoğlan

Endpointler:
- GET /api/scada/live        → Tüm türbinlerin anlık durumu
- GET /api/scada/history     → Son N adet sensör verisi (geçmiş)
- GET /api/sensor-data       → Belirli sensörün anlık verisi
- GET /api/turbines          → Tüm türbinlerin listesi
"""

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy import desc

from typing import List
from typing import Optional

from datetime import datetime

from app.database.database import get_db
from app.models.turbine import Turbine
from app.models.sensor import Sensor
from app.models.alarm import Alarm
from app.models.water_gate import WaterGate

from pydantic import BaseModel


# ─────────────────────────────────────────────────────────────
# ROUTER
# ─────────────────────────────────────────────────────────────

router = APIRouter(
    prefix="/api",
    tags=["SCADA - Veri Servisi"]
)


# ─────────────────────────────────────────────────────────────
# RESPONSE MODELLERİ
# ─────────────────────────────────────────────────────────────

class SensorResponse(BaseModel):
    id: int
    sensor_name: str
    sensor_type: str
    current_value: float
    status: str
    last_signal_time: Optional[datetime]
    turbine_id: int

    class Config:
        from_attributes = True


class TurbineResponse(BaseModel):
    id: int
    turbine_name: str
    status: str
    rpm: int
    temperature: float
    power_output: float
    is_active: bool
    sensors: List[SensorResponse] = []

    class Config:
        from_attributes = True


class AlarmResponse(BaseModel):
    id: int
    sensor_id: int
    message: str
    severity: str
    resolved: bool
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class WaterGateLiveResponse(BaseModel):
    id: int
    gate_name: str
    open_percentage: float
    opening_percentage: float
    status: str


class LiveDataResponse(BaseModel):
    timestamp: datetime
    turbines: List[TurbineResponse]
    active_alarms: List[AlarmResponse]
    total_power_mw: float
    active_turbine_count: int
    gates: List[WaterGateLiveResponse] = []


# ─────────────────────────────────────────────────────────────
# GET /api/scada/live
# SCADA ekranı için tüm türbinlerin anlık durumu
# Maksimum 1 saniye gecikmeli güncelleme destekler
# ─────────────────────────────────────────────────────────────

@router.get(
    "/scada/live",
    response_model=LiveDataResponse,
    summary="Anlık SCADA Verisi",
    description="Tüm türbinlerin ve sensörlerin anlık durumunu döner. SCADA ekranı bu endpoint'i periyodik olarak çağırır."
)
async def get_live_data(
    db: AsyncSession = Depends(get_db)
):
    # Türbinleri sensörleriyle birlikte getir
    turbine_result = await db.execute(
        select(Turbine).where(Turbine.is_active == True)
    )
    turbineler = turbine_result.scalars().all()

    # Her türbin için sensörleri getir
    turbine_listesi = []
    toplam_guc = 0.0
    aktif_sayi = 0

    for turbin in turbineler:
        sensor_result = await db.execute(
            select(Sensor).where(Sensor.turbine_id == turbin.id)
        )
        sensorler = sensor_result.scalars().all()

        turbine_listesi.append(TurbineResponse(
            id=turbin.id,
            turbine_name=turbin.turbine_name,
            status=turbin.status,
            rpm=turbin.rpm,
            temperature=float(turbin.temperature or 0),
            power_output=float(turbin.power_output or 0),
            is_active=turbin.is_active,
            sensors=[
                SensorResponse(
                    id=s.id,
                    sensor_name=s.sensor_name,
                    sensor_type=s.sensor_type,
                    current_value=float(s.current_value or 0),
                    status=s.status,
                    last_signal_time=s.last_signal_time,
                    turbine_id=s.turbine_id
                ) for s in sensorler
            ]
        ))

        if turbin.is_active and turbin.status != "STOPPED":
            toplam_guc += float(turbin.power_output or 0)
            aktif_sayi += 1

    # Aktif alarmları getir (resolved=False olanlar)
    alarm_result = await db.execute(
        select(Alarm).where(Alarm.resolved == False)
    )
    alarmlar = alarm_result.scalars().all()

    alarm_listesi = [
        AlarmResponse(
            id=a.id,
            sensor_id=a.sensor_id,
            message=a.message,
            severity=a.severity,
            resolved=a.resolved,
            status=a.status,
            created_at=a.created_at if hasattr(a, 'created_at') else None
        ) for a in alarmlar
    ]

    gate_result = await db.execute(
        select(WaterGate).where(WaterGate.is_active == True)
    )
    gates = gate_result.scalars().all()

    gate_listesi = [
        WaterGateLiveResponse(
            id=g.id,
            gate_name=g.gate_name,
            open_percentage=float(g.open_percentage or 0),
            opening_percentage=float(g.open_percentage or 0),
            status=g.status
        ) for g in gates
    ]

    return LiveDataResponse(
        timestamp=datetime.utcnow(),
        turbines=turbine_listesi,
        active_alarms=alarm_listesi,
        total_power_mw=round(toplam_guc, 2),
        active_turbine_count=aktif_sayi,
        gates=gate_listesi
    )


# ─────────────────────────────────────────────────────────────
# GET /api/scada/history
# Son N adet sensör kaydını getirir (geçmiş grafik için)
# ─────────────────────────────────────────────────────────────

@router.get(
    "/scada/history",
    response_model=List[SensorResponse],
    summary="Sensör Geçmişi",
    description="Belirli bir türbine ait sensörlerin geçmiş verilerini döner. SCADA'daki geçmiş grafiği için kullanılır."
)
async def get_history(
    turbine_id: int = Query(..., description="Türbin ID"),
    limit: int = Query(default=60, ge=1, le=500, description="Kaç kayıt getirilsin (max 500)"),
    sensor_type: Optional[str] = Query(default=None, description="Sensör tipi filtresi: RPM, TEMPERATURE, WATER, POWER"),
    db: AsyncSession = Depends(get_db)
):
    # Türbin var mı kontrol et
    turbin_result = await db.execute(
        select(Turbine).where(Turbine.id == turbine_id)
    )
    turbin = turbin_result.scalar_one_or_none()

    if not turbin:
        raise HTTPException(
            status_code=404,
            detail=f"Türbin bulunamadı: ID={turbine_id}"
        )

    # Sensörleri getir
    query = select(Sensor).where(Sensor.turbine_id == turbine_id)

    if sensor_type:
        query = query.where(
            Sensor.sensor_type == sensor_type.upper()
        )

    query = query.order_by(desc(Sensor.last_signal_time)).limit(limit)

    result = await db.execute(query)
    sensorler = result.scalars().all()

    return [
        SensorResponse(
            id=s.id,
            sensor_name=s.sensor_name,
            sensor_type=s.sensor_type,
            current_value=float(s.current_value or 0),
            status=s.status,
            last_signal_time=s.last_signal_time,
            turbine_id=s.turbine_id
        ) for s in sensorler
    ]


# ─────────────────────────────────────────────────────────────
# GET /api/sensor-data
# Belirli bir sensörün anlık verisini getirir
# ─────────────────────────────────────────────────────────────

@router.get(
    "/sensor-data",
    response_model=SensorResponse,
    summary="Tekil Sensör Verisi",
    description="Belirli bir sensörün anlık değerini döner."
)
async def get_sensor_data(
    sensor_id: int = Query(..., description="Sensör ID"),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Sensor).where(Sensor.id == sensor_id)
    )
    sensor = result.scalar_one_or_none()

    if not sensor:
        raise HTTPException(
            status_code=404,
            detail=f"Sensör bulunamadı: ID={sensor_id}"
        )

    return SensorResponse(
        id=sensor.id,
        sensor_name=sensor.sensor_name,
        sensor_type=sensor.sensor_type,
        current_value=float(sensor.current_value or 0),
        status=sensor.status,
        last_signal_time=sensor.last_signal_time,
        turbine_id=sensor.turbine_id
    )


# ─────────────────────────────────────────────────────────────
# GET /api/turbines
# Tüm türbinlerin listesi
# ─────────────────────────────────────────────────────────────

@router.get(
    "/turbines",
    response_model=List[TurbineResponse],
    summary="Türbin Listesi",
    description="Sistemdeki tüm türbinleri listeler."
)
async def get_turbines(
    sadece_aktif: bool = Query(default=False, description="Sadece aktif türbinleri getir"),
    db: AsyncSession = Depends(get_db)
):
    query = select(Turbine)

    if sadece_aktif:
        query = query.where(Turbine.is_active == True)

    result = await db.execute(query)
    turbineler = result.scalars().all()

    turbine_listesi = []
    for turbin in turbineler:
        sensor_result = await db.execute(
            select(Sensor).where(Sensor.turbine_id == turbin.id)
        )
        sensorler = sensor_result.scalars().all()

        turbine_listesi.append(TurbineResponse(
            id=turbin.id,
            turbine_name=turbin.turbine_name,
            status=turbin.status,
            rpm=turbin.rpm,
            temperature=float(turbin.temperature or 0),
            power_output=float(turbin.power_output or 0),
            is_active=turbin.is_active,
            sensors=[
                SensorResponse(
                    id=s.id,
                    sensor_name=s.sensor_name,
                    sensor_type=s.sensor_type,
                    current_value=float(s.current_value or 0),
                    status=s.status,
                    last_signal_time=s.last_signal_time,
                    turbine_id=s.turbine_id
                ) for s in sensorler
            ]
        ))

    return turbine_listesi
