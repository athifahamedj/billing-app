import json
from pathlib import Path

from sqlalchemy import select

from app.db.database import SessionLocal
from app.models import Shop

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SETTINGS_FILE = PROJECT_ROOT / "frontend" / "src" / "data" / "mock" / "settings_mock.json"


def main() -> None:
    with SETTINGS_FILE.open(encoding="utf-8") as settings_file:
        shop_settings = json.load(settings_file)["business"]

    with SessionLocal.begin() as session:
        shop = session.scalar(select(Shop).where(Shop.slug == "manar-motors"))

        if shop is None:
            shop = Shop(
                name=shop_settings["name"],
                slug="manar-motors",
                phone=shop_settings["phone"] or None,
                address=shop_settings["address"] or None,
                gstin=shop_settings["gstin"] or None,
            )
            session.add(shop)
            session.flush()
            print(f"Created shop {shop.name} ({shop.shop_id})")
        else:
            print(f"Shop already exists: {shop.name} ({shop.shop_id})")


if __name__ == "__main__":
    main()
