"""
HES Yönetim Sistemi - Enerji Tahmin Servisi
=============================================
veri__servisi.py içindeki train_energy_model ve predict_energy
fonksiyonları API'ye hazır hale getirildi.

Özellikler:
- RandomForest modeli ile enerji üretim tahmini
- Anomali tespiti (RPM / Sıcaklık eşik kontrolü)
- In-memory model cache (sunucu başlarken sahte veriyle ön-eğitim)
- Gerçek CSV verisi yüklendiğinde model yeniden eğitilebilir
"""

import numpy as np
from datetime import datetime, timezone
from typing import Optional

# ─────────────────────────────────────────────────────────────
# ANOMALİ EŞİK DEĞERLERİ
# ─────────────────────────────────────────────────────────────

RPM_MAX = 1800        # Normal üst sınır (devir/dakika)
SICAKLIK_MAX = 85.0   # Normal üst sınır (°C)
GUC_MIN = 0.0         # Minimum güç çıkışı (MW)


# ─────────────────────────────────────────────────────────────
# GLOBAL MODEL CACHE
# ─────────────────────────────────────────────────────────────

_model = None
_model_trained_at: Optional[datetime] = None
_model_sample_count: int = 0


def _get_or_create_model():
    """
    Model varsa döner, yoksa sahte veriyle ön-eğitim yapar.
    Sunucu ilk başladığında CSV olmasa bile /energy/predict çalışır.
    """
    global _model, _model_trained_at, _model_sample_count

    if _model is not None:
        return _model

    # Sahte eğitim verisi ile bootstrap modeli
    rng = np.random.default_rng(42)
    n = 500
    rpm   = rng.uniform(800, 1800, n)
    temp  = rng.uniform(30, 90, n)
    water = rng.uniform(40, 100, n)

    # Fiziksel yaklaşım: güç ≈ rpm * su_seviyesi etkisi - sıcaklık cezası
    power = (rpm / 1800) * (water / 100) * 150 - (temp - 50) * 0.3
    power = np.clip(power, 0, 150)

    X = np.column_stack([rpm, temp, water])
    y = power

    _model = _train(X, y)
    _model_trained_at = datetime.now(timezone.utc)
    _model_sample_count = n
    return _model


def _train(X: np.ndarray, y: np.ndarray):
    """sklearn RandomForestRegressor eğitir."""
    from sklearn.ensemble import RandomForestRegressor
    m = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    m.fit(X, y)
    return m


# ─────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────

def train_energy_model(df) -> None:
    """
    Pandas DataFrame'den modeli yeniden eğitir.
    DataFrame şu sütunlara sahip olmalı:
        sensor_00 (rpm), sensor_01 (temp), sensor_02 (water), sensor_03 (power)
    """
    global _model, _model_trained_at, _model_sample_count

    required = ["sensor_00", "sensor_01", "sensor_02", "sensor_03"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"CSV'de '{col}' sutunu bulunamadi.")

    clean = df[required].dropna()
    X = clean[["sensor_00", "sensor_01", "sensor_02"]].to_numpy()
    y = clean["sensor_03"].to_numpy()

    _model = _train(X, y)
    _model_trained_at = datetime.now(timezone.utc)
    _model_sample_count = len(clean)


def predict_energy(rpm: float, temp: float, water: float) -> dict:
    """
    Tek tahmin yapar.

    Returns:
        {
            "predicted_power_mw": float,
            "is_anomaly": bool,
            "anomaly_type": str | None,
            "confidence": float   # 0-1 arası tahmin güveni
        }
    """
    model = _get_or_create_model()

    data = np.array([[rpm, temp, water]])
    raw_pred = float(model.predict(data)[0])

    # Güç çıkışı 0-150 MW arasına kırp
    predicted_power = round(max(0.0, min(150.0, raw_pred)), 3)

    # Anomali tespiti
    is_anomaly = False
    anomaly_type = None

    if rpm > RPM_MAX:
        is_anomaly = True
        anomaly_type = "HIGH_RPM"
    elif temp > SICAKLIK_MAX:
        is_anomaly = True
        anomaly_type = "HIGH_TEMP"
    elif raw_pred < GUC_MIN:
        is_anomaly = True
        anomaly_type = "LOW_POWER"

    # Basit güven skoru: eğitim örnek sayısına göre artar, anomali varsa düşer
    confidence = min(1.0, _model_sample_count / 1000) * (0.7 if is_anomaly else 1.0)

    return {
        "predicted_power_mw": predicted_power,
        "is_anomaly": is_anomaly,
        "anomaly_type": anomaly_type,
        "confidence": round(confidence, 3),
    }


def get_model_info() -> dict:
    """Model hakkında meta bilgi döner."""
    trained = _model is not None
    return {
        "model_ready": trained,
        "trained_at": _model_trained_at.isoformat() if _model_trained_at else None,
        "sample_count": _model_sample_count,
        "algorithm": "RandomForestRegressor",
        "features": ["rpm", "temperature", "water_level"],
        "target": "power_output_mw",
        "thresholds": {
            "rpm_max": RPM_MAX,
            "temperature_max": SICAKLIK_MAX,
            "power_min_mw": GUC_MIN,
        }
    }
