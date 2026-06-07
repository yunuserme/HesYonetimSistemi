"""
HES Yönetim Sistemi - Veri Servisi
====================================
Görev: Kaggle CSV verisini okuyup backend API'ye periyodik olarak gönderir.
Geliştiren: Semanur İmre & İsmihan Kırmızıoğlan

Çalışma mantığı:
1. CSV dosyasını okur
2. Backend'e login olur, JWT token alır
3. Her 5 saniyede bir türbin ve sensör verilerini API'ye gönderir
4. Anormal değerler tespit edilirse alarm oluşturur
"""

import asyncio
import httpx
import pandas as pd
import random
import logging
import numpy as np
from datetime import datetime

# ---------------------------------------------------------
# AYARLAR - .env.example dosyasındaki değerlere göre doldurun
# ---------------------------------------------------------
BASE_URL = "http://localhost:8000"   # Backend URL
LOGIN_USERNAME = "operator1"         # tohum.py operator kullanicisi
LOGIN_PASSWORD = "Operator123!"      # tohum.py operator sifresi
CSV_DOSYASI = "sensor.csv"           # Kaggle'dan indirilen CSV dosya adı
GUNCELLEME_SURESI = 1                # Kaç saniyede bir veri gönderilsin (saniye)

# ---------------------------------------------------------
# LOG AYARI
# ---------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------
# ANORMALLİK EŞİK DEĞERLERİ
# ---------------------------------------------------------
RPM_MAX = 1800        # Normal üst sınır (devir/dakika)
SICAKLIK_MAX = 85.0   # Normal üst sınır (°C)
GUC_MIN = 0.0         # Minimum güç çıkışı (MW)

# ---------------------------------------------------------
# YARDIMCI FONKSİYON: Anormal değer üretimi
# ---------------------------------------------------------
def anormal_deger_uret(normal_deger: float, tur: str) -> float:
    """
    %10 ihtimalle anormal bir değer üretir.
    Bu sayede sistem arıza senaryolarını simüle edebilir.
    """
    if random.random() < 0.10:  # %10 ihtimal
        if tur == "rpm":
            anormal = normal_deger * random.uniform(1.5, 2.5)  # Aşırı yüksek RPM
            log.warning(f"⚠️  ANORMAL RPM üretildi: {anormal:.1f}")
            return anormal
        elif tur == "sicaklik":
            anormal = normal_deger * random.uniform(1.3, 1.8)  # Aşırı sıcaklık
            log.warning(f"⚠️  ANORMAL SICAKLIK üretildi: {anormal:.1f}")
            return anormal
    return normal_deger


# ---------------------------------------------------------
# 1. ADIM: CSV DOSYASINI OKU VE TEMİZLE
# ---------------------------------------------------------
def csv_oku(dosya_yolu: str) -> pd.DataFrame:
    """
    Kaggle'dan alınan HES CSV dosyasını okur.
    Eksik değerleri temizler, sütun adlarını düzenler.
    """
    try:
        df = pd.read_csv(dosya_yolu)
        log.info(f"✅ CSV okundu: {len(df)} satır, sütunlar: {list(df.columns)}")
    except FileNotFoundError:
        log.error(f"❌ CSV dosyası bulunamadı: {dosya_yolu}")
        log.info("   → Kaggle'dan HES veri seti indirip bu scriptle aynı klasöre koyun.")
        raise

    # Sütun adlarını küçük harfe çevir ve boşlukları alt çizgiye dönüştür
    df.columns = df.columns.str.lower().str.replace(" ", "_")

    # Eksik değerleri doldur (ortalama ile)
    df = df.fillna(df.mean(numeric_only=True))

    log.info(f"✅ CSV temizlendi. Kullanılabilir satır sayısı: {len(df)}")
    return df


# ---------------------------------------------------------
# 2. ADIM: BACKEND'E LOGIN OL, JWT TOKEN AL
# ---------------------------------------------------------
async def login_ol(client: httpx.AsyncClient) -> str:
    """
    Backend'e kullanıcı adı/şifre ile giriş yapar.
    Dönen JWT access token'ı saklar.
    """
    log.info("🔐 Backend'e giriş yapılıyor...")
    yanit = await client.post(
        f"{BASE_URL}/auth/login",
        json={"username": LOGIN_USERNAME, "password": LOGIN_PASSWORD}
    )
    yanit.raise_for_status()
    token = yanit.json()["access_token"]
    log.info("✅ Giriş başarılı, token alındı.")
    return token


