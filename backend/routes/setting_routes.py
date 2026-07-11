from fastapi import APIRouter, Depends, HTTPException
from backend.auth.dependencies import require_roles
from backend.auth.roles import UserRole
from backend.models.schemas import SettingUpdate
from backend.services.setting_service import get_global_settings, update_global_settings

router=APIRouter(
    tags=["Settings"]
)


@router.get("/settings")
def get_settings(_current_user: dict = Depends(require_roles(UserRole.ADMIN))):
    settings=get_global_settings()
    if settings is None:
        raise HTTPException(status_code=404, detail="global settings not found")
    return settings


@router.put("/settings")
def update_settings(
    setting:SettingUpdate,
    _current_user: dict = Depends(require_roles(UserRole.ADMIN)),
):
    try:
        return update_global_settings(setting.dict(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
