"""
HES Yönetim Sistemi - Enerji / Tahmin Router
=============================================
Yasir'in frontend ekranı bu endpointleri kullanır:
  GET  /energy/forecast    → Son N türbin için tahmin verisi
  GET  /energy/predictions → Tüm geçmiş tahminler (sayfalı)
  GET  /energy/history     → Veritabanındaki geçmiş sensör okumaları
  GET  /energy/metrics     → Model bilgisi ve performans metrikleri
  POST /energy/predict     → Tek nokta tahmini
"""

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy import desc

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database.database import get_db
from app.models.turbine import Turbine
from app.models.sensor import Sensor
from app.models.alarm import Alarm

from app.services import energy_prediction_service as eps


router = APIRouter(
    prefix="/energy",
    tags=["Energy - Tahmin & Analiz"]
)


# ─────────────────────────────────────────────────────────────
# REQUEST / RESPONSE MODELLERİ
# ─────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    rpm: float
    temperature: float
    water_level: float
    turbine_id: Optional[int] = None


class PredictResponse(BaseModel):
    timestamp: datetime
    turbine_id: Optional[int]
    rpm: float
    temperature: float
    water_level: float
    predicted_power_mw: float
    confidence: float
    is_anomaly: bool
    anomaly_type: Optional[str]


class ForecastItem(BaseModel):
    turbine_id: int
    turbine_name: str
    current_rpm: float
    current_temperature: float
    current_power_output: float
    predicted_power_mw: float
    confidence: float
    is_anomaly: bool
    anomaly_type: Optional[str]
    status: str
    timestamp: datetime


class MetricsResponse(BaseModel):
    model_ready: bool
    trained_at: Optional[str]
    sample_count: int
    algorithm: str
    features: List[str]
    target: str
    thresholds: dict


class HistoryItem(BaseModel):
    sensor_id: int
    sensor_name: str
    sensor_type: str
    turbine_id: int
    current_value: float
    status: str
    last_signal_time: Optional[datetime]

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────
# POST /energy/predict  — Tek Nokta Tahmini
# ─────────────────────────────────────────────────────────────

@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Tek Tahmin",
    description="RPM, sıcaklık ve su seviyesi girerek anlık güç tahmini alır. Anomali varsa işaretler."
)
async def predict(body: PredictRequest):
    result = eps.predict_energy(
        rpm=body.rpm,
        temp=body.temperature,
        water=body.water_level,
    )

    return PredictResponse(
        timestamp=datetime.now(timezone.utc),
        turbine_id=body.turbine_id,
        rpm=body.rpm,
        temperature=body.temperature,
        water_level=body.water_level,
        predicted_power_mw=result["predicted_power_mw"],
        confidence=result["confidence"],
        is_anomaly=result["is_anomaly"],
        anomaly_type=result["anomaly_type"],
    )


# ─────────────────────────────────────────────────────────────
# GET /energy/forecast  — Tüm Türbinler İçin Tahmin
# ─────────────────────────────────────────────────────────────

@router.get(
    "/forecast",
    response_model=List[ForecastItem],
    summary="Türbin Tahmin Listesi",
    description="Sistemdeki her türbinin mevcut sensör verileri kullanılarak üretim tahmini yapılır."
)
async def get_forecast(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Turbine))
    turbines = result.scalars().all()

    forecast = []
    for t in turbines:
        # Su seviyesi sensöründen al (yoksa varsayılan)
        sensor_result = await db.execute(
            select(Sensor).where(
                Sensor.turbine_id == t.id,
                Sensor.sensor_type.in_(["WATER", "VIBRATION"])
            )
        )
        water_sensor = sensor_result.scalars().first()
        water_level = float(water_sensor.current_value) if water_sensor else 75.0

        pred = eps.predict_energy(
            rpm=float(t.rpm or 1000),
            temp=float(t.temperature or 50),
            water=water_level,
        )

        forecast.append(ForecastItem(
            turbine_id=t.id,
            turbine_name=t.turbine_name,
            current_rpm=float(t.rpm or 0),
            current_temperature=float(t.temperature or 0),
            current_power_output=float(t.power_output or 0),
            predicted_power_mw=pred["predicted_power_mw"],
            confidence=pred["confidence"],
            is_anomaly=pred["is_anomaly"],
            anomaly_type=pred["anomaly_type"],
            status=t.status,
            timestamp=datetime.now(timezone.utc),
        ))

    return forecast


# ─────────────────────────────────────────────────────────────
# GET /energy/predictions  — Tüm Türbinler İçin Anlık Tahmin Listesi
# (forecast ile aynı veri, Yasir'in frontend yapısı için alias)
# ─────────────────────────────────────────────────────────────

@router.get(
    "/predictions",
    response_model=List[ForecastItem],
    summary="Tahmin Listesi",
    description="Forecast ile aynı veriyi döner. Yasir'in tahmin ekranı için kullanılabilir."
)
async def get_predictions(db: AsyncSession = Depends(get_db)):
    return await get_forecast(db)


# ─────────────────────────────────────────────────────────────
# GET /energy/history  — Sensör Geçmişi
# ─────────────────────────────────────────────────────────────

@router.get(
    "/history",
    response_model=List[HistoryItem],
    summary="Enerji Geçmişi",
    description="Veritabanındaki sensör okumalarını döner. Geçmiş grafikler için kullanılır."
)
async def get_history(
    turbine_id: Optional[int] = Query(default=None, description="Türbin ID filtresi"),
    limit: int = Query(default=100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    query = select(Sensor).order_by(desc(Sensor.last_signal_time)).limit(limit)

    if turbine_id is not None:
        # Türbin var mı kontrol
        t_result = await db.execute(select(Turbine).where(Turbine.id == turbine_id))
        if not t_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Turbin bulunamadi.")
        query = query.where(Sensor.turbine_id == turbine_id)

    result = await db.execute(query)
    sensors = result.scalars().all()

    return [
        HistoryItem(
            sensor_id=s.id,
            sensor_name=s.sensor_name,
            sensor_type=s.sensor_type,
            turbine_id=s.turbine_id,
            current_value=float(s.current_value or 0),
            status=s.status,
            last_signal_time=s.last_signal_time,
        )
        for s in sensors
    ]


# ─────────────────────────────────────────────────────────────
# GET /energy/metrics  — Model Metrikleri
# ─────────────────────────────────────────────────────────────

@router.get(
    "/metrics",
    response_model=MetricsResponse,
    summary="Model Metrikleri",
    description="Tahmin modelinin eğitim bilgisi, kullanılan özellikler ve anomali eşikleri."
)
async def get_metrics():
    info = eps.get_model_info()
    return MetricsResponse(**info)