# ---------------------------------------------------------
# 3. ADIM: TÜRBİNLERİ ÇEK (mevcut turbine id'lerini öğren)
# ---------------------------------------------------------
async def turbinleri_getir(client: httpx.AsyncClient, token: str) -> list:
    """
    Backend'deki mevcut türbinlerin listesini çeker.
    """
    headers = {"Authorization": f"Bearer {token}"}
    yanit = await client.get(f"{BASE_URL}/turbines/", headers=headers)
    yanit.raise_for_status()
    turbinler = yanit.json()
    log.info(f"✅ {len(turbinler)} türbin bulundu.")
    return turbinler


# ---------------------------------------------------------
# 4. ADIM: TÜRBİN VERİSİNİ GÜNCELLE (PATCH /turbines/{id})
# ---------------------------------------------------------
async def turbin_guncelle(
    client: httpx.AsyncClient,
    token: str,
    turbine_id: int,
    rpm: int,
    sicaklik: float,
    guc_ciktisi: float
):
    """
    Bir türbinin rpm, sıcaklık ve güç çıkışı değerlerini günceller.
    """
    headers = {"Authorization": f"Bearer {token}"}
    durum = "ACTIVE"

    # Anormallik kontrolü
    if rpm > RPM_MAX or sicaklik > SICAKLIK_MAX:
        durum = "ALARM"

    veri = {
        "rpm": int(rpm),
        "temperature": round(float(sicaklik), 2),
        "power_output": round(float(guc_ciktisi), 2),
        "status": durum
    }

    yanit = await client.patch(
        f"{BASE_URL}/turbines/{turbine_id}",
        json=veri,
        headers=headers
    )

    if yanit.status_code == 200:
        log.info(f"  🔄 Türbin {turbine_id} güncellendi → RPM:{rpm}, Sıcaklık:{sicaklik:.1f}°C, Güç:{guc_ciktisi:.2f}MW, Durum:{durum}")
    else:
        log.error(f"  ❌ Türbin {turbine_id} güncellenemedi: {yanit.text}")


# ---------------------------------------------------------
# 5. ADIM: SENSÖR VERİSİ GÜNCELLE (PATCH /sensors/{id})
# ---------------------------------------------------------
async def sensor_guncelle(
    client: httpx.AsyncClient,
    token: str,
    sensor_id: int,
    deger: float,
    sensor_turu: str
):
    """
    Bir sensörün anlık değerini günceller.
    """
    headers = {"Authorization": f"Bearer {token}"}
    veri = {
        "current_value": round(float(deger), 3),
        "last_signal_time": datetime.utcnow().isoformat(),
        "status": "ACTIVE"
    }

    yanit = await client.patch(
        f"{BASE_URL}/sensors/{sensor_id}",
        json=veri,
        headers=headers
    )

    if yanit.status_code == 200:
        log.info(f"    📡 Sensör {sensor_id} ({sensor_turu}) → {deger:.3f}")
    else:
        log.error(f"    ❌ Sensör {sensor_id} güncellenemedi: {yanit.text}")


# ---------------------------------------------------------
# 6. ADIM: ALARM OLUŞTUR (POST /alarms)
# ---------------------------------------------------------
async def alarm_olustur(
    client: httpx.AsyncClient,
    token: str,
    sensor_id: int,
    mesaj: str,
    seviye: str = "CRITICAL"
):
    """
    Anormal değer tespit edildiğinde alarm kaydı oluşturur.
    """
    headers = {"Authorization": f"Bearer {token}"}
    veri = {
        "sensor_id": sensor_id,
        "message": mesaj,
        "severity": seviye
    }

    yanit = await client.post(f"{BASE_URL}/alarms/", json=veri, headers=headers)
    if yanit.status_code in (200, 201):
        log.warning(f"  🚨 ALARM oluşturuldu → Sensör {sensor_id}: {mesaj}")
    else:
        log.error(f"  ❌ Alarm oluşturulamadı: {yanit.text}")

# ---------------------------------------------------------
# 7. ADIM: İŞ EMRİ OLUŞTUR (POST /work-orders/)
# ---------------------------------------------------------
async def is_emri_olustur(
    client: httpx.AsyncClient,
    token: str,
    turbine_id: int,
    sorun_aciklamasi: str,
    oncelik: str = "HIGH"
):
    """
    Anomali tespit edildiğinde otomatik olarak iş emri oluşturur.
    """
    headers = {"Authorization": f"Bearer {token}"}
    veri = {
        "title": f"Turbin {turbine_id} anomali uyarisi",
        "description": sorun_aciklamasi,
        "priority": oncelik,
        "assigned_to": None
    }

    yanit = await client.post(f"{BASE_URL}/work-orders/", json=veri, headers=headers)
    if yanit.status_code in (200, 201):
        log.info(f"   İŞ EMRİ oluşturuldu → Türbin {turbine_id}: {sorun_aciklamasi}")
    else:
        log.error(f"   İş emri oluşturulamadı: {yanit.text}")

