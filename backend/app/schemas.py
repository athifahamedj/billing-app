from datetime import date, datetime
from decimal import Decimal
import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=1024)


class UserResponse(BaseModel):
    user_id: UUID
    username: str
    display_name: str
    role: Literal["shop_user", "super_admin"]
    shop_id: UUID | None
    shop_name: str | None


class ShopResponse(BaseModel):
    shop_id: UUID
    name: str
    slug: str


class ProductWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    part_number: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=30)
    mrp: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    purchase_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    selling_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    category: str | None = Field(default=None, max_length=100)
    company: str | None = Field(default=None, max_length=150)
    gst_rate: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
        max_digits=5,
        decimal_places=2,
    )
    short_name: str | None = Field(default=None, max_length=255)

    @field_validator("category", "company", "short_name", mode="before")
    @classmethod
    def blank_optional_text_is_null(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: UUID
    shop_id: UUID
    name: str
    part_number: str
    unit: str
    mrp: Decimal
    purchase_price: Decimal
    selling_price: Decimal
    category: str | None
    company: str | None
    gst_rate: Decimal | None
    short_name: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CustomerWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    customer_type: str | None = Field(default=None, max_length=50)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = None
    gstin: str | None = Field(default=None, min_length=15, max_length=15)

    @field_validator("customer_type", "phone", "email", "address", "gstin", mode="before")
    @classmethod
    def blank_optional_text_is_null(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is not None and (
            re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value) is None
        ):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("gstin")
    @classmethod
    def normalize_gstin(cls, value: str | None) -> str | None:
        return value.upper() if value is not None else None


class CustomerResponse(CustomerWrite):
    model_config = ConfigDict(from_attributes=True)

    customer_id: UUID
    shop_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SupplierWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=200)
    supplier_type: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=254)
    address: str | None = None
    gstin: str | None = Field(default=None, min_length=15, max_length=15)
    payment_terms: str | None = Field(default=None, max_length=50)

    @field_validator(
        "supplier_type",
        "phone",
        "email",
        "address",
        "gstin",
        "payment_terms",
        mode="before",
    )
    @classmethod
    def blank_optional_text_is_null(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is not None and (
            re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value) is None
        ):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("gstin")
    @classmethod
    def normalize_gstin(cls, value: str | None) -> str | None:
        return value.upper() if value is not None else None


class SupplierResponse(SupplierWrite):
    model_config = ConfigDict(from_attributes=True)

    supplier_id: UUID
    shop_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PurchaseItemWrite(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0, le=1_000_000)
    unit_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    discount_amount: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    gst_rate: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        le=100,
        max_digits=5,
        decimal_places=2,
    )


class PurchaseWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    supplier_id: UUID
    invoice_number: str = Field(min_length=1, max_length=50)
    purchase_date: date
    items: list[PurchaseItemWrite] = Field(min_length=1, max_length=500)

    @field_validator("items")
    @classmethod
    def unique_products(
        cls,
        items: list[PurchaseItemWrite],
    ) -> list[PurchaseItemWrite]:
        product_ids = [item.product_id for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("A product can appear only once in a purchase.")
        return items


class PurchaseItemResponse(BaseModel):
    purchase_item_id: UUID
    product_id: UUID
    product_name: str
    part_number: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    gst_rate: Decimal
    gst_amount: Decimal


class PurchaseResponse(BaseModel):
    purchase_id: UUID
    shop_id: UUID
    supplier_id: UUID
    supplier_name: str
    invoice_number: str
    purchase_date: date
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    gst_amount: Decimal
    total_amount: Decimal
    status: Literal["draft", "received", "void"]
    items: list[PurchaseItemResponse]
    created_at: datetime
    updated_at: datetime


class InventoryBalanceResponse(BaseModel):
    product_id: UUID
    name: str
    part_number: str
    unit: str
    quantity_on_hand: int


class SaleItemWrite(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0, le=1_000_000)


class PaymentWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payment_date: date = Field(default_factory=date.today)
    payment_method: Literal[
        "cash",
        "upi",
        "card",
        "bank_transfer",
        "cheque",
        "other",
    ]
    reference: str | None = Field(default=None, max_length=100)
    note: str | None = Field(default=None, max_length=1000)

    @field_validator("reference", "note", mode="before")
    @classmethod
    def blank_optional_text_is_null(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class PaymentBatchWrite(BaseModel):
    payments: list[PaymentWrite] = Field(min_length=1, max_length=50)


class SaleWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    customer_id: UUID | None = None
    invoice_number: str | None = Field(default=None, min_length=1, max_length=50)
    sale_date: date = Field(default_factory=date.today)
    items: list[SaleItemWrite] = Field(min_length=1, max_length=500)
    payments: list[PaymentWrite] = Field(default_factory=list, max_length=50)

    @field_validator("items")
    @classmethod
    def unique_products(cls, items: list[SaleItemWrite]) -> list[SaleItemWrite]:
        product_ids = [item.product_id for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("A product can appear only once in a sale.")
        return items


class PaymentVoidWrite(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    reason: str = Field(min_length=1, max_length=500)


class SaleItemResponse(BaseModel):
    sale_item_id: UUID
    product_id: UUID
    product_name: str
    part_number: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    gst_rate: Decimal
    gst_amount: Decimal


class PaymentResponse(BaseModel):
    payment_id: UUID
    amount: Decimal
    payment_date: date
    payment_method: str
    reference: str | None
    note: str | None
    status: Literal["recorded", "void"]
    void_reason: str | None


class SaleResponse(BaseModel):
    sale_id: UUID
    shop_id: UUID
    customer_id: UUID | None
    customer_name: str | None
    invoice_number: str
    sale_date: date
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    gst_amount: Decimal
    total_amount: Decimal
    status: Literal["draft", "completed", "void"]
    paid_amount: Decimal
    outstanding_amount: Decimal
    payment_status: Literal["unpaid", "partially_paid", "paid", "void"]
    items: list[SaleItemResponse]
    payments: list[PaymentResponse]


class ShopContextResponse(BaseModel):
    shop_id: UUID
    shop_name: str
    role: Literal["shop_user", "super_admin"]
