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
