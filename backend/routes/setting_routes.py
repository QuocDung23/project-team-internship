from fastapi import APIRouter, HTTPException
from models.schemas import SettingUpdate
from services.setting_service import get_global_settings, update_global_settings

router=APIRouter(
    tags=["Settings"]
)


@router.get("/settings")
def get_settings():
    settings=get_global_settings()
    if settings is None:
        raise HTTPException(status_code=404, detail="global settings not found")
    return settings


@router.put("/settings")
def update_settings(setting:SettingUpdate):
    try:
        return update_global_settings(setting.dict(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
