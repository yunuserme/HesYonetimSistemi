<<<<<<< HEAD
# HES Auth Service

## Kurulum

### 1. Virtual environment oluştur
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 2. Paketleri yükle
```bash
pip install -r requirements.txt
```

### 3. .env dosyasını oluştur
```bash
cp .env.example .env
# .env'i açıp DATABASE_URL ve SECRET_KEY'i düzenle
```

### 4. PostgreSQL bağlantısını ayarla
`.env` içindeki `DATABASE_URL`'i kendi DB bilgilerinle güncelle:
```
DATABASE_URL=postgresql+asyncpg://KULLANICI:SIFRE@localhost:5432/hes_db
```

### 5. Uygulamayı başlat
```bash
uvicorn main:app --reload --port 8000
```

### 6. Seed verilerini yükle (opsiyonel)
```bash
python seed.py
```

---

## API Kullanımı

Swagger UI: http://localhost:8000/docs

### Register
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@hestest.com","password":"Test123!","role":"operator"}'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operator1","password":"Operator123!"}'
```

### Protected endpoint kullanımı
```bash
curl -X POST http://localhost:8000/example/turbine-stop \
  -H "Authorization: Bearer <access_token>"
```

---

## Proje Yapısı

```
auth-service/
├── main.py                  # FastAPI uygulaması, CORS, rate limit
├── seed.py                  # Başlangıç kullanıcıları
├── requirements.txt
├── .env.example
├── core/
│   ├── config.py            # Ayarlar (.env'den okur)
│   ├── database.py          # SQLAlchemy async engine
│   ├── security.py          # bcrypt, JWT üretimi
│   └── dependencies.py      # get_current_user, get_current_active_admin
├── models/
│   └── user.py              # User, RefreshToken, AuditLog tabloları
├── schemas/
│   └── auth.py              # Pydantic request/response şemaları
├── routers/
│   └── auth.py              # /auth/register, /login, /logout, /refresh, /me
└── middleware/
    └── rbac.py              # ROLE_PERMISSIONS, require_permission()
```

---

## Diğer Modüllere Entegrasyon

Diğer route'larda yetki koruması eklemek için:

```python
from middleware.rbac import require_permission

@router.post("/turbines/{id}/stop")
async def stop_turbine(
    turbine_id: int,
    current_user = require_permission("turbine_stop"),
):
    # Sadece OPERATOR ve ADMIN erişebilir
    ...
```

### Mevcut yetkiler
| Permission | Kimler |
|---|---|
| `turbine_stop` | operator, admin |
| `gate_open` | operator, admin |
| `prediction_view` | engineer, admin, manager |
| `work_order_view` | technician, admin |
| `work_order_close` | technician, admin |
| `report_export` | engineer, admin, manager |
| `alarm_resolve` | admin |
| `user_manage` | admin |
| `scada_control` | operator, admin |
=======

```markdown
# HES YÖNETİM SİSTEMİ: Hidroelektrik Santral Yönetim Platformu

## 1. Projenin Amacı ve Vizyonu
Projemizin en temel amacı; hidroelektrik santrallerindeki karmaşık süreçleri, dağınık verileri, geç fark edilen arızaları ve geciken müdahaleleri tek bir platformda toplayarak tamamen dijital ve akıllı bir yönetim sağlamaktır.  Manuel kontrollerin yerini otomasyonun aldığı bu sistem sayesinde yöneticiler ve çalışanlar sadece karar alma süreçlerine odaklanarak zamandan tasarruf ederler ve küçük sorunlar büyümeden çözülür. 

## 2. Projenin Hedefleri
Santral yönetimini daha verimli hale getirmek için sistemimiz üç ana hedef üzerine kurulmuştur:
* **Gerçek Zamanlı ve Kesintisiz İzleme:** Su seviyesi, türbin durumu ve üretilen güç gibi hayati veriler anlık olarak tek bir ekranda toplanır.  Bir sorun oluştuğunda sistem, siz daha fark etmeden anında uyarı verir. 
* **Yapay Zeka Destekli Üretim Tahmini:** Sistemdeki yapay zeka algoritmaları, mevcut su rezervini ve anlık hava durumu verilerini analiz ederek santralin haftalık üretim planını otomatik olarak hesaplar.  Böylece şebeke taahhütleri güvenle belirlenir. 
* **Otomatik Arıza Yönetimi ve Takibi:** Sahadaki sensör bağlantılarından biri koptuğunda sistem otomatik olarak arıza kaydı oluşturur.  İlgili teknisyene iş emri gönderilir ve onarım tamamlanana kadar tüm süreç platform üzerinden takip edilir. 

