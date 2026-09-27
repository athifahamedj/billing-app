import argparse
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path, PurePosixPath
from typing import Any
from zipfile import BadZipFile, ZipFile
from xml.etree import ElementTree as ET

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models import Product, Shop
from app.schemas import ProductWrite

SHOP_SLUG = "manar-motors"
EXPECTED_PRODUCT_COUNT = 773
PURCHASE_RATE_OVERRIDES = {
    "1245": ("162.80000000000001", Decimal("162.80")),
    "1311": ("146.19999999999999", Decimal("146.20")),
    "1342": ("287.10000000000002", Decimal("287.10")),
    "1355": ("270.89999999999998", Decimal("270.90")),
    "1582": ("8.1300000000000008", Decimal("8.13")),
    "1584": ("8.4700000000000006", Decimal("8.47")),
}
EXPECTED_HEADERS = {
    "Product Name",
    "Batch No",
    "Unit",
    "MRP",
    "Purchase Rate",
    "Cost",
    "Sales Rate1",
    "Category",
    "Company",
    "GST Per",
    "Short Name",
}
XML_NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "office_rel": (
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    ),
    "package_rel": (
        "http://schemas.openxmlformats.org/package/2006/relationships"
    ),
}


class CatalogImportError(ValueError):
    pass


@dataclass(frozen=True)
class CellValue:
    value: str
    cell_type: str
    formula: str | None


@dataclass(frozen=True)
class CatalogEntry:
    excel_row: int
    product: ProductWrite


def _column_index(reference: str) -> int:
    match = re.fullmatch(r"([A-Z]+)[0-9]+", reference.upper())
    if match is None:
        raise CatalogImportError(f"Invalid spreadsheet cell reference: {reference}")
    index = 0
    for character in match.group(1):
        index = index * 26 + ord(character) - ord("A") + 1
    return index - 1


def _worksheet_path(target: str) -> str:
    if target.startswith("/"):
        path = PurePosixPath(target.lstrip("/"))
    else:
        path = PurePosixPath("xl") / target
    if ".." in path.parts:
        raise CatalogImportError("The workbook contains an invalid worksheet path.")
    return str(path)


def _cell_value(
    cell: ET.Element,
    shared_strings: list[str],
) -> CellValue:
    cell_type = cell.attrib.get("t", "n")
    formula_element = cell.find("main:f", XML_NS)
    formula = formula_element.text if formula_element is not None else None

    if cell_type == "inlineStr":
        value = "".join(
            text.text or ""
            for text in cell.findall(".//main:t", XML_NS)
        )
    else:
        value_element = cell.find("main:v", XML_NS)
        value = value_element.text if value_element is not None else ""
        if cell_type == "s" and value:
            try:
                value = shared_strings[int(value)]
            except (IndexError, ValueError) as error:
                raise CatalogImportError(
                    f"Invalid shared-string reference in cell {cell.attrib['r']}."
                ) from error

    return CellValue(value=value, cell_type=cell_type, formula=formula)


def _decimal_value(value: str, field_name: str, row_number: int) -> Decimal:
    try:
        amount = Decimal(value.strip().replace(",", ""))
    except InvalidOperation as error:
        raise CatalogImportError(
            f"Excel row {row_number} has an invalid {field_name} value."
        ) from error
    if not amount.is_finite() or amount < 0:
        raise CatalogImportError(
            f"Excel row {row_number} has an invalid {field_name} value."
        )
    return amount


def _gst_rate(value: str, row_number: int) -> Decimal | None:
    cleaned = value.strip()
    if not cleaned:
        return None

    match = re.fullmatch(r"(\d+(?:\.\d+)?)%\s*GST", cleaned, re.IGNORECASE)
    if match is None:
        raise CatalogImportError(
            f"Excel row {row_number} has an unrecognized GST rate."
        )
    return _decimal_value(match.group(1), "GST rate", row_number)