# ---------------------------------------------------------
# ANA DÖNGÜ: Periyodik veri gönderimi
# ---------------------------------------------------------
async def veri_gonder_dongu(df: pd.DataFrame):
    """
    Her GUNCELLEME_SURESI saniyede bir CSV'den bir satır okur
    ve backend API'ye gönderir.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Login ol
        token = await login_ol(client)

        # Mevcut türbinleri al
        turbinler = await turbinleri_getir(client, token)
        if not turbinler:
            log.error("❌ Sistemde hiç türbin bulunamadı. Önce veritabanına türbin ekleyin.")
            return

        toplam_satir = len(df)
        satir_no = 0

        log.info(f"🚀 Veri gönderimi başlıyor... (Her {GUNCELLEME_SURESI} saniyede bir)")

        while True:
            # CSV'nin sonuna gelince başa dön (sonsuz simülasyon)
            if satir_no >= toplam_satir:
                satir_no = 0
                log.info("🔁 CSV başa sarıldı, simülasyon devam ediyor...")

            satir = df.iloc[satir_no]
            satir_no += 1

            log.info(f"\n--- Satır {satir_no}/{toplam_satir} işleniyor ---")

            # Her türbin için veri gönder
            for i, turbin in enumerate(turbinler):
                turbine_id = turbin["id"]
                

                # CSV sütun eşleştirmesi (Kaggle pump_sensor_data veri seti)
                # sensor_00 → RPM, sensor_01 → Sıcaklık, sensor_02 → Su seviyesi, sensor_03 → Güç
                try:
                    rpm_ham = float(satir.get("sensor_00", 1200))
                    sicaklik_ham = float(satir.get("sensor_01", 45.0))
                    su_seviyesi = float(satir.get("sensor_02", 75.0))
                    guc_ham = float(satir.get("sensor_03", 50.0))

                    # NaN kontrolü
                    import math
                    if math.isnan(rpm_ham): rpm_ham = 1200.0
                    if math.isnan(sicaklik_ham): sicaklik_ham = 45.0
                    if math.isnan(su_seviyesi): su_seviyesi = 75.0
                    if math.isnan(guc_ham): guc_ham = 50.0

                    # Güç çıkışını MW'a normalize et (0-100 arası değeri 0-150 MW aralığına çevir)
                    guc_ham = (guc_ham / 100.0) * 150.0

                except Exception:
                    rpm_ham, sicaklik_ham, guc_ham, su_seviyesi = 1200, 45.0, 50.0, 75.0

                # Türbine küçük rastgele fark ekle (her türbin biraz farklı davransın)
                rpm_ham = rpm_ham * random.uniform(0.95, 1.05)
                sicaklik_ham = sicaklik_ham * random.uniform(0.97, 1.03)

                # %10 ihtimalle anormal değer üret
                rpm_son = anormal_deger_uret(rpm_ham, "rpm")
                sicaklik_son = anormal_deger_uret(sicaklik_ham, "sicaklik")

                # Türbini güncelle
                await turbin_guncelle(client, token, turbine_id, rpm_son, sicaklik_son, guc_ham)
                energy = predict_energy(
                     model,
                     rpm_son,
                     sicaklik_son,
                     su_seviyesi
                )
                log.info(f"🔮 Enerji tahmini: {energy:.2f} MW")

                # Varsayılan sensor_id bulalım
                varsayilan_sensor_id = turbin["sensors"][0]["id"] if "sensors" in turbin and turbin["sensors"] else 1

                
                 # Anormallik varsa alarm ve iş emri oluştur
                if rpm_son > RPM_MAX:
                    hata_mesaji = f"Türbin {turbine_id} aşırı RPM: {rpm_son:.0f} devir/dk (limit: {RPM_MAX})"
                    await alarm_olustur(
                        client, token, varsayilan_sensor_id,
                        hata_mesaji,
                        seviye="CRITICAL"
                    )
                    await is_emri_olustur(
                        client, token, turbine_id,
                        hata_mesaji,
                        oncelik="HIGH"
                    )
                    
                if sicaklik_son > SICAKLIK_MAX:
                    hata_mesaji = f"Türbin {turbine_id} aşırı sıcaklık: {sicaklik_son:.1f}°C (limit: {SICAKLIK_MAX}°C)"
                    await alarm_olustur(
                        client, token, varsayilan_sensor_id,
                        hata_mesaji,
                        seviye="CRITICAL"
                    )
                    await is_emri_olustur(
                        client, token, turbine_id,
                        hata_mesaji,
                        oncelik="HIGH"
                    )
                # Sensörleri güncelle (turbine'e bağlı sensörler varsa)
                if "sensors" in turbin and turbin["sensors"]:
                    for sensor in turbin["sensors"]:
                        sensor_id = sensor["id"]
                        sensor_turu = sensor.get("sensor_type", "").upper()

                        if "RPM" in sensor_turu or "SPEED" in sensor_turu:
                            deger = rpm_son
                        elif "TEMP" in sensor_turu or "SICAKLIK" in sensor_turu:
                            deger = sicaklik_son
                        elif "WATER" in sensor_turu or "SU" in sensor_turu:
                            deger = su_seviyesi
                        elif "POWER" in sensor_turu or "GUC" in sensor_turu:
                            deger = guc_ham
                        else:
                            deger = random.uniform(10, 100)

                        await sensor_guncelle(client, token, sensor_id, deger, sensor_turu)

            # Bir sonraki gönderime kadar bekle
            log.info(f"⏳ {GUNCELLEME_SURESI} saniye bekleniyor...\n")
            await asyncio.sleep(GUNCELLEME_SURESI)


# ---------------------------------------------------------
# BAŞLATICI
# ---------------------------------------------------------
if __name__ == "__main__":
    log.info("=" * 50)
    log.info("  HES Veri Servisi Başlatılıyor")
    log.info("=" * 50)

    # CSV oku
    df = csv_oku(CSV_DOSYASI)
    model = train_energy_model(df)

    # Asenkron döngüyü başlat
    asyncio.run(veri_gonder_dongu(df))


# ---------------------------------------------------------
# ELİF-TUNAHAN İÇİN: ANOMALİ VERİ FORMATI ÇIKTISI
# ---------------------------------------------------------
def anomali_csv_uret(df: pd.DataFrame, cikti_dosyasi: str = "anomali_verisi.csv"):
    """
    Elif-Tunahan'in ML modeli icin anormal veriler iceren CSV uretir.
    Sutunlar: timestamp, turbine_id, rpm, temperature, power_output, water_level, is_anomaly, anomaly_type
    """
    import math
    kayitlar = []
    for i, satir in df.iterrows():
        if i >= 1000:
            break
        try:
            rpm = float(satir.get("sensor_00", 1200))
            sicaklik = float(satir.get("sensor_01", 45.0))
            su = float(satir.get("sensor_02", 75.0))
            guc = float(satir.get("sensor_03", 50.0))
            if math.isnan(rpm): rpm = 1200.0
            if math.isnan(sicaklik): sicaklik = 45.0
            if math.isnan(su): su = 75.0
            if math.isnan(guc): guc = 50.0
        except Exception:
            rpm, sicaklik, su, guc = 1200.0, 45.0, 75.0, 50.0

        is_anomaly = 0
        anomaly_type = "NONE"
        if random.random() < 0.10:
            if random.random() < 0.5:
                rpm = rpm * random.uniform(1.5, 2.5)
                is_anomaly = 1
                anomaly_type = "HIGH_RPM"
            else:
                sicaklik = sicaklik * random.uniform(1.3, 1.8)
                is_anomaly = 1
                anomaly_type = "HIGH_TEMP"

        kayitlar.append({
            "timestamp": datetime.utcnow().isoformat(),
            "turbine_id": (i % 2) + 1,
            "rpm": round(rpm, 2),
            "temperature": round(sicaklik, 2),
            "power_output": round((guc / 100.0) * 150.0, 2),
            "water_level": round(su, 2),
            "is_anomaly": is_anomaly,
            "anomaly_type": anomaly_type
        })

    anomali_df = pd.DataFrame(kayitlar)
    anomali_df.to_csv(cikti_dosyasi, index=False)
    log.info(f"Elif-Tunahan icin anomali CSV uretildi: {cikti_dosyasi}")
    log.info(f"Toplam: {len(anomali_df)} satir, Anormal: {anomali_df['is_anomaly'].sum()} kayit")
    return anomali_df
def train_energy_model(df):
    from sklearn.ensemble import RandomForestRegressor

    X = df[["sensor_00", "sensor_01", "sensor_02"]]
    y = df["sensor_03"]

    model = RandomForestRegressor()
    model.fit(X, y)

    return model
def predict_energy(model, rpm, temp, water):
    import numpy as np
    data = np.array([[rpm, temp, water]])
    return model.predict(data)[0]
