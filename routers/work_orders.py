from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from middleware.rbac import require_permission
from schemas.auth import CurrentUser
from schemas.work_orders import WorkOrderCreate, WorkOrderResponse
from models.work_order import WorkOrder, WorkOrderStatus
from database import get_db # Veritabanı session'ı çağıran fonksiyonunuz

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])

# 1. YENİ İŞ EMRİ OLUŞTURMA VE KAYDETME
@router.post("/", response_model=WorkOrderResponse)
async def create_work_order(
    work_order: WorkOrderCreate,
    current_user: CurrentUser = Depends(require_permission("work_order_create")),
    db: Session = Depends(get_db)
):
    # Veritabanı modelini doldur (Durum otomatik olarak OPEN başlar)
    db_work_order = WorkOrder(
        title=work_order.title,
        description=work_order.description,
        created_by=current_user.username
    )
    db.add(db_work_order)
    db.commit()
    db.refresh(db_work_order)
    return db_work_order

# 2. İŞ EMİRLERİNİ LİSTELEME
@router.get("/")
async def list_work_orders(
    current_user: CurrentUser = Depends(require_permission("work_order_view")),
    db: Session = Depends(get_db)
):
    orders = db.query(WorkOrder).all()
    return {"work_orders": orders, "requested_by": current_user.username}

# 3. İŞ EMRİNİ KAPATMA (DURUM GEÇİŞİ MANTIĞI)
@router.post("/{work_order_id}/close")
async def close_work_order(
    work_order_id: int,
    current_user: CurrentUser = Depends(require_permission("work_order_close")),
    db: Session = Depends(get_db)
):
    # İş emrini veritabanında bul
    db_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    
    if not db_order:
        raise HTTPException(status_code=404, detail="İş emri bulunamadı")
        
    # Durum kontrolü (Sadece bitmiş veya devam eden işler kapatılabilir)
    if db_order.status == WorkOrderStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Bu iş emri zaten kapalı.")

    # Durumu CLOSED olarak güncelle
    db_order.status = WorkOrderStatus.CLOSED
    db.commit()
    
    # Not: Bildirim servisi (Loglama/Mail atma) kodları ileride buraya eklenecek.
    
    return {
        "message": f"İş emri {work_order_id} kapatıldı", 
        "closed_by": current_user.username,
        "new_status": db_order.status
    }