def _parse_catalog(source_path: Path) -> tuple[str, list[CatalogEntry]]:
    if not source_path.is_file():
        raise CatalogImportError(f"Catalog file not found: {source_path}")

    try:
        archive = ZipFile(source_path)
    except (BadZipFile, OSError) as error:
        raise CatalogImportError(f"Could not read catalog file: {source_path}") from error

    with archive:
        try:
            workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
            relationships_root = ET.fromstring(
                archive.read("xl/_rels/workbook.xml.rels")
            )
        except (KeyError, ET.ParseError) as error:
            raise CatalogImportError(
                "The file is not a readable Excel workbook."
            ) from error

        sheets = workbook_root.findall("main:sheets/main:sheet", XML_NS)
        if len(sheets) != 1:
            raise CatalogImportError(
                "The catalog must contain exactly one worksheet."
            )

        relationships = {
            relationship.attrib["Id"]: relationship.attrib["Target"]
            for relationship in relationships_root.findall(
                "package_rel:Relationship",
                XML_NS,
            )
        }
        relationship_id = sheets[0].attrib.get(
            f"{{{XML_NS['office_rel']}}}id"
        )
        if relationship_id not in relationships:
            raise CatalogImportError("The catalog worksheet could not be located.")

        worksheet_path = _worksheet_path(relationships[relationship_id])
        try:
            worksheet_root = ET.fromstring(archive.read(worksheet_path))
        except (KeyError, ET.ParseError) as error:
            raise CatalogImportError(
                "The catalog worksheet is not readable."
            ) from error

        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            try:
                shared_strings_root = ET.fromstring(
                    archive.read("xl/sharedStrings.xml")
                )
            except ET.ParseError as error:
                raise CatalogImportError(
                    "The catalog shared strings are not readable."
                ) from error
            shared_strings = [
                "".join(
                    text.text or ""
                    for text in item.findall(".//main:t", XML_NS)
                )
                for item in shared_strings_root.findall("main:si", XML_NS)
            ]

    sheet_data = worksheet_root.find("main:sheetData", XML_NS)
    if sheet_data is None:
        raise CatalogImportError("The catalog worksheet contains no tabular data.")

    rows: list[tuple[int, dict[int, CellValue]]] = []
    for row_element in sheet_data.findall("main:row", XML_NS):
        row_number = int(row_element.attrib.get("r", "0"))
        cells: dict[int, CellValue] = {}
        for cell in row_element.findall("main:c", XML_NS):
            reference = cell.attrib.get("r", "")
            if not reference:
                raise CatalogImportError(
                    f"Excel row {row_number} has a cell without a reference."
                )
            cells[_column_index(reference)] = _cell_value(
                cell,
                shared_strings,
            )
        if any(value.value.strip() or value.formula for value in cells.values()):
            rows.append((row_number, cells))

    if not rows or rows[0][0] != 1:
        raise CatalogImportError("The catalog header must be on Excel row 1.")

    headers = {
        column: cell.value.strip()
        for column, cell in rows[0][1].items()
        if cell.value.strip()
    }
    if len(set(headers.values())) != len(headers):
        raise CatalogImportError("The catalog contains duplicate column headers.")
    if set(headers.values()) != EXPECTED_HEADERS:
        missing = sorted(EXPECTED_HEADERS - set(headers.values()))
        unexpected = sorted(set(headers.values()) - EXPECTED_HEADERS)
        raise CatalogImportError(
            f"Catalog headers do not match the reviewed workbook. "
            f"Missing: {missing}; unexpected: {unexpected}."
        )
    header_columns = {name: column for column, name in headers.items()}

    data_rows = [(number, cells) for number, cells in rows[1:] if number > 1]
    if len(data_rows) != EXPECTED_PRODUCT_COUNT:
        raise CatalogImportError(
            f"Expected {EXPECTED_PRODUCT_COUNT} catalog rows; "
            f"found {len(data_rows)}."
        )

    entries: list[CatalogEntry] = []
    seen_part_numbers: set[str] = set()
    for row_number, cells in data_rows:
        def get_cell(field_name: str) -> CellValue:
            return cells.get(
                header_columns[field_name],
                CellValue(value="", cell_type="n", formula=None),
            )

        def required_text(field_name: str) -> str:
            cell = get_cell(field_name)
            value = cell.value.strip()
            if not value or cell.cell_type not in {"s", "inlineStr", "str"}:
                raise CatalogImportError(
                    f"Excel row {row_number} requires text in {field_name}."
                )
            if cell.formula is not None:
                raise CatalogImportError(
                    f"Excel row {row_number} has an unexpected formula "
                    f"in {field_name}."
                )
            return value

        part_number = required_text("Batch No")
        folded_part_number = part_number.casefold()
        if folded_part_number in seen_part_numbers:
            raise CatalogImportError(
                f"Duplicate part number {part_number!r} at Excel row {row_number}."
            )
        seen_part_numbers.add(folded_part_number)

        name = required_text("Product Name")
        unit = required_text("Unit")
        mrp = _decimal_value(get_cell("MRP").value, "MRP", row_number)
        selling_price = _decimal_value(
            get_cell("Sales Rate1").value,
            "Sales Rate1",
            row_number,
        )

        purchase_rate = get_cell("Purchase Rate").value.strip()
        approved_override = PURCHASE_RATE_OVERRIDES.get(part_number)
        if approved_override is not None:
            expected_raw, normalized_value = approved_override
            if purchase_rate != expected_raw:
                raise CatalogImportError(
                    f"Excel row {row_number} no longer matches the reviewed "
                    f"Purchase Rate override for part {part_number}."
                )
            purchase_price = normalized_value
        else:
            purchase_price = _decimal_value(
                purchase_rate,
                "Purchase Rate",
                row_number,
            )
            if purchase_price.as_tuple().exponent < -2:
                raise CatalogImportError(
                    f"Excel row {row_number} has more than two decimal places "
                    "in Purchase Rate."
                )

        gst_rate = _gst_rate(get_cell("GST Per").value, row_number)
        short_name_cell = get_cell("Short Name")
        if short_name_cell.formula is not None:
            if not (
                row_number == 305
                and part_number == "1304"
                and short_name_cell.formula == "SUM(E305:K305)"
                and short_name_cell.value == "1365"
            ):
                raise CatalogImportError(
                    f"Excel row {row_number} has an unreviewed Short Name formula."
                )
            short_name = None
        else:
            short_name = short_name_cell.value.strip() or None

        for field_name in ("Category", "Company"):
            cell = get_cell(field_name)
            if cell.formula is not None:
                raise CatalogImportError(
                    f"Excel row {row_number} has an unexpected formula "
                    f"in {field_name}."
                )

        values: dict[str, Any] = {
            "name": name,
            "part_number": part_number,
            "unit": unit,
            "mrp": mrp,
            "purchase_price": purchase_price,
            "selling_price": selling_price,
            "category": get_cell("Category").value.strip() or None,
            "company": get_cell("Company").value.strip() or None,
            "gst_rate": gst_rate,
            "short_name": short_name,
        }
        try:
            product = ProductWrite.model_validate(values)
        except ValidationError as error:
            raise CatalogImportError(
                f"Excel row {row_number} does not fit the approved product schema."
            ) from error
        entries.append(CatalogEntry(excel_row=row_number, product=product))

    return sheets[0].attrib["name"], entries