## 3. Takım Üyeleri
Bu proje, **Yazılım Mühendisliği Grup 2026/2028** tarafından geliştirilmektedir.  
Takımımız: Semanur İmre, İsmihan Kırmızıoğlan, Elif Kara, Tunahan Işkın, Eren Bezek, Esma Bilen, Achmet Amet, Yasir Kara, Yunus Emre Erkuş. 

## 4. Takım Üyelerinin Yetkinlikleri ve Görev Dağılımı
Sistemde yetki karmaşasının önüne geçmek için herkes yalnızca kendi rolüne uygun ekranları ve verileri görür: 
* **Santral Operatörü:** Sahadaki tüm sensörleri tek bir panelden izler.  Kapak ve türbin kontrollerini ekran üzerinden gerçekleştirir ve acil durumlarda anında müdahale eder. 
* **Enerji Mühendisi:** Sistem tarafından otomatik hazırlanan haftalık üretim tahminlerini inceler.  Saniyeler içinde üretim planını onaylayarak hayata geçirir. 
* **Ağ Yöneticisi:** Sistemdeki cihazların ağ bağlantılarını denetler.  Bağlantısı kopan cihazları anında görerek tek tıkla saha ekibi için iş emri oluşturur ve gönderir. 
* **Saha Teknisyeni:** Kendisine atanan iş emirlerini mobil cihazından veya bilgisayarından anlık olarak görür.  Fiziksel onarımı tamamladıktan sonra durumu sisteme kaydederek iş akışını sonlandırır. 

## 5. Kullanılacak Yazılım ve Donanım Teknolojileri
Sistemin kusursuz işlemesi için modern teknolojilerden faydalanılmaktadır:
* **Yazılım Teknolojileri:** Kullanıcı arayüzleri için modern web teknolojileri (React/Vue), yapay zeka tahmin algoritmaları ve arka uç işlemleri için Python, verilerin güvenli bir şekilde saklanması için güçlü veri tabanları kullanılmaktadır.
* **Donanım Teknolojileri:** Su seviyesi ve türbin durumunu anlık okuyacak IoT tabanlı akıllı sensörler, verileri merkeze iletecek telemetri cihazları ve teknisyenlerin sahada kullanacağı akıllı mobil terminaller kullanılmaktadır.

## 6. Geliştirme Süreci (Çevik Metodoloji)
Projemiz "Çevik (Agile)" yazılım geliştirme metodolojisi ile yürütülmektedir. Bu kapsamda projenin her bir modülü (Operatör Paneli, Mühendis Paneli vb.) kısa döngüler halinde adım adım geliştirilecek, test edilecek ve devreye alınacaktır. Süreç, "1. Veri gelir, 2. Ekranda görünür, 3. Sorun tespit edilir, 4. İş emri gider, 5. Sorun çözülür" iş akışıyla kesintisiz bir döngüde çalışacaktır. 

## 7. Açık Çağrı: Bize Katılın!
Enerji sektöründe dijital bir devrim yaratmak için yola çıktık. 
* **Yazılım Geliştiricileri:** Açık kaynaklı projemize kod desteği vermek ve sistemimizi birlikte daha ileriye taşımak için GitHub üzerinden aramıza katılabilirsiniz.
* **Yatırımcılar ve Bağışçılar:** Daha az arıza ve doğru üretim planlaması ile maliyetleri düşüren bu platformun büyümesi için finansal desteklerinizi bekliyoruz. Gelin, geleceğin akıllı enerji altyapısını birlikte inşa edelim!
```
>>>>>>> 9ba2d2cf07df674ad1da5a59346a3ac0bf7c52e5
