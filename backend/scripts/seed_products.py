import json
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from app.db.database import SessionLocal
from app.models import Product, Shop

SEED_PRODUCT_COUNT = 15
SHOP_SLUG = "manar-motors"
PRODUCT_SOURCE = (
    Path(__file__).resolve().parents[2]
    / "backend"
    / "scripts"
    / "data"
    / "products.json"
)


def main() -> None:
    with PRODUCT_SOURCE.open(encoding="utf-8") as source_file:
        source_products = json.load(source_file)
    if not isinstance(source_products, list) or len(source_products) < SEED_PRODUCT_COUNT:
        raise SystemExit("The product source must contain at least 15 products.")

    products_to_seed = source_products[:SEED_PRODUCT_COUNT]
    with SessionLocal.begin() as session:
        shop = session.scalar(select(Shop).where(Shop.slug == SHOP_SLUG))
        if shop is None or not shop.is_active:
            raise SystemExit(f"Active shop {SHOP_SLUG!r} was not found.")

        existing_part_numbers = set(
            session.scalars(
                select(Product.part_number).where(Product.shop_id == shop.shop_id)
            )
        )
        created_count = 0
        skipped_count = 0

        for source_product in products_to_seed:
            part_number = str(source_product["part_number"]).strip()
            if part_number in existing_part_numbers:
                skipped_count += 1
                continue

            product = Product(
                shop_id=shop.shop_id,
                name=str(source_product["name"]).strip(),
                part_number=part_number,
                unit=str(source_product["unit"]).strip(),
                mrp=Decimal(str(source_product["mrp"])),
                purchase_price=Decimal(str(source_product["purchase_price"])),
                selling_price=Decimal(str(source_product["selling_price"])),
                category=source_product.get("category") or None,
                company=source_product.get("company") or None,
                gst_rate=(
                    Decimal(str(source_product["gst_rate"]))
                    if source_product.get("gst_rate") is not None
                    else None
                ),
                short_name=source_product.get("short_name") or None,
                is_active=True,
            )
            session.add(product)
            existing_part_numbers.add(part_number)
            created_count += 1

        print(
            f"Seeded {created_count} products for {shop.name}; "
            f"skipped {skipped_count} existing products."
        )


if __name__ == "__main__":
    main()
