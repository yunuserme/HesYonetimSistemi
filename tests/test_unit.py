"""
DB gerektirmeyen unit testler:
- Token üretimi ve doğrulama
- Şifre hashleme
- RBAC yetki kontrolü
- Expired token kontrolü
"""
import pytest
from datetime import timedelta
from core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from middleware.rbac import has_permission
from models.user import UserRole


class TestPasswordSecurity:

    def test_hash_password_returns_string(self):
        hashed = hash_password("Test123!")
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_hash_is_not_plain_text(self):
        plain = "Test123!"
        hashed = hash_password(plain)
        assert hashed != plain

    def test_verify_correct_password(self):
        plain = "Test123!"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("Test123!")
        assert verify_password("YanlisSifre!", hashed) is False

    def test_same_password_different_hashes(self):
        plain = "Test123!"
        hash1 = hash_password(plain)
        hash2 = hash_password(plain)
        assert hash1 != hash2
        assert verify_password(plain, hash1) is True
        assert verify_password(plain, hash2) is True


class TestPasswordValidation:

    def test_valid_password(self):
        valid, msg = validate_password_strength("Test123!")
        assert valid is True

    def test_too_short(self):
        valid, msg = validate_password_strength("Ab1!")
        assert valid is False
        assert "8 karakter" in msg

    def test_no_uppercase(self):
        valid, msg = validate_password_strength("test1234")
        assert valid is False
        assert "büyük harf" in msg

    def test_no_digit(self):
        valid, msg = validate_password_strength("TestTest!")
        assert valid is False
        assert "rakam" in msg


class TestJWTTokens:

    def test_create_access_token(self):
        token = create_access_token({"sub": "1", "role": "operator"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_access_token(self):
        token = create_access_token({"sub": "1", "role": "operator"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["role"] == "operator"
        assert payload["type"] == "access"

    def test_create_refresh_token(self):
        token = create_refresh_token({"sub": "1", "role": "operator"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["type"] == "refresh"

    def test_expired_token_returns_none(self):
        token = create_access_token(
            {"sub": "1", "role": "operator"},
            expires_delta=timedelta(seconds=-1)
        )
        payload = decode_token(token)
        assert payload is None

    def test_invalid_token_returns_none(self):
        payload = decode_token("bu.gecersiz.birtoken")
        assert payload is None

    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "1", "role": "operator"})
        tampered = token + "hacked"
        payload = decode_token(tampered)
        assert payload is None

    def test_access_token_has_correct_type(self):
        token = create_access_token({"sub": "1", "role": "operator"})
        payload = decode_token(token)
        assert payload["type"] == "access"

    def test_refresh_token_has_correct_type(self):
        token = create_refresh_token({"sub": "1", "role": "operator"})
        payload = decode_token(token)
        assert payload["type"] == "refresh"


class TestRBAC:

    def test_operator_can_stop_turbine(self):
        assert has_permission(UserRole.OPERATOR, "turbine_stop") is True

    def test_operator_can_open_gate(self):
        assert has_permission(UserRole.OPERATOR, "gate_open") is True

    def test_operator_cannot_view_prediction(self):
        assert has_permission(UserRole.OPERATOR, "prediction_view") is False

    def test_operator_cannot_export_report(self):
        assert has_permission(UserRole.OPERATOR, "report_export") is False

    def test_engineer_can_view_prediction(self):
        assert has_permission(UserRole.ENGINEER, "prediction_view") is True

    def test_engineer_can_export_report(self):
        assert has_permission(UserRole.ENGINEER, "report_export") is True

    def test_engineer_cannot_stop_turbine(self):
        assert has_permission(UserRole.ENGINEER, "turbine_stop") is False

    def test_engineer_cannot_open_gate(self):
        assert has_permission(UserRole.ENGINEER, "gate_open") is False

    def test_admin_can_do_everything(self):
        all_permissions = [
            "turbine_stop", "gate_open", "prediction_view",
            "work_order_view", "work_order_close", "report_export",
            "alarm_resolve", "user_manage", "scada_control"
        ]
        for perm in all_permissions:
            assert has_permission(UserRole.ADMIN, perm) is True

    def test_technician_can_view_work_order(self):
        assert has_permission(UserRole.TECHNICIAN, "work_order_view") is True

    def test_technician_can_close_work_order(self):
        assert has_permission(UserRole.TECHNICIAN, "work_order_close") is True

    def test_technician_cannot_stop_turbine(self):
        assert has_permission(UserRole.TECHNICIAN, "turbine_stop") is False

    def test_technician_cannot_export_report(self):
        assert has_permission(UserRole.TECHNICIAN, "report_export") is False

    def test_manager_can_view_prediction(self):
        assert has_permission(UserRole.MANAGER, "prediction_view") is True

    def test_manager_can_export_report(self):
        assert has_permission(UserRole.MANAGER, "report_export") is True

    def test_manager_cannot_stop_turbine(self):
        assert has_permission(UserRole.MANAGER, "turbine_stop") is False

    def test_manager_cannot_open_gate(self):
        assert has_permission(UserRole.MANAGER, "gate_open") is False

    def test_manager_cannot_view_work_order(self):
        assert has_permission(UserRole.MANAGER, "work_order_view") is False

    def test_unknown_permission_returns_false(self):
        assert has_permission(UserRole.OPERATOR, "bunu_kimse_yapamaz") is False