def _plan_changes(
    session: Session,
    shop: Shop,
    entries: list[CatalogEntry],
) -> tuple[list[CatalogEntry], list[tuple[Product, CatalogEntry]], int, int]:
    existing_products = list(
        session.scalars(
            select(Product).where(Product.shop_id == shop.shop_id)
        )
    )
    existing_by_part_number = {
        product.part_number: product for product in existing_products
    }
    existing_by_folded_part_number = {
        product.part_number.casefold(): product for product in existing_products
    }
    creates: list[CatalogEntry] = []
    updates: list[tuple[Product, CatalogEntry]] = []
    unchanged_count = 0

    for entry in entries:
        data = entry.product.model_dump()
        current = existing_by_part_number.get(entry.product.part_number)
        if current is None:
            case_insensitive_match = existing_by_folded_part_number.get(
                entry.product.part_number.casefold()
            )
            if case_insensitive_match is not None:
                raise CatalogImportError(
                    "A case-insensitive part-number conflict exists for "
                    f"{entry.product.part_number!r} in {shop.name}."
                )
            creates.append(entry)
            continue

        changed_fields = [
            field_name
            for field_name, value in data.items()
            if getattr(current, field_name) != value
        ]
        if changed_fields:
            updates.append((current, entry))
        else:
            unchanged_count += 1

    matched_existing_count = len(entries) - len(creates)
    unrelated_existing_count = len(existing_products) - matched_existing_count
    return creates, updates, unchanged_count, unrelated_existing_count


def _run(source_path: Path, apply_changes: bool) -> None:
    sheet_name, entries = _parse_catalog(source_path)

    with SessionLocal() as session:
        shop = session.scalar(select(Shop).where(Shop.slug == SHOP_SLUG))
        if shop is None or not shop.is_active:
            raise CatalogImportError(
                f"Active target shop {SHOP_SLUG!r} was not found."
            )

        creates, updates, unchanged, unrelated = _plan_changes(
            session,
            shop,
            entries,
        )
        if apply_changes:
            for entry in creates:
                session.add(
                    Product(
                        shop_id=shop.shop_id,
                        is_active=True,
                        **entry.product.model_dump(),
                    )
                )
            for product, entry in updates:
                for field_name, value in entry.product.model_dump().items():
                    setattr(product, field_name, value)
            session.commit()

    mode = "APPLIED" if apply_changes else "DRY RUN - no database changes"
    print(f"{mode}: {source_path.name}, worksheet {sheet_name!r}")
    print(f"Target shop: {SHOP_SLUG}")
    print(f"Validated source products: {len(entries)}")
    print(f"New products: {len(creates)}")
    print(f"Existing products updated from source: {len(updates)}")
    print(f"Existing products already matching: {unchanged}")
    print(f"Other existing shop products left untouched: {unrelated}")
    print("Inventory movements created: 0")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Validate and import the reviewed Excel product catalog "
            "into Manar Motors only."
        )
    )
    parser.add_argument("source", type=Path, help="Path to the reviewed .xlsx file")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Commit the import; without this flag the command is a dry run.",
    )
    arguments = parser.parse_args()
    try:
        _run(arguments.source, arguments.apply)
    except CatalogImportError as error:
        raise SystemExit(str(error)) from error


if __name__ == "__main__":
    main()
