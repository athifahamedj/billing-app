from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_shop_context
from app.db.database import get_db
from app.models import Shop, ShopSetting
from app.schemas import ShopSettingsResponse, ShopSettingsWrite

router = APIRouter(prefix="/api", tags=["shop settings"])
SETTINGS_KEY = "application"
DEFAULT_PREFERENCES: dict[str, Any] = {
    "billing": {
        "defaultGstRate": "18",
        "taxMode": "CGST_SGST",
        "pricesIncludeGst": False,
        "defaultDiscount": "0",
    },
    "invoice": {
        "showGstBreakup": True,
        "showDiscount": True,
        "showSavings": True,
        "showCustomerPhone": True,
    },
    "inventory": {
        "lowStockAlerts": True,
        "defaultReorderLevel": 5,
        "outOfStockAlerts": True,
    },
    "invoicePrefix": "INV",
}


def _settings_response(
    shop: Shop,
    stored: dict[str, Any] | None,
) -> ShopSettingsResponse:
    preferences = {**DEFAULT_PREFERENCES, **(stored or {})}
    for section in ("billing", "invoice", "inventory"):
        preferences[section] = {
            **DEFAULT_PREFERENCES[section],
            **preferences.get(section, {}),
        }
    return ShopSettingsResponse.model_validate(
        {
            "business": {
                "name": shop.name,
                "phone": shop.phone or "",
                "address": shop.address or "",
                "gstin": shop.gstin or "",
                "invoicePrefix": preferences["invoicePrefix"],
            },
            "billing": preferences["billing"],
            "invoice": preferences["invoice"],
            "inventory": preferences["inventory"],
        }
    )


@router.get("/settings", response_model=ShopSettingsResponse)
def get_settings(
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> ShopSettingsResponse:
    record = session.scalar(
        select(ShopSetting).where(
            ShopSetting.shop_id == shop.shop_id,
            ShopSetting.setting_key == SETTINGS_KEY,
        )
    )
    return _settings_response(shop, record.value if record is not None else None)


@router.put("/settings", response_model=ShopSettingsResponse)
def update_settings(
    settings_data: ShopSettingsWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> ShopSettingsResponse:
    shop.name = settings_data.business.name
    shop.phone = settings_data.business.phone or None
    shop.address = settings_data.business.address or None
    shop.gstin = settings_data.business.gstin or None

    preferences = settings_data.model_dump(mode="json", exclude={"business"})
    preferences["invoicePrefix"] = settings_data.business.invoicePrefix
    record = session.scalar(
        select(ShopSetting).where(
            ShopSetting.shop_id == shop.shop_id,
            ShopSetting.setting_key == SETTINGS_KEY,
        )
    )
    if record is None:
        record = ShopSetting(
            shop_id=shop.shop_id,
            setting_key=SETTINGS_KEY,
            value=preferences,
        )
        session.add(record)
    else:
        record.value = preferences

    session.commit()
    session.refresh(shop)
    return _settings_response(shop, preferences)
